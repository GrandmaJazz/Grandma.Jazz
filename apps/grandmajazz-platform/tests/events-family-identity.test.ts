import { beforeEach, describe, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("../server/db", () => ({ pool: { query } }));
import { familyEmailsMatching, indexFamilyIdentities, loadFamilyIdentities } from "../server/events/familyIdentity";

describe("exact Family identity for event presentation", () => {
  beforeEach(() => query.mockReset());
  it("matches encoded and plain emails case-insensitively without exposing email in the identity", () => {
    const map = indexFamilyIdentities([
      { email: Buffer.from(" Sena@EXAMPLE.test ").toString("base64"), title: "Cousin", name: "Sena" },
      { email: "other@example.test", title: "Brother", name: "Other" },
    ]);
    expect(map.get("sena@example.test")).toMatchObject({ title: "Cousin", name: "Sena", displayName: "Cousin Sena" });
    expect(map.get("sena@example.test")).not.toHaveProperty("email");
    expect(map.get("sena@example.test")?.tileUrl).toContain("artwork=badge-v1");
    expect(familyEmailsMatching("cousin sena", map)).toEqual(["sena@example.test"]);
  });
  it("never merges plus aliases, similar names, or conflicting identities", () => {
    const map = indexFamilyIdentities([
      { email: "one@example.test", title: "Cousin", name: "One" },
      { email: "one@example.test", title: "Papa", name: "Two" },
      { email: "one+quiz@example.test", title: "Sister", name: "One" },
    ]);
    expect(map.has("one@example.test")).toBe(false);
    expect(map.get("one+quiz@example.test")?.displayName).toBe("Sister One");
    expect(map.has("someone@example.test")).toBe(false);
  });
  it("accepts duplicate identical choices and safely encodes Unicode/punctuation in tile URLs", () => {
    const row = { email: "a@example.test", title: "Auntie", name: "Éva & Joy" };
    const map = indexFamilyIdentities([row, row]);
    expect(map.size).toBe(1);
    expect(new URL(map.get(row.email)!.tileUrl).searchParams.get("name")).toBe(row.name);
  });
  it("ignores incomplete, malformed and control-character identities", () => {
    expect(indexFamilyIdentities([
      { email: "broken!", title: "Cousin", name: "Sena" },
      { email: "x@example.test", title: "", name: "Sena" },
      { email: "y@example.test", title: "Cousin", name: "Sena\rInjected" },
    ]).size).toBe(0);
  });
  it("uses booking-name fallbacks if the optional Family lookup fails", async () => {
    query.mockRejectedValueOnce(new Error("fixture outage"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await loadFamilyIdentities()).size).toBe(0);
    warn.mockRestore();
  });
});


describe("Apple design deployment watermark", () => {
  it("refreshes earlier passes while preserving newer change dates", async () => {
    const { passModifiedAt } = await import("../server/events/wallet/passUpdates");
    const old = new Date("2026-10-01T00:00:00Z"), recent = new Date("2026-10-22T00:00:00Z");
    vi.stubEnv("EVENTS_PASS_DESIGN_UPDATED_AT", "2026-10-20T14:00:00Z");
    expect(passModifiedAt(old).toISOString()).toBe("2026-10-20T14:00:00.000Z");
    expect(passModifiedAt(recent).toISOString()).toBe(recent.toISOString());
    vi.stubEnv("EVENTS_PASS_DESIGN_UPDATED_AT", "invalid");
    expect(passModifiedAt(old).toISOString()).toBe(old.toISOString());
    vi.unstubAllEnvs();
  });
});
