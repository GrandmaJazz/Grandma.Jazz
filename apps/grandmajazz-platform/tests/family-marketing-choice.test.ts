import { describe, expect, it } from "vitest";
import { FAMILY_MARKETING_VERSION, familyMarketingCopy, familyMarketingChoiceSchema, hasRecordedMarketingPermission } from "../shared/family-original/marketingChoice";

describe("Family membership and optional marketing permission", () => {
  it("accepts old clients without inventing their permission", () => {
    expect(familyMarketingChoiceSchema.parse({ title: "Cousin", name: "Fixture" })).toEqual({});
    expect(hasRecordedMarketingPermission(null)).toBe(false);
  });
  it("accepts a declined updates choice without blocking membership", () => {
    expect(familyMarketingChoiceSchema.parse({ marketingConsent: false, marketingConsentVersion: FAMILY_MARKETING_VERSION }).marketingConsent).toBe(false);
  });
  it("requires the displayed copy version for an affirmative choice", () => {
    expect(familyMarketingChoiceSchema.safeParse({ marketingConsent: true }).success).toBe(false);
    expect(familyMarketingChoiceSchema.safeParse({ marketingConsent: true, marketingConsentVersion: "old-copy" }).success).toBe(false);
    expect(familyMarketingChoiceSchema.safeParse({ marketingConsent: "true", marketingConsentVersion: FAMILY_MARKETING_VERSION }).success).toBe(false);
  });
  it("preserves the exact previously displayed copy and valid recorded permission", () => {
    const version = "family-updates-2026-10-19";
    expect(familyMarketingChoiceSchema.parse({ marketingConsent: true, marketingConsentVersion: version }).marketingConsentVersion).toBe(version);
    expect(familyMarketingCopy(version)).toBe("Keep me in the loop with Grandma Jazz emails about music, café news, events and the shop. I can unsubscribe any time.");
    expect(hasRecordedMarketingPermission({ consented: true, copyVersion: version, recordedAt: "2026-10-19T00:00:00Z" })).toBe(true);
    expect(familyMarketingCopy("__proto__")).toBeNull();
  });
  it("only allows recorded affirmative permission with a real server timestamp", () => {
    const recorded = { consented: true, copyVersion: FAMILY_MARKETING_VERSION, recordedAt: "2026-10-19T00:00:00Z" };
    expect(hasRecordedMarketingPermission(recorded)).toBe(true);
    expect(hasRecordedMarketingPermission({ ...recorded, consented: false })).toBe(false);
    expect(hasRecordedMarketingPermission({ ...recorded, copyVersion: "unknown" })).toBe(false);
    expect(hasRecordedMarketingPermission({ ...recorded, recordedAt: "invalid" })).toBe(false);
  });
});
