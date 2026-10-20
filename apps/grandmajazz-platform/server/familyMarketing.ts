import { pool } from "./db";
import { familyMarketingCopy, type FamilyMarketingChoice, type RecordedMarketingPermission } from "../shared/family-original/marketingChoice";

export async function getFamilyMarketingPermission(memberId: string): Promise<RecordedMarketingPermission | null> {
  const result = await pool.query(
    'SELECT consented, copy_version AS "copyVersion", recorded_at AS "recordedAt" FROM family_marketing_permissions WHERE member_id=$1',
    [memberId],
  );
  return result.rows[0] ?? null;
}

export async function recordFamilyMarketingChoice(memberId: string, choice: FamilyMarketingChoice): Promise<RecordedMarketingPermission | null> {
  // Old clients can still create a Family brick, but cannot assert marketing
  // permission without having displayed the versioned choice.
  const version = choice.marketingConsentVersion;
  const copy = version ? familyMarketingCopy(version) : null;
  if (!version || !copy || typeof choice.marketingConsent !== "boolean") return null;
  await pool.query(
    "INSERT INTO family_marketing_permissions(member_id, consented, copy_version, copy_text) VALUES ($1,$2,$3,$4) ON CONFLICT (member_id) DO NOTHING",
    [memberId, choice.marketingConsent, version, copy],
  );
  return getFamilyMarketingPermission(memberId);
}
