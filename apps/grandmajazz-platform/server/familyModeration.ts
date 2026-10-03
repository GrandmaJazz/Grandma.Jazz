import { pool } from "./db";
let initialized: Promise<void> | undefined;
export function ensureFamilyModeration() {
  if (!initialized) initialized = pool.query(`CREATE TABLE IF NOT EXISTS family_member_moderation (
    member_id text PRIMARY KEY, removed_at timestamptz NOT NULL DEFAULT now()
  )`).then(() => {}).catch(error => { initialized = undefined; throw error; });
  return initialized;
}
export async function removedFamilyMembers(): Promise<Map<string, string>> {
  await ensureFamilyModeration();
  const result = await pool.query("SELECT member_id, removed_at FROM family_member_moderation");
  return new Map(result.rows.map(row => [row.member_id, new Date(row.removed_at).toISOString()]));
}

