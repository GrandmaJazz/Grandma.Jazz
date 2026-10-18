import { z } from "zod";

// Keep the exact versioned copy with the recorded choice.
export const FAMILY_MARKETING_VERSION = "family-updates-2026-10-19";
export const FAMILY_MARKETING_COPY = "Keep me in the loop with Grandma Jazz emails about music, café news, events and the shop. I can unsubscribe any time.";
export const familyMarketingChoiceSchema = z.object({
  marketingConsent: z.boolean().optional(),
  marketingConsentVersion: z.literal(FAMILY_MARKETING_VERSION).optional(),
}).superRefine((value, context) => {
  if (value.marketingConsent === true && !value.marketingConsentVersion) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Please review the email updates choice.", path: ["marketingConsentVersion"] });
  }
});
export type FamilyMarketingChoice = z.infer<typeof familyMarketingChoiceSchema>;
export type RecordedMarketingPermission = { consented: boolean; copyVersion: string; recordedAt: string | Date };
export function hasRecordedMarketingPermission(value: RecordedMarketingPermission | null | undefined): boolean {
  return value?.consented === true && value.copyVersion === FAMILY_MARKETING_VERSION &&
    Number.isFinite(new Date(value.recordedAt).getTime());
}
