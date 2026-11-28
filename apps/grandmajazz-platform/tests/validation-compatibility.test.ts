import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFamilyMemberSchema } from "../shared/schema";
import { familyNicknameSchema } from "../shared/family-original/familyValidation";
import { draftSchema } from "../shared/garments-management";
import { fixtureIssue } from "../client/src/garments/fixtures";

describe("patched validation integration", () => {
  it("keeps generated Family insert fields required and strips server-owned fields", () => {
    const member = { title: "Cousin", name: "Séna", email: "fixture@example.invalid" };
    expect(insertFamilyMemberSchema.parse({ ...member, id: "untrusted", welcomeEmailSent: true })).toEqual(member);
    for (const field of ["title", "name", "email"] as const) {
      const body: Record<string, unknown> = { ...member };
      delete body[field];
      expect(insertFamilyMemberSchema.safeParse(body).success).toBe(false);
    }
  });
  it("retains multilingual nicknames and rejects surnames and oversized names", () => {
    for (const name of ["Séna", "แสง", "小林"]) expect(familyNicknameSchema.parse(` ${name} `)).toBe(name);
    for (const name of ["A", "Two Names", "abcdefghijklmn"]) expect(familyNicknameSchema.safeParse(name).success).toBe(false);
  });
  it("returns accessible form field errors instead of throwing on invalid submissions", async () => {
    const resolver = zodResolver(z.object({ name: familyNicknameSchema, email: z.string().email("Please enter a valid email") }));
    const result = await resolver({ name: "A", email: "invalid" }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(result.values).toEqual({});
    expect(result.errors.name?.message).toBe("Use a nickname with at least 2 characters.");
    expect(result.errors.email?.message).toBe("Please enter a valid email");
  });
  it("preserves edition parsing and rejects collections above the existing page limit", () => {
    expect(draftSchema.safeParse(fixtureIssue).success).toBe(true);
    const result = draftSchema.safeParse({ ...fixtureIssue, pages: Array.from({ length: 10000 }, () => null) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.code === "too_big" && issue.path[0] === "pages")).toBe(true);
      expect(result.error.issues.length).toBeLessThan(10);
    }
  });
});
