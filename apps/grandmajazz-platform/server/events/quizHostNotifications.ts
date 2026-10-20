import type { PoolClient } from 'pg';
import { pool } from '../db';
import { familyTileUrl } from '../familyEmailIdentity';
import { indexFamilyIdentities, normalizeFamilyEmail } from './familyIdentity';
import { escapeHtml } from './content';
import { eventsConfig } from './config';
import { formatEventDateTime } from './time';

export const QUIZ_HOST_TEMPLATES = ['quiz_host_signup', 'quiz_host_roster'] as const;
export function quizHostConfig() {
  const mode = process.env.QUIZ_HOST_EMAIL_MODE || 'disabled';
  const recipient = (process.env.QUIZ_HOST_EMAIL_TO || '').trim();
  return { mode: ['smtp', 'capture'].includes(mode) ? mode : 'disabled', recipient,
    enabled: ['smtp', 'capture'].includes(mode) && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(recipient) };
}

type FamilyRow = { id: string; title: string; name: string; email: string; createdAt?: Date | string | null };
export function exactFamilyIdentity(email: string, members: FamilyRow[]) {
  return indexFamilyIdentities(members).get(normalizeFamilyEmail(email)) ?? null;
}

type Guest = { full_name: string; email: string; reference: string };
type Quiz = { id: string; business_id: string; title: string; slug: string; starts_at: Date; timezone: string };
export function renderQuizHostEmail(quiz: Quiz, guests: Guest[], members: FamilyRow[], roster: boolean, snapshotAt = new Date()) {
  const when = formatEventDateTime(new Date(quiz.starts_at), quiz.timezone);
  const heading = roster ? 'Your Saturday guest list' : 'Someone is joining the quiz';
  const names = guests.map(guest => {
    const family = exactFamilyIdentity(guest.email, members);
    const name = family?.displayName || guest.full_name;
    return { guest, family, name };
  });
  const count = roster ? `${guests.length} confirmed ${guests.length === 1 ? 'attendee' : 'attendees'}` : 'New confirmed booking';
  const body = names.map(({ guest, family, name }) => `<tr><td align="center" style="padding:12px 16px;">
    ${family ? `<img src="${escapeHtml(familyTileUrl(family.title, family.name))}" width="280" alt="${escapeHtml(name)}" style="display:block;width:100%;max-width:280px;height:auto;border:0;background:#000;" />` : `<p style="margin:0;color:#fff;font-size:20px;">${escapeHtml(name)}</p>`}
    <p style="color:#B49B73;font-size:12px;margin:8px 0 0;">Booking ${escapeHtml(guest.reference)}</p></td></tr>`).join('');
  const snapshot = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}).format(snapshotAt);
  const note = roster ? `Confirmed bookings as of ${snapshot} Bangkok time. Later signups arrive as separate notifications; cancellations after this snapshot appear in the live host list.` : 'This booking is confirmed. The Saturday 11:00 am email will include the complete current attendee list and total.';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body bgcolor="#000000" style="margin:0;background:#000;color:#fff;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#000000"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
    <tr><td align="center" style="padding:12px;"><img src="${escapeHtml(eventsConfig.publicUrl)}/events/assets/logo.png" width="184" alt="Grandma Jazz" style="display:block;width:184px;height:auto;" /></td></tr>
    <tr><td align="center" style="padding:16px;"><h1 style="font-size:24px;font-weight:400;margin:0 0 16px;">${heading}</h1><p style="color:#B49B73;margin:0 0 12px;">${escapeHtml(quiz.title)} · ${escapeHtml(when)}</p><p style="font-size:20px;margin:0;">${count}</p></td></tr>
    ${body || '<tr><td align="center" style="padding:20px;color:#B49B73;">No confirmed bookings yet.</td></tr>'}
    <tr><td align="center" style="padding:24px 16px;"><p style="color:#B49B73;font-size:13px;line-height:1.7;">${note}</p><a href="${escapeHtml(eventsConfig.publicUrl)}/events/manage/events/${escapeHtml(quiz.id)}/attendees" style="display:inline-block;background:#000;color:#B49B73;border:1.5px solid #777;border-radius:7.5px;padding:12px 20px;letter-spacing:2px;text-decoration:none;font-size:13px;">Open live host list</a></td></tr>
    </table></td></tr></table></body></html>`;
  return { subject: roster ? `Saturday quiz — ${count}` : `Quiz booking — ${(names[0]?.name || 'new attendee').replace(/[\r\n\x00-\x1f\x7f]/g,' ').slice(0,120)}`,
    html, text: [heading, quiz.title, when, count, '', ...names.map(({ guest, name }) => `${name} — ${guest.reference}`), '', note, `${eventsConfig.publicUrl}/events/manage/events/${quiz.id}/attendees`].join('\n') };
}

async function familyRows(client: PoolClient): Promise<FamilyRow[]> {
  // A stale/missing Family table must not make booking fail. A savepoint also
  // recovers the transaction after an optional lookup failure.
  await client.query('SAVEPOINT quiz_family_lookup');
  try {
    const result = await client.query(`SELECT f.id, f.title, f.name, f.email, f.created_at AS "createdAt" FROM family_members f
      LEFT JOIN family_member_moderation m ON m.member_id = f.id WHERE m.member_id IS NULL`);
    await client.query('RELEASE SAVEPOINT quiz_family_lookup');
    return result.rows;
  } catch {
    await client.query('ROLLBACK TO SAVEPOINT quiz_family_lookup');
    await client.query('RELEASE SAVEPOINT quiz_family_lookup');
    return [];
  }
}

async function enqueue(client: PoolClient, quiz: Quiz, guests: Guest[], roster: boolean, key: string, registrationId?: string, snapshotAt = new Date()) {
  const config = quizHostConfig();
  if (!config.enabled) return;
  const message = renderQuizHostEmail(quiz, guests, await familyRows(client), roster, snapshotAt);
  await client.query(`INSERT INTO ev_email_outbox
    (business_id,event_id,registration_id,template,recipient,subject,html,text_body,dedupe_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (dedupe_key) DO NOTHING`,
    [quiz.business_id,quiz.id,registrationId || null,roster ? 'quiz_host_roster' : 'quiz_host_signup',config.recipient,message.subject,message.html,message.text,key]);
}

/** Called inside the registration transaction: a retry cannot lose or duplicate its alert. */
export async function enqueueQuizHostSignup(client: PoolClient, registrationId: string) {
  if (!quizHostConfig().enabled) return;
  const { rows: [row] } = await client.query(`SELECT e.id,e.business_id,e.title,e.slug,e.starts_at,e.timezone,
    r.full_name,r.email,t.reference FROM ev_registrations r JOIN ev_events e ON e.id=r.event_id
    JOIN ev_businesses b ON b.id=e.business_id AND b.slug='grandma-jazz'
    JOIN ev_tickets t ON t.registration_id=r.id WHERE r.id=$1 AND r.status='confirmed' AND t.status='valid'`, [registrationId]);
  if (!row || !/^quiz-session-\d{4}-\d{2}-\d{2}$/.test(row.slug)) return;
  await enqueue(client,row,[row],false,`quiz-host-signup:${registrationId}`,registrationId);
}

export function saturdayRosterDate(now: Date): string | null {
  const local = new Date(+now + 7 * 60 * 60 * 1000);
  return local.getUTCDay() === 6 && local.getUTCHours() >= 11 ? local.toISOString().slice(0,10) : null;
}

export async function enqueueSaturdayQuizRosters(now = new Date()) {
  const date = saturdayRosterDate(now);
  if (!quizHostConfig().enabled || !date) return 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const { rows: quizzes } = await client.query(`SELECT e.id,e.business_id,e.title,e.slug,e.starts_at,e.timezone FROM ev_events e
      JOIN ev_businesses b ON b.id=e.business_id AND b.slug='grandma-jazz'
      WHERE e.status='published' AND e.slug=$1 AND e.starts_at>$2`, [`quiz-session-${date}`,now]);
    for (const quiz of quizzes) {
      const { rows: guests } = await client.query(`SELECT r.full_name,r.email,t.reference FROM ev_registrations r
        JOIN ev_tickets t ON t.registration_id=r.id WHERE r.event_id=$1 AND r.status='confirmed' AND t.status='valid'
        ORDER BY r.created_at,r.id`, [quiz.id]);
      await enqueue(client,quiz,guests,true,`quiz-host-roster:${quiz.id}:${date}`,undefined,now);
    }
    await client.query('COMMIT');
    return quizzes.length;
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
  finally { client.release(); }
}

let timer: NodeJS.Timeout | null = null;
export function startQuizHostWorker() {
  if (timer || !quizHostConfig().enabled) return;
  const tick = () => void enqueueSaturdayQuizRosters().catch(()=>console.error('[quiz-host] roster enqueue failed'));
  tick(); // Catch up on a Saturday restart, without sending a past event's list.
  timer = setInterval(tick,60_000); timer.unref?.();
}
export function stopQuizHostWorker() { if (timer) clearInterval(timer); timer = null; }
