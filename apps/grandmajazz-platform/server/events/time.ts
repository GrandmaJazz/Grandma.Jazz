/**
 * Timezone helpers using the Intl API only (no extra tz dependency).
 * Storage is always UTC (timestamptz); display uses the event's IANA timezone.
 */

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `tz` from UTC in ms at the given UTC instant. */
function tzOffsetMs(tz: string, utc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(utc).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return asUtc - utc.getTime();
}

/**
 * Interpret a local wall-clock string ("2026-08-01T19:00") in `tz` and return
 * the UTC Date. Two-pass fixpoint handles DST edges (Asia/Bangkok has none,
 * but the helper is general).
 */
export function zonedLocalToUtc(local: string, tz: string): Date {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Invalid local datetime: ${local}`);
  const [, y, mo, d, h, mi, s] = m;
  const naiveUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
  let guess = naiveUtc - tzOffsetMs(tz, new Date(naiveUtc));
  guess = naiveUtc - tzOffsetMs(tz, new Date(guess));
  return new Date(guess);
}

/** Format a UTC instant as local wall-clock "YYYY-MM-DDTHH:mm" in tz (for form inputs). */
export function utcToZonedLocal(utc: Date, tz: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(utc).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "4:20 pm" → "4:20 PM" (attendee-facing convention for this brand). */
function upperMeridiem(s: string): string {
  return s.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

/** Human display, e.g. "Saturday 1 August 2026 at 4:20 PM" in the event tz. */
export function formatEventDateTime(utc: Date, tz: string): string {
  return upperMeridiem(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(utc));
}

export function formatEventTime(utc: Date, tz: string): string {
  return upperMeridiem(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(utc));
}
