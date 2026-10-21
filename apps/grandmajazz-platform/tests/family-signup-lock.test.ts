import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
const mocks = vi.hoisted(() => ({
  query: vi.fn(), release: vi.fn(), find: vi.fn(), create: vi.fn(), database: { fixture: true },
}));
vi.mock("../server/db", () => ({ pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) } }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: () => mocks.database }));
vi.mock("../server/storage", () => ({ storage: { findMemberByEmail: mocks.find, createMember: mocks.create } }));
import { withFamilyMemberEmailLock } from "../server/familySignupLock";
import { familySignupRouter } from "../server/familySignup";
import { FAMILY_MARKETING_VERSION } from "../shared/family-original/marketingChoice";

describe("cross-process Family signup email lock", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue({ rows: [] }); });
  it("uses the same transaction connection and releases the lock before cached side effects", async () => {
    const order: string[] = [];
    mocks.query.mockImplementation(async (sql: string) => { order.push(sql); return { rows: [] }; });
    mocks.find.mockResolvedValue(null);
    mocks.create.mockImplementation(async (_member, context) => {
      expect(context.database).toBe(mocks.database);
      context.afterCommit(async () => { order.push("cache"); });
      return { id: "fixture" };
    });
    const result = await withFamilyMemberEmailLock(" Fixture@EXAMPLE.invalid ", async members => {
      await members.findMemberByEmail("fixture@example.invalid");
      return members.createMember({ title: "Cousin", name: "Fixture", email: "fixture@example.invalid" });
    });
    expect(result.id).toBe("fixture");
    expect(mocks.query).toHaveBeenCalledWith("SELECT pg_advisory_xact_lock($1, hashtext($2))", [714500496, "fixture@example.invalid"]);
    expect(mocks.find.mock.calls[0][1]).toBe(mocks.create.mock.calls[0][1]);
    expect(order.indexOf("COMMIT")).toBeLessThan(order.indexOf("cache"));
    expect(mocks.query).not.toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("rolls back failed lookup/create work without running post-commit cache updates", async () => {
    const cache = vi.fn();
    mocks.create.mockImplementation(async (_member, context) => { context.afterCommit(cache); throw new Error("fixture failure"); });
    await expect(withFamilyMemberEmailLock("fixture@example.invalid", members => members.createMember({ title: "Cousin", name: "Fixture", email: "fixture@example.invalid" }))).rejects.toThrow("fixture failure");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
    expect(cache).not.toHaveBeenCalled(); expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("continues consent and one welcome admission after a durable commit even if cache refresh fails", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const row = {
        id: "fixture", title: "Cousin", name: "Fixture", email: Buffer.from("fixture@example.invalid").toString("base64"),
        mailchimpAdded: false, welcomeEmailSent: false, followupScheduled: false, createdAt: new Date("2026-10-20T00:00:00Z"),
      };
      let saved: typeof row | null = null;
      mocks.find.mockImplementation(async () => saved);
      mocks.create.mockImplementation(async (_member, context) => {
        saved = row;
        context.afterCommit(async () => { throw new Error("fixture private cache path"); });
        return row;
      });
      const recordChoice = vi.fn(async () => ({ consented: true, copyVersion: FAMILY_MARKETING_VERSION, recordedAt: new Date() }));
      const admitSubscriber = vi.fn(async () => ({ success: true as const, created: true }));
      const app = express();
      app.use(express.json(), familySignupRouter({
        storage: { findMemberByEmail: mocks.find, createMember: mocks.create, updateMailchimpStatus: vi.fn(async () => {}) },
        withMemberEmailLock: withFamilyMemberEmailLock, recordChoice, admitSubscriber, welcomeEnabled: () => true,
      }));
      const body = { title: "Cousin", name: "Fixture", email: "fixture@example.invalid", marketingConsent: true, marketingConsentVersion: FAMILY_MARKETING_VERSION };
      const initial = await request(app).post("/api/members").send(body);
      expect(initial.status).toBe(201); expect(initial.body.emailQueued).toBe(true);
      const retry = await request(app).post("/api/members").send(body);
      expect(retry.status).toBe(200); expect(retry.body.emailQueued).toBe(false);
      expect(mocks.create).toHaveBeenCalledOnce(); expect(recordChoice).toHaveBeenCalledOnce(); expect(admitSubscriber).toHaveBeenCalledOnce();
      expect(mocks.query).not.toHaveBeenCalledWith("ROLLBACK");
      expect(log).toHaveBeenCalledOnce(); expect(log.mock.calls[0][0]).not.toContain("private");
    } finally { log.mockRestore(); }
  });
  it("does not begin lookup/create work when another process holds the email lock beyond its timeout", async () => {
    const work = vi.fn();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) throw new Error("fixture lock timeout");
      return { rows: [] };
    });
    await expect(withFamilyMemberEmailLock("fixture@example.invalid", work)).rejects.toThrow("fixture lock timeout");
    expect(work).not.toHaveBeenCalled(); expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});

it('queues the owner alert on the same transaction connection before a new Family commit', async () => {
  process.env.FAMILY_OWNER_EMAIL_MODE='smtp';
  try {
    const row={id:'fixture-owner-join',title:'Cousin',name:'Fixture',createdAt:new Date()};
    mocks.create.mockResolvedValue(row);
    await withFamilyMemberEmailLock('fixture@example.invalid',members=>members.createMember({title:'Cousin',name:'Fixture',email:'fixture@example.invalid'}));
    const calls=mocks.query.mock.calls;
    const queued=calls.findIndex(([sql])=>String(sql).includes('INSERT INTO ev_email_outbox'));
    expect(queued).toBeGreaterThan(-1);expect(queued).toBeLessThan(calls.findIndex(([sql])=>sql==='COMMIT'));
    expect(calls[queued][1]).toEqual(expect.arrayContaining(['family_owner_join','grandma@grandmajazz.com','family-owner-join:fixture-owner-join']));
  } finally { delete process.env.FAMILY_OWNER_EMAIL_MODE; }
});
