import { FAMILY_OWNER_TEMPLATE, FAMILY_OWNER_RECIPIENT, familyOwnerAlertsEnabled } from "../familyOwnerNotifications";
import { Resend } from "resend";
import { pool } from "../db";
import { eventsConfig } from "./config";
import { QUIZ_HOST_TEMPLATES, quizHostConfig } from "./quizHostNotifications";
import { HostDeliveryUncertain, sendQuizHostSmtp, sendFamilyOwnerSmtp } from "./quizHostSmtp";

/**
 * Database-backed outbox worker. Runs inside the existing single PM2 process
 * (no new service). Claims due rows with FOR UPDATE SKIP LOCKED so a second
 * process (if ever added) cannot double-send. Bounded retries with
 * exponential backoff; permanent failure after MAX_ATTEMPTS.
 *
 * EVENTS_EMAIL_MODE:
 *   resend   — deliver via the existing Resend account
 *   capture  — mark rows as sent without delivering (dev/test)
 *   disabled — leave rows pending (nothing leaves the box)
 */

const MAX_ATTEMPTS = 5;
const BATCH = 10;
const SEND_TIMEOUT_MS = 15_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startOutboxWorker(): void {
  if (timer) return;
  timer = setInterval(() => {
    void drainOutbox().catch((err) => console.error("[events][outbox] tick failed:", err));
  }, eventsConfig.outboxIntervalMs);
  timer.unref?.();
  console.log(`[events] outbox worker started (mode=${eventsConfig.emailMode}, interval=${eventsConfig.outboxIntervalMs}ms)`);
}

export function stopOutboxWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Process due outbox rows once. Exported for tests and manual draining. */
export async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  if (running || (eventsConfig.emailMode === "disabled" && !quizHostConfig().enabled && !familyOwnerAlertsEnabled())) return { sent: 0, failed: 0 };
  running = true;
  let sent = 0, failed = 0;
  try {
    // SMTP has no provider idempotency key. A crashed/uncertain send is held
    // for reconciliation rather than risking a duplicate accepted message.
    if (quizHostConfig().enabled || familyOwnerAlertsEnabled()) await pool.query(`UPDATE ev_email_outbox SET status='failed', attempts=$1,
      last_error='Host SMTP delivery uncertain after restart; inspect Sent before retrying'
      WHERE template IN ('quiz_host_signup','quiz_host_roster','family_owner_join') AND status='sending'
      AND next_attempt_at < now() - interval '10 minutes'`, [MAX_ATTEMPTS]);
    for (;;) {
      const client = await pool.connect();
      let row: any;
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `SELECT id, template, recipient, subject, html, text_body, attempts
             FROM ev_email_outbox
            WHERE status IN ('pending','failed') AND attempts < $1 AND next_attempt_at <= now()
              AND (($2 AND template NOT IN ('quiz_host_signup','quiz_host_roster','family_owner_join'))
                OR ($3 AND template IN ('quiz_host_signup','quiz_host_roster'))
                OR ($4 AND template = 'family_owner_join'))
            ORDER BY next_attempt_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED`,
          [MAX_ATTEMPTS, eventsConfig.emailMode !== "disabled", quizHostConfig().enabled, familyOwnerAlertsEnabled()],
        );
        row = rows[0];
        if (row) {
          await client.query(`UPDATE ev_email_outbox SET status = 'sending', attempts = attempts + 1, next_attempt_at = now() WHERE id = $1`, [row.id]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
      if (!row) break;

      try {
        const messageId = await deliver(row);
        await pool.query(
          `UPDATE ev_email_outbox SET status = 'sent', sent_at = now(), provider_message_id = $2, last_error = NULL WHERE id = $1`,
          [row.id, messageId],
        );
        sent++;
      } catch (err: any) {
        const attempts = err instanceof HostDeliveryUncertain ? MAX_ATTEMPTS : row.attempts + 1;
        const backoffMinutes = Math.min(2 ** attempts, 60); // 2,4,8,16,32 min
        const message = redactError(err);
        await pool.query(
          `UPDATE ev_email_outbox
              SET status = 'failed', last_error = $2, attempts = $4,
                  next_attempt_at = now() + ($3 || ' minutes')::interval
            WHERE id = $1`,
          [row.id, message, String(backoffMinutes), attempts],
        );
        console.error(`[events][outbox] send failed (attempt ${attempts}/${MAX_ATTEMPTS}) for ${row.id}: ${message}`);
        failed++;
      }
      if (sent + failed >= BATCH) break;
    }
  } finally {
    running = false;
  }
  return { sent, failed };
}

export async function deliver(row: { id: string; template: string; recipient: string; subject: string; html: string; text_body: string }): Promise<string | null> {
  if (row.template === FAMILY_OWNER_TEMPLATE) {
    if (!familyOwnerAlertsEnabled() || row.recipient !== FAMILY_OWNER_RECIPIENT) throw new Error("Family owner notification is not configured");
    return sendFamilyOwnerSmtp(row);
  }
  if ((QUIZ_HOST_TEMPLATES as readonly string[]).includes(row.template)) {
    const host = quizHostConfig();
    if (!host.enabled || row.recipient !== host.recipient) throw new Error('Host notification recipient is not configured');
    if (host.mode === 'capture') return `captured-host-${row.id}`;
    return sendQuizHostSmtp(row);
  }
  if (eventsConfig.emailMode === "capture") return `captured-${Date.now()}`;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing while EVENTS_EMAIL_MODE=resend");
  const resend = new Resend(apiKey);
  const result = await withTimeout(
    resend.emails.send({
      from: eventsConfig.emailFrom,
      to: row.recipient,
      subject: row.subject,
      html: row.html,
      text: row.text_body,
    }),
    SEND_TIMEOUT_MS,
  );
  if (result.error) throw new Error(result.error.message);
  return result.data?.id ?? null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`email send timed out after ${ms}ms`)), ms).unref?.()),
  ]);
}

/** Keep provider errors, drop anything that could contain credentials. */
function redactError(err: any): string {
  const msg = String(err?.message || err || "unknown error").slice(0, 500);
  return msg.replace(/re_[A-Za-z0-9_]+/g, "re_***");
}
