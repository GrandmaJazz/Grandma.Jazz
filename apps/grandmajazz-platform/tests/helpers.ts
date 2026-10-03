import express, { type Express } from "express";
import request from "supertest";
import { pool, db } from "../server/db";
import { businesses, businessMemberships, users, events } from "../shared/events-schema";
import { hashPassword, resetRateLimits } from "../server/events/security";
import { mountEventsModule } from "../server/events";
import { stopOutboxWorker } from "../server/events/outboxWorker";

let app: Express | null = null;

export async function getApp(): Promise<Express> {
  if (app) return app;
  app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "5mb" }));
  await mountEventsModule(app);
  stopOutboxWorker(); // tests drain the outbox explicitly
  return app;
}

/** Truncate all events tables (order-safe) between test files. */
export async function resetDb(): Promise<void> {
  await pool.query(`
    TRUNCATE ev_check_ins, ev_tickets, ev_registrations, ev_email_outbox,
             ev_audit_log, ev_one_time_tokens, ev_events, ev_venues,
             ev_business_memberships, ev_users, ev_sessions, ev_businesses
    CASCADE`);
  resetRateLimits();
}

export interface TestActor {
  email: string;
  password: string;
  userId: string;
  businessId: string;
  agent: ReturnType<typeof request.agent>;
}

let seq = 0;

export async function createBusinessWithOwner(opts: {
  name: string;
  role?: "business_owner" | "event_manager" | "checkin_staff";
}): Promise<TestActor> {
  const a = await getApp();
  seq++;
  const email = `owner${seq}@test.local`;
  const password = "correct-horse-battery";
  const [biz] = await db.insert(businesses).values({
    name: opts.name,
    slug: `biz-${seq}-${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  }).returning();
  const [user] = await db.insert(users).values({
    email, name: `Owner of ${opts.name}`,
    passwordHash: await hashPassword(password),
    status: "active",
  }).returning();
  await db.insert(businessMemberships).values({
    businessId: biz.id, userId: user.id, role: opts.role ?? "business_owner", status: "active",
  });
  const agent = request.agent(a);
  const res = await agent.post("/events/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`test login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { email, password, userId: user.id, businessId: biz.id, agent };
}

export async function addStaff(owner: TestActor, role: "event_manager" | "checkin_staff"): Promise<TestActor> {
  const a = await getApp();
  seq++;
  const email = `staff${seq}@test.local`;
  const password = "another-fine-password";
  const [user] = await db.insert(users).values({
    email, name: `Staff ${seq}`, passwordHash: await hashPassword(password), status: "active",
  }).returning();
  await db.insert(businessMemberships).values({
    businessId: owner.businessId, userId: user.id, role, status: "active",
  });
  const agent = request.agent(a);
  const res = await agent.post("/events/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`staff login failed: ${res.status}`);
  return { email, password, userId: user.id, businessId: owner.businessId, agent };
}

export async function createPublishedEvent(actor: TestActor, overrides: Record<string, unknown> = {}): Promise<{ id: string; slug: string }> {
  seq++;
  const create = await actor.agent.post("/events/api/v1/manage/events").send({
    title: `Test Event ${seq}`,
    startsAtLocal: "2027-01-15T19:00",
    endsAtLocal: "2027-01-15T23:00",
    timezone: "Asia/Bangkok",
    ...overrides,
  });
  if (create.status !== 201) throw new Error(`event create failed: ${create.status} ${JSON.stringify(create.body)}`);
  const id = create.body.event.id;
  const pub = await actor.agent.post(`/events/api/v1/manage/events/${id}/status`).send({ status: "published" });
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return { id, slug: create.body.event.slug };
}

let regSeq = 0;
export function registrationPayload(overrides: Record<string, unknown> = {}) {
  regSeq++;
  return {
    fullName: `Visitor ${regSeq}`,
    email: `visitor${regSeq}@test.local`,
    phone: `+6681${String(1000000 + regSeq)}`,
    termsAccepted: true,
    idempotencyKey: `idem-${regSeq}-${Date.now()}`,
    website: "",
    ...overrides,
  };
}

export { pool, db, events };
