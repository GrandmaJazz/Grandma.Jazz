import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), members: vi.fn(), send: vi.fn(), removed: vi.fn() }));
vi.mock("../server/db", () => ({ pool: { query: mocks.query } }));
vi.mock("../server/storage", () => ({ storage: { getAdminMembers: mocks.members, getAllMembers: vi.fn() } }));
vi.mock("../server/email", () => ({ sendFamilyMessage: mocks.send }));
vi.mock("../server/familyModeration", () => ({ ensureFamilyModeration: vi.fn(), removedFamilyMembers: mocks.removed }));
vi.mock("../server/events/security", () => ({ rateLimit: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
import { familyManagementRouter } from "../server/familyManagement";
const app = express(); app.use(express.json());
// The production parent router verifies admin access before mounting this router.
app.use("/members", (req, res, next) => req.header("authorization") === "Bearer test-admin" ? next() : res.sendStatus(403), familyManagementRouter());
const auth = { authorization: "Bearer test-admin" };
beforeEach(() => { vi.clearAllMocks(); process.env.RESEND_API_KEY = "test-only";
  mocks.members.mockResolvedValue({ source: "database", members: [{ id: "member-1", title: "Aunt", name: "Test", email: "stored@example.com" }] });
  mocks.removed.mockResolvedValue(new Map([["member-1", "2026-10-03T00:00:00Z"]])); mocks.query.mockResolvedValue({ rows: [] });
});
describe("Family Wall management", () => {
  it("rejects unauthenticated reads and changes", async () => { expect((await request(app).get("/members")).status).toBe(403); expect((await request(app).post("/members/member-1/remove")).status).toBe(403); expect(mocks.query).not.toHaveBeenCalled(); });
  it("shows removal state without caching private members", async () => { const r = await request(app).get("/members").set(auth); expect(r.body.members[0].removedAt).toBeTruthy(); expect(r.headers["cache-control"]).toBe("no-store"); });
  it("soft removes and restores names rather than deleting member records", async () => {
    expect((await request(app).post("/members/member-1/remove").set(auth)).status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("INSERT INTO family_member_moderation");
    expect((await request(app).post("/members/member-1/restore").set(auth)).status).toBe(200);
    expect(mocks.query.mock.calls[1][0]).toContain("DELETE FROM family_member_moderation");
  });
  it("refuses writes against cached data", async () => { mocks.members.mockResolvedValue({ source: "full-cache", members: [] }); expect((await request(app).post("/members/member-1/remove").set(auth)).status).toBe(503); expect(mocks.query).not.toHaveBeenCalled(); });
  it("rejects unknown member ids", async () => { expect((await request(app).post("/members/missing/email").set(auth).send({ subject: "Hi", message: "Hello" })).status).toBe(404); expect(mocks.send).not.toHaveBeenCalled(); });
  it("uses the stored email, never a client supplied recipient", async () => { const r = await request(app).post("/members/member-1/email").set(auth).send({ to: "injected@example.com", subject: "Hello", message: "From Grandma Jazz" }); expect(r.status).toBe(200); expect(mocks.send).toHaveBeenCalledWith("stored@example.com", "Hello", "From Grandma Jazz"); });
  it("rejects empty messages and email header injection", async () => { for (const body of [{ subject: "Hello", message: " " }, { subject: "Hello\r\nBcc: other@example.com", message: "Hello" }]) expect((await request(app).post("/members/member-1/email").set(auth).send(body)).status).toBe(400); expect(mocks.send).not.toHaveBeenCalled(); });
  it("reports missing email delivery configuration", async () => { delete process.env.RESEND_API_KEY; expect((await request(app).post("/members/member-1/email").set(auth).send({ subject: "Hello", message: "Hello" })).status).toBe(503); expect(mocks.send).not.toHaveBeenCalled(); });
});
