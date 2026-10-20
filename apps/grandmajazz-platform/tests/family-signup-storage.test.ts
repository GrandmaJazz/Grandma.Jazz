import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ writeFile: vi.fn(), defaultInsert: vi.fn(), defaultSelect: vi.fn() }));
vi.mock("../server/db", () => ({ db: { insert: mocks.defaultInsert, select: mocks.defaultSelect } }));
vi.mock("../server/familyModeration", () => ({ removedFamilyMembers: async () => new Map() }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => {}), writeFile: mocks.writeFile, readFile: vi.fn(async () => "[]"), readdir: vi.fn(async () => []),
}));
import { DatabaseStorage, type MemberWriteContext } from "../server/storage";

const row = {
  id: "fixture", title: "Cousin", name: "Fixture", email: Buffer.from("fixture@example.invalid").toString("base64"),
  createdAt: new Date("2026-10-20T00:00:00Z"), mailchimpAdded: false, welcomeEmailSent: false, followupScheduled: false,
};
const input = { title: "Cousin", name: "Fixture", email: "fixture@example.invalid" };
function context() {
  const callbacks: Array<() => Promise<void>> = [];
  const returning = vi.fn(async () => [row]);
  const limit = vi.fn(async () => [row]);
  const values = vi.fn(() => ({ returning }));
  const database = {
    insert: vi.fn(() => ({ values })),
    select: vi.fn(() => ({ from: () => ({ where: () => ({ limit }) }) })),
  };
  const scoped: MemberWriteContext = { database: database as unknown as MemberWriteContext["database"], afterCommit: action => { callbacks.push(action); } };
  return { scoped, callbacks, values, returning, limit };
}
describe("transaction-scoped Family storage keeps existing side effects safe", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses the scoped database and defers both member-cache updates until commit", async () => {
    const storage = new DatabaseStorage(), c = context();
    expect(await storage.findMemberByEmail(input.email, c.scoped)).toEqual(row);
    expect(await storage.createMember(input, c.scoped)).toEqual(row);
    expect(c.values).toHaveBeenCalledWith({ ...input, email: row.email });
    expect(mocks.defaultSelect).not.toHaveBeenCalled(); expect(mocks.defaultInsert).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled(); expect(c.callbacks).toHaveLength(1);
    await c.callbacks[0]();
    expect(mocks.writeFile).toHaveBeenCalledTimes(2);
  });
  it("fails closed on a scoped lookup error instead of treating it as a missing email", async () => {
    const c = context(); c.limit.mockRejectedValue(new Error("fixture unavailable"));
    await expect(new DatabaseStorage().findMemberByEmail(input.email, c.scoped)).rejects.toThrow("fixture unavailable");
    expect(mocks.writeFile).not.toHaveBeenCalled(); expect(c.callbacks).toHaveLength(0);
  });
  it("fails closed on a scoped insert error without creating a fallback duplicate or cache record", async () => {
    const c = context(); c.returning.mockRejectedValue(new Error("fixture unavailable"));
    await expect(new DatabaseStorage().createMember(input, c.scoped)).rejects.toThrow("fixture unavailable");
    expect(mocks.writeFile).not.toHaveBeenCalled(); expect(c.callbacks).toHaveLength(0);
  });
});
