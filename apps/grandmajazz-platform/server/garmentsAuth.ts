import express, { type Request, type RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { hashPassword, verifyPassword, generateOneTimeToken, sha256 } from "./events/security";
import { GarmentsRepository, ManagementError } from "./garmentsRepository";
import type { Staff } from "../shared/garments-management";
import { provisionCurrentAdmin, verifyCurrentAdmin } from "./currentAdmin";

declare module "express-session" { interface SessionData { garmentsCsrf?: string; userId?: string; sessionEpoch?: number } }
export const asyncRoute = (fn: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
const credentials = z.object({ email: z.string().email().max(254).transform(v => v.trim().toLowerCase()), password: z.string().min(10).max(200) });
export function garmentsAuth(repo: GarmentsRepository, secret: string, origin: string, bootstrapKey: () => string | undefined) {
  const router = express.Router(), PgStore = connectPgSimple(session);
  const store = new PgStore({ pool: repo.pool, tableName: "gj_garments_sessions", createTableIfMissing: false, pruneSessionInterval: 900 });
  const middleware = session({ store, name: "gj_garments_sid", secret, resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/garments", maxAge: 12 * 3600000 } });
  async function staff(req: Request): Promise<Staff | null> {
    if (!req.session?.userId) return null;
    return (await repo.pool.query("SELECT u.id,u.name,u.email,m.role FROM ev_users u JOIN gj_garments_memberships m ON m.user_id=u.id WHERE u.id=$1 AND u.status='active' AND m.status='active' AND u.session_epoch=$2", [req.session.userId, req.session.sessionEpoch ?? 0])).rows[0] || null;
  }
  const required: RequestHandler = asyncRoute(async (req, res, next) => { const user = await staff(req); if (!user) throw new ManagementError(401, "Sign in to continue. Unsaved changes remain in this window."); res.locals.staff = user; next(); });
  const owner: RequestHandler = (_req, res, next) => { if (res.locals.staff?.role !== "owner") return next(new ManagementError(403, "An owner account is required")); next(); };
  const csrf: RequestHandler = (req, _res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (req.headers.origin !== origin || !req.session?.garmentsCsrf || req.headers["x-garments-csrf"] !== req.session.garmentsCsrf) return next(new ManagementError(403, "Session verification failed. Reload and try again."));
    next();
  };
  const attempts = new Map<string, { count: number; until: number }>();
  const throttle: RequestHandler = (req, _res, next) => {
    const now = Date.now(); attempts.forEach((value, key) => { if (value.until < now) attempts.delete(key); });
    const key = req.ip || "unknown", value = attempts.get(key) || { count: 0, until: now + 900000 };
    attempts.set(key, value); if (++value.count > 20) return next(new ManagementError(429, "Too many attempts. Try again in 15 minutes.")); next();
  };
  async function login(req: Request, user: any) {
    await new Promise<void>((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
    req.session.userId = user.id; req.session.sessionEpoch = user.session_epoch; req.session.garmentsCsrf = randomUUID();
    await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
  }
  async function tokenEmail(c: any, user: any, purpose: "invite" | "reset") {
    const { token, hash } = generateOneTimeToken();
    await c.query("UPDATE gj_garments_tokens SET used_at=now() WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL", [user.id, purpose]);
    await c.query("INSERT INTO gj_garments_tokens(id,user_id,hash,purpose,expires_at) VALUES($1,$2,$3,$4,now()+$5::interval)", [randomUUID(), user.id, hash, purpose, purpose === "invite" ? "48 hours" : "1 hour"]);
    const url = `${origin}/garments/manage?${purpose}=${token}`;
    const subject = purpose === "invite" ? "Your Garments staff invitation" : "Reset your Garments password";
    await c.query("INSERT INTO ev_email_outbox(id,template,recipient,subject,html,text_body) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), purpose === "invite" ? "invite" : "password_reset", user.email, subject, `<h1>Grandma Jazz - Garments</h1><p>${subject}</p><p><a href="${url}">Continue to Garments</a></p><p>This link expires in ${purpose === "invite" ? "48 hours" : "1 hour"}.</p>`, `${subject}\n${url}`]);
  }
  router.get("/session", asyncRoute(async (req, res) => {
    req.session.garmentsCsrf ||= randomUUID();
    const setup = !(await repo.pool.query("SELECT 1 FROM gj_garments_memberships WHERE role='owner' AND status='active' LIMIT 1")).rowCount;
    res.json({ staff: await staff(req), csrf: req.session.garmentsCsrf, setup });
  }));
  router.post("/current-admin", throttle, asyncRoute(async (req, res) => {
    if (req.headers.origin !== origin) throw new ManagementError(403, "Session verification failed");
    const admin = await verifyCurrentAdmin(req);
    if (!admin) throw new ManagementError(403, "Admin access required");
    const user = await provisionCurrentAdmin(admin);
    await repo.pool.query(
      `INSERT INTO gj_garments_memberships(user_id,role,status)
       VALUES($1,'owner','active')
       ON CONFLICT(user_id) DO UPDATE SET role='owner',status='active'`,
      [user.id],
    );
    await login(req, { id: user.id, session_epoch: user.sessionEpoch });
    await repo.audit(repo.pool, user.id, null, "staff.current_admin");
    res.json({ ok: true });
  }));
  router.use(csrf);
  router.post("/login", throttle, asyncRoute(async (req, res) => {
    const data = credentials.parse(req.body);
    const user = (await repo.pool.query("SELECT u.* FROM ev_users u JOIN gj_garments_memberships m ON m.user_id=u.id WHERE u.email=$1 AND u.status='active' AND m.status='active'", [data.email])).rows[0];
    if (!user || !await verifyPassword(data.password, user.password_hash)) throw new ManagementError(401, "Email or password was not accepted");
    await login(req, user); await repo.audit(repo.pool, user.id, null, "staff.login"); res.json({ ok: true });
  }));
  router.post("/setup", throttle, asyncRoute(async (req, res) => {
    const data = credentials.extend({ name: z.string().trim().min(1).max(160), key: z.string().max(300) }).parse(req.body);
    const expected = Buffer.from(bootstrapKey() || ""), supplied = Buffer.from(data.key);
    if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new ManagementError(403, "Setup key was not accepted");
    const user = await repo.transaction(async c => {
      await c.query("SELECT pg_advisory_xact_lock(7612902)");
      if ((await c.query("SELECT 1 FROM gj_garments_memberships WHERE role='owner' AND status='active'")).rowCount) throw new ManagementError(409, "Setup is complete. Sign in with your staff account.");
      let user = (await c.query("SELECT * FROM ev_users WHERE email=$1 FOR UPDATE", [data.email])).rows[0];
      if (user) { if (user.status !== "active" || !await verifyPassword(data.password, user.password_hash)) throw new ManagementError(403, "Use the existing account password for this email address"); }
      else user = (await c.query("INSERT INTO ev_users(id,email,name,password_hash,status,email_verified_at) VALUES($1,$2,$3,$4,'active',now()) RETURNING *", [randomUUID(), data.email, data.name, await hashPassword(data.password)])).rows[0];
      await c.query("INSERT INTO gj_garments_memberships(user_id,role,status) VALUES($1,'owner','active') ON CONFLICT(user_id) DO UPDATE SET role='owner',status='active'", [user.id]);
      await repo.audit(c, user.id, null, "owner.bootstrapped"); return user;
    });
    await login(req, user); res.json({ ok: true });
  }));
  router.post("/logout", asyncRoute(async (req, res) => { await new Promise<void>((resolve, reject) => req.session.destroy(e => e ? reject(e) : resolve())); res.clearCookie("gj_garments_sid", { path: "/garments" }).json({ ok: true }); }));
  router.post("/forgot", throttle, asyncRoute(async (req, res) => {
    const email = credentials.shape.email.parse(req.body.email);
    await repo.transaction(async c => { const user = (await c.query("SELECT u.* FROM ev_users u JOIN gj_garments_memberships m ON m.user_id=u.id WHERE u.email=$1 AND u.status='active' AND m.status='active'", [email])).rows[0]; if (user) await tokenEmail(c, user, "reset"); });
    res.json({ message: "If this address has access, a reset link has been sent." });
  }));
  router.post("/accept", throttle, asyncRoute(async (req, res) => {
    const data = z.object({ token: z.string().min(32).max(100), password: credentials.shape.password, currentPassword: z.string().max(200).optional() }).parse(req.body);
    const user = await repo.transaction(async c => {
      const row = (await c.query("SELECT * FROM gj_garments_tokens WHERE hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE", [sha256(data.token)])).rows[0];
      if (!row) throw new ManagementError(400, "This link has expired or was already used");
      let user = (await c.query("SELECT * FROM ev_users WHERE id=$1 FOR UPDATE", [row.user_id])).rows[0];
      const membership = (await c.query("SELECT * FROM gj_garments_memberships WHERE user_id=$1 FOR UPDATE", [user.id])).rows[0];
      if (!membership || membership.status === "revoked" || user.status === "disabled") throw new ManagementError(403, "This account no longer has access");
      if (row.purpose === "invite" && user.password_hash) {
        if (!await verifyPassword(data.currentPassword || data.password, user.password_hash)) throw new ManagementError(403, "Enter your existing account password to accept this invitation");
      } else user = (await c.query("UPDATE ev_users SET password_hash=$2,status='active',email_verified_at=COALESCE(email_verified_at,now()),session_epoch=session_epoch+1,updated_at=now() WHERE id=$1 RETURNING *", [user.id, await hashPassword(data.password)])).rows[0];
      await c.query("UPDATE gj_garments_memberships SET status='active' WHERE user_id=$1", [user.id]);
      await c.query("UPDATE gj_garments_tokens SET used_at=now() WHERE id=$1", [row.id]);
      await repo.audit(c, user.id, null, `staff.${row.purpose}.accepted`); return user;
    });
    await login(req, user); res.json({ ok: true });
  }));
  router.get("/staff", required, owner, asyncRoute(async (_req, res) => { res.json((await repo.pool.query("SELECT u.id,u.email,u.name,m.role,m.status FROM gj_garments_memberships m JOIN ev_users u ON u.id=m.user_id ORDER BY u.name")).rows); }));
  router.post("/staff", required, owner, asyncRoute(async (req, res) => {
    const data = z.object({ email: credentials.shape.email, name: z.string().trim().min(1).max(160), role: z.enum(["owner", "editor"]) }).parse(req.body);
    await repo.transaction(async c => {
      await c.query("SELECT pg_advisory_xact_lock(7612902)");
      let user = (await c.query("SELECT * FROM ev_users WHERE email=$1 FOR UPDATE", [data.email])).rows[0];
      if (user?.status === "disabled") throw new ManagementError(409, "This account is disabled");
      if (!user) user = (await c.query("INSERT INTO ev_users(id,email,name,status) VALUES($1,$2,$3,'invited') RETURNING *", [randomUUID(), data.email, data.name])).rows[0];
      if ((await c.query("SELECT 1 FROM gj_garments_memberships WHERE user_id=$1 AND status='active'", [user.id])).rowCount) throw new ManagementError(409, "This person already has access");
      await c.query("INSERT INTO gj_garments_memberships(user_id,role,status) VALUES($1,$2,'invited') ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,status='invited'", [user.id, data.role]);
      await tokenEmail(c, user, "invite"); await repo.audit(c, res.locals.staff.id, null, "staff.invited", { user: user.id, role: data.role });
    }); res.json({ ok: true });
  }));
  router.patch("/staff/:id", required, owner, asyncRoute(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id), data = z.object({ role: z.enum(["owner", "editor"]), status: z.enum(["active", "revoked"]) }).parse(req.body);
    await repo.transaction(async c => {
      await c.query("SELECT pg_advisory_xact_lock(7612902)");
      const old = (await c.query("SELECT * FROM gj_garments_memberships WHERE user_id=$1 FOR UPDATE", [id])).rows[0];
      if (!old) throw new ManagementError(404, "Staff member not found");
      if (old.status === "invited" && data.status === "active") throw new ManagementError(409, "This person must accept their invitation first");
      if (old.role === "owner" && old.status === "active" && (data.role !== "owner" || data.status !== "active") && Number((await c.query("SELECT count(*) FROM gj_garments_memberships WHERE role='owner' AND status='active'")).rows[0].count) < 2) throw new ManagementError(409, "Keep at least one active owner");
      await c.query("UPDATE gj_garments_memberships SET role=$2,status=$3 WHERE user_id=$1", [id, data.role, data.status]);
      if (data.status === "revoked") { await c.query("UPDATE gj_garments_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [id]); await c.query("DELETE FROM gj_garments_sessions WHERE sess->>'userId'=$1", [id]); }
      await repo.audit(c, res.locals.staff.id, null, "staff.updated", { user: id, ...data });
    }); res.json({ ok: true });
  }));
  return { router, middleware, required, owner, csrf, staff, close: () => store.close() };
}
