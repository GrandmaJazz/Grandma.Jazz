import { z } from "zod";

// Keep the exact versioned copy with the recorded choice.
export const FAMILY_MARKETING_VERSION = "family-join-email-2026-10-22";
export const FAMILY_MARKETING_COPY = "“Join & email my brick” requests your personal welcome, then occasional Grandma Jazz emails about music, café news, events and the shop. Unsubscribe any time.";
export const FAMILY_MARKETING_COPIES = {
  "family-updates-2026-10-19": "Keep me in the loop with Grandma Jazz emails about music, café news, events and the shop. I can unsubscribe any time.",
  "family-updates-2026-10-20": "Email me my personal welcome, then occasional Grandma Jazz updates about music, café news, events and the shop. I can unsubscribe any time.",
  [FAMILY_MARKETING_VERSION]: FAMILY_MARKETING_COPY,
} as const;
const copyVersionSchema = z.enum(["family-updates-2026-10-19", "family-updates-2026-10-20", FAMILY_MARKETING_VERSION]);
export const familyMarketingChoiceSchema = z.object({
  marketingConsent: z.boolean().optional(),
  marketingConsentVersion: copyVersionSchema.optional(),
}).superRefine((value, context) => {
  if (value.marketingConsent === true && !value.marketingConsentVersion) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Please review the email updates choice.", path: ["marketingConsentVersion"] });
  }
});
export type FamilyMarketingChoice = z.infer<typeof familyMarketingChoiceSchema>;
export type RecordedMarketingPermission = { consented: boolean; copyVersion: string; recordedAt: string | Date };
export function familyMarketingCopy(version: string): string | null {
  return Object.hasOwn(FAMILY_MARKETING_COPIES, version)
    ? FAMILY_MARKETING_COPIES[version as keyof typeof FAMILY_MARKETING_COPIES]
    : null;
}
export function hasRecordedMarketingPermission(value: RecordedMarketingPermission | null | undefined): boolean {
  return value?.consented === true && familyMarketingCopy(value.copyVersion) !== null &&
    Number.isFinite(new Date(value.recordedAt).getTime());
}
