import { pool } from "../db";
import { familyDisplayName, familyTileUrl } from "../familyEmailIdentity";
import type { EventFamilyIdentity } from "@shared/events-familyIdentity";

type FamilyRow = { title: string; name: string; email: string; createdAt?: Date | string | null };
export const normalizeFamilyEmail = (email: string) => email.trim().toLowerCase();

function storedEmail(value: string): string | null {
  if (value.includes("@")) return normalizeFamilyEmail(value);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  const decoded = Buffer.from(value, "base64").toString("utf8");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded.trim()) ? normalizeFamilyEmail(decoded) : null;
}

/** Exact email only. Never infer identity from a booking name or strip aliases. */
export function indexFamilyIdentities(rows: FamilyRow[]): Map<string, EventFamilyIdentity> {
  const choices = new Map<string, Map<string, { identity: EventFamilyIdentity; joinedAt: number }>>();
  for (const row of rows) {
    const email = storedEmail(row.email || "");
    if (!email || !row.title?.trim() || !row.name?.trim()) continue;
    try {
      const title = row.title.trim(), name = row.name.trim();
      const displayName = familyDisplayName(title, name);
      const candidates = choices.get(email) ?? new Map();
      const key = JSON.stringify([title, name]);
      const parsed = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
      const joinedAt = Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
      if (!candidates.has(key) || joinedAt > candidates.get(key)!.joinedAt) {
        candidates.set(key, { identity: { title, name, displayName, tileUrl: familyTileUrl(title, name) }, joinedAt });
      }
      choices.set(email, candidates);
    } catch { /* An invalid historical identity must not prevent ticket access. */ }
  }
  return new Map(Array.from(choices).flatMap(([email, candidates]) => {
    const records = Array.from(candidates.values());
    const latest = Math.max(...records.map(record => record.joinedAt));
    const newest = records.filter(record => record.joinedAt === latest);
    // The owner's policy is the most recent chosen identity. A genuinely tied
    // or undated conflict has no chronological winner, so retain the booking name.
    return newest.length === 1 ? [[email, newest[0].identity]] : [];
  }));
}

/** Read live active Family records; no subscriber/provider/cache writes. */
export async function loadFamilyIdentities(): Promise<Map<string, EventFamilyIdentity>> {
  try {
    const { rows } = await pool.query<FamilyRow>(`SELECT f.title, f.name, f.email, f.created_at AS "createdAt"
      FROM family_members f LEFT JOIN family_member_moderation m ON m.member_id = f.id
      WHERE m.member_id IS NULL`);
    return indexFamilyIdentities(rows);
  } catch {
    console.warn("[events] Family identity unavailable; using booking names");
    return new Map();
  }
}

export async function familyIdentityForEmail(email: string): Promise<EventFamilyIdentity | null> {
  return (await loadFamilyIdentities()).get(normalizeFamilyEmail(email)) ?? null;
}

export function familyEmailsMatching(query: string, identities: Map<string, EventFamilyIdentity>): string[] {
  const needle = query.trim().toLowerCase();
  return Array.from(identities).filter(([, identity]) => identity.displayName.toLowerCase().includes(needle)).map(([email]) => email);
}
