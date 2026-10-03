import { Router } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { businessMemberships, businesses, events, oneTimeTokens, registrations, users } from "@shared/events-schema";
import { requirePlatformAdmin, requireUser, type AuthedRequest } from "../session";
import { generateOneTimeToken, normalizeEmail, rateLimit } from "../security";
import { slugify, validateSlug } from "../content";
import { enqueueAccountEmail } from "../emails";
import { audit } from "../audit";
import { eventsConfig } from "../config";
import { INVITE_TTL_MS } from "./authRoutes";

/** Platform administration: tenant management. platform_admin only. */
export function platformRouter(): Router {
  const r = Router();
  r.use(requireUser, requirePlatformAdmin);

  r.get("/businesses", async (_req, res, next) => {
    try {
      const rows = await db
        .select({
          business: businesses,
          eventCount: sql<number>`(SELECT count(*)::int FROM ${events} WHERE ${events.businessId} = ${businesses.id})`,
          registrationCount: sql<number>`(SELECT count(*)::int FROM ${registrations} WHERE ${registrations.businessId} = ${businesses.id})`,
        })
        .from(businesses)
        .orderBy(asc(businesses.name));
      res.json({ businesses: rows });
    } catch (err) { next(err); }
  });

  r.post("/businesses", rateLimit("platform-create", 10, 1 / 60), async (req, res, next) => {
    try {
      const name = String(req.body?.name || "").trim().slice(0, 120);
      const ownerEmail = normalizeEmail(String(req.body?.ownerEmail || ""));
      const ownerName = String(req.body?.ownerName || "").trim().slice(0, 120);
      if (!name || !ownerEmail.includes("@") || !ownerName) {
        res.status(400).json({ error: "Business name, owner name and owner email are required" });
        return;
      }
      const slug = slugify(String(req.body?.slug || name));
      const slugError = validateSlug(slug);
      if (slugError) { res.status(400).json({ error: slugError }); return; }

      const [business] = await db.insert(businesses).values({
        name, slug,
        contactEmail: ownerEmail,
        defaultTimezone: String(req.body?.defaultTimezone || eventsConfig.defaultTimezone),
      }).returning();

      let [owner] = await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1);
      if (!owner) {
        [owner] = await db.insert(users).values({ email: ownerEmail, name: ownerName, status: "invited" }).returning();
      }
      await db.insert(businessMemberships).values({
        businessId: business.id, userId: owner.id, role: "business_owner",
        status: owner.passwordHash ? "active" : "invited",
        invitedByUserId: (req as unknown as AuthedRequest).user.id,
      });
      if (!owner.passwordHash) {
        const { token, hash } = generateOneTimeToken();
        await db.insert(oneTimeTokens).values({
          userId: owner.id, purpose: "invite", tokenHash: hash,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        });
        await enqueueAccountEmail({
          template: "organizer_invitation",
          recipient: ownerEmail,
          recipientName: ownerName,
          businessName: name,
          actionUrl: `${eventsConfig.publicUrl}/events/manage/accept-invite?token=${token}`,
        });
      }
      await audit({
        actorUserId: (req as unknown as AuthedRequest).user.id, businessId: business.id,
        action: "platform.business_create", targetType: "business", targetId: business.id,
      });
      res.status(201).json({ business });
    } catch (err: any) {
      if (err?.code === "23505") { res.status(409).json({ error: "That business slug is already in use" }); return; }
      next(err);
    }
  });

  r.post("/businesses/:businessId/status", async (req, res, next) => {
    try {
      const status = String(req.body?.status || "");
      if (!["active", "inactive"].includes(status)) {
        res.status(400).json({ error: "Unknown status" });
        return;
      }
      const [business] = await db.update(businesses)
        .set({ status: status as "active" | "inactive", updatedAt: new Date() })
        .where(eq(businesses.id, req.params.businessId))
        .returning();
      if (!business) { res.status(404).json({ error: "Business not found" }); return; }
      await audit({
        actorUserId: (req as unknown as AuthedRequest).user.id, businessId: business.id,
        action: `platform.business_${status}`, targetType: "business", targetId: business.id,
      });
      res.json({ business });
    } catch (err) { next(err); }
  });

  return r;
}
