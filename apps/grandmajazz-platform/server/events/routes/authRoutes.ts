import { Router } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { businessMemberships, businesses, oneTimeTokens, users } from "@shared/events-schema";
import { eventsConfig } from "../config";
import { generateOneTimeToken, hashPassword, normalizeEmail, rateLimit, sha256, verifyPassword } from "../security";
import { destroySession, loginSession, requireUser, type AuthedRequest } from "../session";
import { enqueueAccountEmail } from "../emails";
import { audit } from "../audit";
import { provisionCurrentAdmin, verifyCurrentAdmin } from "../../currentAdmin";

const RESET_TTL_MS = 2 * 60 * 60 * 1000; // 2h
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

export function authRouter(): Router {
  const r = Router();

  r.post("/current-admin", rateLimit("current-admin", 10, 1 / 10), async (req, res, next) => {
    try {
      const admin = await verifyCurrentAdmin(req);
      if (!admin) { res.status(403).json({ error: "Admin access required" }); return; }
      const staff = await provisionCurrentAdmin(admin);
      const [business] = await db.select({ id: businesses.id }).from(businesses)
        .where(eq(businesses.slug, "grandma-jazz")).limit(1);
      if (!business) throw new Error("Grandma Jazz events business is missing");
      await db.insert(businessMemberships).values({
        businessId: business.id, userId: staff.id, role: "business_owner", status: "active",
      }).onConflictDoUpdate({
        target: [businessMemberships.businessId, businessMemberships.userId],
        set: { role: "business_owner", status: "active", updatedAt: new Date() },
      });
      const [user] = await db.select().from(users).where(eq(users.id, staff.id)).limit(1);
      await loginSession(req, user);
      await audit({ actorUserId: user.id, action: "auth.current_admin", targetType: "user", targetId: user.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/login", rateLimit("login", 10, 1 / 30), async (req, res, next) => {
    try {
      const email = normalizeEmail(String(req.body?.email || ""));
      const password = String(req.body?.password || "");
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const valid = user ? await verifyPassword(password, user.passwordHash) : false;
      if (!user || !valid || user.status !== "active") {
        // identical response whether the account exists or not
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      await loginSession(req, user);
      await audit({ actorUserId: user.id, action: "auth.login", targetType: "user", targetId: user.id });
      res.json(await sessionInfo(user.id));
    } catch (err) { next(err); }
  });

  r.post("/logout", requireUser, async (req, res, next) => {
    try {
      await destroySession(req);
      res.clearCookie("gj_events_sid", { path: "/events" });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.get("/me", requireUser, async (req, res, next) => {
    try {
      res.json(await sessionInfo((req as AuthedRequest).user.id));
    } catch (err) { next(err); }
  });

  r.post("/forgot-password", rateLimit("forgot", 5, 1 / 120), async (req, res, next) => {
    try {
      const email = normalizeEmail(String(req.body?.email || ""));
      // Always the same response — no account enumeration.
      const generic = { ok: true, message: "If that account exists, a reset link has been sent." };
      if (!email) { res.json(generic); return; }
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user && user.status === "active") {
        const { token, hash } = generateOneTimeToken();
        await db.insert(oneTimeTokens).values({
          userId: user.id,
          purpose: "password_reset",
          tokenHash: hash,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        });
        await enqueueAccountEmail({
          template: "password_reset",
          recipient: user.email,
          recipientName: user.name,
          actionUrl: `${eventsConfig.publicUrl}/events/manage/reset-password?token=${token}`,
        });
      }
      res.json(generic);
    } catch (err) { next(err); }
  });

  r.post("/reset-password", rateLimit("reset", 10, 1 / 60), async (req, res, next) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");
      const passwordError = validatePassword(password);
      if (!token || passwordError) {
        res.status(400).json({ error: passwordError || "Reset token is required" });
        return;
      }
      const consumed = await consumeToken(token, "password_reset");
      if (!consumed) {
        res.status(400).json({ error: "This link is invalid or has expired. Request a new one." });
        return;
      }
      await db.update(users).set({
        passwordHash: await hashPassword(password),
        // invalidate every existing session for this user
        sessionEpoch: consumed.user.sessionEpoch + 1,
        status: consumed.user.status === "invited" ? "active" : consumed.user.status,
        updatedAt: new Date(),
      }).where(eq(users.id, consumed.user.id));
      await audit({ actorUserId: consumed.user.id, action: "auth.password_reset", targetType: "user", targetId: consumed.user.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/accept-invite", rateLimit("invite", 10, 1 / 60), async (req, res, next) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();
      const passwordError = validatePassword(password);
      if (!token || passwordError) {
        res.status(400).json({ error: passwordError || "Invitation token is required" });
        return;
      }
      const consumed = await consumeToken(token, "invite");
      if (!consumed) {
        res.status(400).json({ error: "This invitation is invalid or has expired. Ask for a new one." });
        return;
      }
      await db.update(users).set({
        passwordHash: await hashPassword(password),
        name: name || consumed.user.name,
        status: "active",
        emailVerifiedAt: new Date(), // the invite arrived at this address
        sessionEpoch: consumed.user.sessionEpoch + 1,
        updatedAt: new Date(),
      }).where(eq(users.id, consumed.user.id));
      await db.update(businessMemberships)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(businessMemberships.userId, consumed.user.id), eq(businessMemberships.status, "invited")));
      await audit({ actorUserId: consumed.user.id, action: "auth.invite_accepted", targetType: "user", targetId: consumed.user.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/change-password", requireUser, async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).user;
      const current = String(req.body?.currentPassword || "");
      const nextPw = String(req.body?.newPassword || "");
      const passwordError = validatePassword(nextPw);
      if (passwordError) { res.status(400).json({ error: passwordError }); return; }
      if (!(await verifyPassword(current, user.passwordHash))) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      const newEpoch = user.sessionEpoch + 1;
      await db.update(users).set({
        passwordHash: await hashPassword(nextPw),
        sessionEpoch: newEpoch,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
      // keep this session alive, invalidate all others
      req.session.sessionEpoch = newEpoch;
      await audit({ actorUserId: user.id, action: "auth.password_change", targetType: "user", targetId: user.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  return r;
}

function validatePassword(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters";
  if (password.length > 200) return "Password is too long";
  return null;
}

async function consumeToken(rawToken: string, purpose: "invite" | "password_reset") {
  const hash = sha256(rawToken);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(oneTimeTokens)
      .where(and(
        eq(oneTimeTokens.tokenHash, hash),
        eq(oneTimeTokens.purpose, purpose),
        isNull(oneTimeTokens.usedAt),
        gt(oneTimeTokens.expiresAt, new Date()),
      ))
      .limit(1)
      .for("update");
    if (!row) return null;
    await tx.update(oneTimeTokens).set({ usedAt: new Date() }).where(eq(oneTimeTokens.id, row.id));
    const [user] = await tx.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (!user || user.status === "disabled") return null;
    return { tokenRow: row, user };
  });
}

async function sessionInfo(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const memberships = await db
    .select({
      businessId: businessMemberships.businessId,
      role: businessMemberships.role,
      businessName: businesses.name,
    })
    .from(businessMemberships)
    .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
    .where(and(eq(businessMemberships.userId, userId), eq(businessMemberships.status, "active")));
  return {
    user: { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
    membership: memberships[0] ?? null,
  };
}
