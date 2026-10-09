import { pool } from "../db";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const QUIZ = {
  title: "Quiz Session",
  subtitle: "Weekly Quiz Session at Grandma Jazz.",
  slugPrefix: "quiz-session",
  weekday: 6,
  hour: 16,
  minute: 20,
  durationMinutes: 120,
  capacity: 25,
  timezone: "Asia/Bangkok",
  minAge: 21,
  dressCode: "Come as you please",
  contactEmail: "ac@grandmajazz.com",
  contactPhone: "948605652",
  descriptionHtml: [
    "<p>Every Saturday at 4:20 PM, Grandma Jazz becomes home to our weekly Quiz Session.</p>",
    "<p>Expect a relaxed mix of general knowledge, music, films, geography, nature, Thailand, history and the occasional curveball.</p>",
    "<p>Whether you are travelling through Phuket, living nearby or visiting with friends, everyone is welcome. Come with a team or join one when you arrive.</p>",
    "<p>Good flowers, great coffee, a relaxed atmosphere and good company.</p>",
    "<p>Grandma Jazz - Kamala, Phuket<br>Starts: 4:20 PM<br>Location: Grandma Jazz, Kamala</p>",
  ].join("\n"),
};

function bangkokParts(instant: Date) {
  const shifted = new Date(instant.getTime() + BANGKOK_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function bangkokInstant(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - BANGKOK_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateSlug(start: Date): string {
  const p = bangkokParts(start);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

function nextQuizStarts(count: number, now = new Date()): Date[] {
  const today = bangkokParts(now);
  const daysUntil = (QUIZ.weekday - today.weekday + 7) % 7;
  let start = bangkokInstant(today.year, today.month, today.day + daysUntil, QUIZ.hour, QUIZ.minute);
  if (start <= now) start = new Date(start.getTime() + WEEK_MS);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * WEEK_MS));
}

export async function ensureWeeklyQuizEvents(now = new Date()): Promise<void> {
  if (process.env.EVENTS_AUTO_SEED_QUIZ === "0") return;

  try {
    const { rows: [business] } = await pool.query(
      `SELECT id FROM ev_businesses WHERE slug = 'grandma-jazz' AND status = 'active' LIMIT 1`,
    );
    if (!business) return;

    // Carry the organizer's current quiz settings forward without changing
    // an existing date, including cancelled or unpublished dates.
    const { rows: [template] } = await pool.query(
      `SELECT capacity, min_age, dress_code, contact_email, contact_phone, description_html
       FROM ev_events WHERE business_id = $1 AND slug LIKE 'quiz-session-%'
         AND status IN ('published', 'registration_closed', 'completed')
       ORDER BY starts_at DESC LIMIT 1`,
      [business.id],
    );

    const { rows: [venue] } = await pool.query(
      `SELECT id FROM ev_venues WHERE business_id = $1 AND name = 'Grandma Jazz' ORDER BY created_at LIMIT 1`,
      [business.id],
    );

    let inserted = 0;
    for (const startsAt of nextQuizStarts(4, now)) {
      const slug = `${QUIZ.slugPrefix}-${dateSlug(startsAt)}`;
      const { rowCount } = await pool.query(`SELECT 1 FROM ev_events WHERE slug = $1 LIMIT 1`, [slug]);
      if (rowCount) continue;

      const endsAt = new Date(startsAt.getTime() + QUIZ.durationMinutes * 60 * 1000);
      try {
        await pool.query(
          `INSERT INTO ev_events
            (business_id, venue_id, title, slug, subtitle, description_html, starts_at, ends_at,
             timezone, registration_opens_at, registration_closes_at, capacity,
             show_remaining_capacity, dress_code, min_age, faqs, contact_email, contact_phone,
             status, published_at, created_at, updated_at)
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12,
             true, $13, $14, '[]'::jsonb, $15, $16,
             'published', $17, $17, $17)`,
          [
            business.id,
            venue?.id ?? null,
            QUIZ.title,
            slug,
            QUIZ.subtitle,
            template?.description_html ?? QUIZ.descriptionHtml,
            startsAt,
            endsAt,
            QUIZ.timezone,
            now,
            startsAt,
            template?.capacity ?? QUIZ.capacity,
            template?.dress_code ?? QUIZ.dressCode,
            template?.min_age ?? QUIZ.minAge,
            template?.contact_email ?? QUIZ.contactEmail,
            template?.contact_phone ?? QUIZ.contactPhone,
            now,
          ],
        );
        inserted += 1;
      } catch (err: any) {
        if (err?.code !== "23505") throw err;
      }
    }
    if (inserted) console.log(`[events] created ${inserted} upcoming Quiz Session events`);
  } catch (err: any) {
    console.error("[events] recurring Quiz Session seed failed:", String(err?.message || err));
  }
}

let recurringTimer: NodeJS.Timeout | undefined;
export function startRecurringQuizWorker(): void {
  if (recurringTimer || process.env.EVENTS_AUTO_SEED_QUIZ === "0") return;
  recurringTimer = setInterval(() => { void ensureWeeklyQuizEvents(); }, 6 * 60 * 60 * 1000);
  recurringTimer.unref();
}
