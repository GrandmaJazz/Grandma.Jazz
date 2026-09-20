// src/lib/recurringEvents.ts
//
// Recurring nights, defined in the repo rather than in the database.
//
// Why: the backend stores an event as a single row with one fixed date, and
// the only public endpoint (/api/events/active) returns that one row. The
// weekly Quiz Session therefore went stale the moment its date passed, and
// /events showed nothing to book. Nobody should have to remember to re-enter
// a date every Saturday.
//
// A series below rolls forward on its own, forever. To change a night, edit
// the entry. To add one, add an entry. To retire one, delete it.
//
// All times are Asia/Bangkok wall-clock. Thailand has no daylight saving, so
// a fixed +07:00 offset is exact — no timezone database needed.

export const BANGKOK_OFFSET_HOURS = 7;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface RecurringSeries {
  /** Stable id, used for React keys and schema.org URLs. */
  id: string;
  title: string;
  /** Shown on the card. Keep it short — Grandma doesn't waffle. */
  description: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** Bangkok wall-clock start, 24h "HH:MM". */
  time: string;
  /** How long it runs, in minutes. Used to keep a night listed while it's on. */
  durationMinutes: number;
  /** 0 means free. */
  priceTHB: number;
  location: string;
}

export const RECURRING_SERIES: RecurringSeries[] = [
  {
    id: 'quiz-sessions',
    title: 'Quiz Sessions',
    description:
      'Think you know more than your friends? Every Saturday, Grandma Jazz hosts its weekly Quiz Session — music, general knowledge, cannabis culture, and sponsored prizes up for grabs.',
    weekday: 6, // Saturday
    time: '16:20',
    durationMinutes: 180,
    priceTHB: 0,
    location: 'Grandma Jazz, Kamala, Phuket',
  },
];

export interface Occurrence {
  seriesId: string;
  title: string;
  description: string;
  priceTHB: number;
  location: string;
  /** The real instant the night starts. */
  start: Date;
  end: Date;
  /** "2026-09-19T16:20:00+07:00" — ready for schema.org. */
  isoWithOffset: string;
  /** The matching Bangkok end time, ready for schema.org. */
  endIsoWithOffset: string;
}

/** Bangkok wall-clock parts of an instant. */
function bangkokParts(instant: Date) {
  const shifted = new Date(instant.getTime() + BANGKOK_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** The instant corresponding to a Bangkok wall-clock date + time. */
function bangkokInstant(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(Date.UTC(year, month, day, hours, minutes) - BANGKOK_OFFSET_HOURS * HOUR_MS);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** An instant formatted as Bangkok wall-clock time with Thailand's fixed offset. */
function bangkokIsoWithOffset(instant: Date): string {
  const shifted = new Date(instant.getTime() + BANGKOK_OFFSET_HOURS * HOUR_MS);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:00+0${BANGKOK_OFFSET_HOURS}:00`;
}

/**
 * The next `count` occurrences of a series, starting from `now`.
 * A night that has started but not finished still counts as next — the page
 * should say "tonight", not skip to next week at 16:21.
 */
export function nextOccurrences(
  series: RecurringSeries,
  count: number,
  now: Date = new Date(),
): Occurrence[] {
  const [hours, minutes] = series.time.split(':').map(Number);
  const today = bangkokParts(now);

  // Step back to the most recent occurrence of the weekday (today included),
  // then walk forward a week at a time until we're past `now`.
  const daysSince = (today.weekday - series.weekday + 7) % 7;
  let start = bangkokInstant(today.year, today.month, today.day - daysSince, hours, minutes);

  const durationMs = series.durationMinutes * 60 * 1000;
  while (start.getTime() + durationMs <= now.getTime()) {
    start = new Date(start.getTime() + 7 * DAY_MS);
  }

  const out: Occurrence[] = [];
  for (let i = 0; i < count; i += 1) {
    const s = new Date(start.getTime() + i * 7 * DAY_MS);
    const end = new Date(s.getTime() + durationMs);
    out.push({
      seriesId: series.id,
      title: series.title,
      description: series.description,
      priceTHB: series.priceTHB,
      location: series.location,
      start: s,
      end,
      isoWithOffset: bangkokIsoWithOffset(s),
      endIsoWithOffset: bangkokIsoWithOffset(end),
    });
  }
  return out;
}

/** Every series' next occurrences, merged and sorted soonest-first. */
export function upcomingOccurrences(perSeries: number, now: Date = new Date()): Occurrence[] {
  return RECURRING_SERIES.flatMap((s) => nextOccurrences(s, perSeries, now)).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
}

/** "Saturday, 19 September 2026" in Bangkok. */
export function formatOccurrenceDate(instant: Date): string {
  return instant.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
}

/** "Tonight" / "Tomorrow" / "" — a nudge, only when it's true. */
export function relativeLabel(instant: Date, now: Date = new Date()): string {
  const a = bangkokParts(instant);
  const b = bangkokParts(now);
  const dayA = Date.UTC(a.year, a.month, a.day);
  const dayB = Date.UTC(b.year, b.month, b.day);
  const diffDays = Math.round((dayA - dayB) / DAY_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return 'This week';
  return '';
}
