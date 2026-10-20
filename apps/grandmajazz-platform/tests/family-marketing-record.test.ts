import { beforeEach, describe, expect, it, vi } from "vitest";
const sql = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../server/db", () => ({ pool: sql }));
import { recordFamilyMarketingChoice } from "../server/familyMarketing";
import { FAMILY_MARKETING_COPY, FAMILY_MARKETING_VERSION, familyMarketingCopy } from "../shared/family-original/marketingChoice";

describe("exact displayed Family permission evidence", () => {
  beforeEach(() => { sql.query.mockReset(); sql.query.mockResolvedValue({ rows: [] }); });
  it.each(["family-updates-2026-10-19", FAMILY_MARKETING_VERSION] as const)("records the actual %s copy without relabelling it", async version => {
    await recordFamilyMarketingChoice("fixture", { marketingConsent: true, marketingConsentVersion: version });
    expect(sql.query.mock.calls[0][1]).toEqual(["fixture", true, version, familyMarketingCopy(version)]);
    expect(sql.query.mock.calls[0][0]).toContain("ON CONFLICT (member_id) DO NOTHING");
    if (version === FAMILY_MARKETING_VERSION) expect(sql.query.mock.calls[0][1][3]).toBe(FAMILY_MARKETING_COPY);
  });
  it("does not manufacture evidence for an old client with no displayed copy", async () => {
    expect(await recordFamilyMarketingChoice("fixture", {})).toBeNull();
    expect(sql.query).not.toHaveBeenCalled();
  });
  it("returns an original decline rather than replacing it with a repeated affirmative request", async () => {
    const original = { consented: false, copyVersion: "family-updates-2026-10-19", recordedAt: "2026-10-19T00:00:00Z" };
    sql.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [original] });
    expect(await recordFamilyMarketingChoice("fixture", { marketingConsent: true, marketingConsentVersion: FAMILY_MARKETING_VERSION })).toEqual(original);
    expect(sql.query.mock.calls[0][0]).not.toContain("DO UPDATE");
  });
});
