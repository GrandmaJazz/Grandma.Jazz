export type AdmissionResult =
  | { success: true; created: boolean }
  | { success: false; created: false; error: string };
export type ExistingMarketingMember = { status: string; tags?: { name: string }[] };

export type AdmissionDependencies = {
  withLock<T>(work: () => Promise<T>): Promise<T>;
  findMember(): Promise<ExistingMarketingMember | null>;
  countBillableContacts(): Promise<number>;
  createMember(): Promise<void>;
};

// This limit protects website/API enrolment. Mailchimp UI imports and campaign
// sends must still be reviewed separately; this is not a provider spending cap.
export function contactAdmissionLimit(value = "495"): number | null {
  if (!/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit <= 495 ? limit : null;
}

export async function admitFamilySubscriber(
  limit: number | null,
  dependencies: AdmissionDependencies,
): Promise<AdmissionResult> {
  try {
    return await dependencies.withLock(async () => {
      const existing = await dependencies.findMember();
      if (existing) {
        // Do not modify an existing record: even profile/tag updates can undo
        // an archive. Never turn an opt-out into a new subscribed contact.
        if (existing.status === "subscribed" &&
            existing.tags?.some(tag => tag.name === "family-member")) {
          return { success: true, created: false };
        }
        return { success: false, created: false, error: "Existing marketing record needs review; no changes made" };
      }

      if (limit === null) {
        return { success: false, created: false, error: "Marketing enrolment held: invalid contact limit" };
      }
      const count = await dependencies.countBillableContacts();
      if (!Number.isSafeInteger(count) || count < 0) {
        return { success: false, created: false, error: "Marketing enrolment held: contact count unavailable" };
      }
      if (count >= limit) {
        return { success: false, created: false, error: "Marketing enrolment held: contact capacity reached" };
      }

      await dependencies.createMember();
      return { success: true, created: true };
    });
  } catch {
    // The caller already stores the Family brick before this runs. Leave
    // mailchimp_added=false so the pending-member admin view can surface
    // the held enrolment.
    return { success: false, created: false, error: "Marketing enrolment held: verification failed" };
  }
}
