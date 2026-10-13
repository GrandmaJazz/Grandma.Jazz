export type PublicWallMember = [string, string, string, (string | null)?];

// 387 legacy names were imported together on this date. Their actual joining
// dates were not retained; never present the import timestamp as a join date.
const LEGACY_IMPORT_DAY = "2025-03-28";
export function recordedJoinMonth(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const iso = date.toISOString();
  return iso.startsWith(LEGACY_IMPORT_DAY) ? null : iso.slice(0, 7);
}
export function publicWallMember(member: {id: string; title: string; name: string; createdAt?: string | Date | null}): PublicWallMember {
  return [member.id, member.title, member.name, recordedJoinMonth(member.createdAt)];
}
export function joinedMonthLabel(month?: string | null): string {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return "Before records began";
  return new Intl.DateTimeFormat("en", {month:"long", year:"numeric", timeZone:"UTC"}).format(new Date(`${month}-01T00:00:00Z`));
}
