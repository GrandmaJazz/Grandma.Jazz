import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../db";
import { businessMemberships, users, type MembershipRole, type User } from "@shared/events-schema";
import { eventsConfig } from "./config";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    sessionEpoch?: number;
  }
}

export interface AuthedRequest extends Request {
  user: User;
  membership: { businessId: string; role: MembershipRole } | null;
  isPlatformAdmin: boolean;
}

const PgStore = connectPgSimple(session);

export function eventsSessionMiddleware(): RequestHandler {
  return session({
    store: new PgStore({ pool, tableName: "ev_sessions", createTableIfMissing: false, pruneSessionInterval: 15 * 60 }),
    name: "gj_events_sid",
    secret: eventsConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: eventsConfig.isProd, // behind nginx TLS; trust proxy is set on the app
      sameSite: "lax",
      path: "/events", // scoped: the legacy wall app never sees this cookie
      maxAge: 12 * 60 * 60 * 1000, // 12h rolling
    },
  });
}

/** Regenerate the session on privilege change (login) to prevent fixation. */
export function loginSession(req: Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.sessionEpoch = user.sessionEpoch;
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Loads the authenticated user + their active membership. 401 when absent.
 * sessionEpoch mismatch (e.g. password change) invalidates old sessions.
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.status !== "active" || user.sessionEpoch !== (req.session.sessionEpoch ?? 0)) {
      await destroySession(req).catch(() => {});
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const memberships = await db
      .select({ businessId: businessMemberships.businessId, role: businessMemberships.role })
      .from(businessMemberships)
      .where(and(eq(businessMemberships.userId, user.id), eq(businessMemberships.status, "active")));

    const r = req as AuthedRequest;
    r.user = user;
    // Single-tenant launch: one active membership per user. The schema supports
    // more; a business switcher would slot in here later.
    r.membership = memberships[0] ?? null;
    r.isPlatformAdmin = user.isPlatformAdmin;
    next();
  })().catch(next);
}

const ROLE_RANK: Record<MembershipRole, number> = {
  checkin_staff: 1,
  event_manager: 2,
  business_owner: 3,
};

/** Requires an active business membership with at least the given role. */
export function requireRole(minRole: MembershipRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = req as AuthedRequest;
    if (!r.membership || ROLE_RANK[r.membership.role] < ROLE_RANK[minRole]) {
      res.status(403).json({ error: "You do not have permission to do this" });
      return;
    }
    next();
  };
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const r = req as AuthedRequest;
  if (!r.isPlatformAdmin) {
    res.status(403).json({ error: "You do not have permission to do this" });
    return;
  }
  next();
}
