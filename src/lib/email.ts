// src/lib/email.ts
// Transactional email via Resend + audience sync via Mailchimp.
// Reuses the same credentials your .store site already uses — set these in env:
//   RESEND_API_KEY            (Resend)
//   EMAIL_FROM                e.g. "Grandma Jazz <hello@grandmajazz.com>"
//   MAILCHIMP_API_KEY         (Mailchimp) — format: key-usXX (dc suffix)
//   MAILCHIMP_AUDIENCE_ID     the list/audience id
//   MAILCHIMP_SERVER_PREFIX   optional; derived from the API key if omitted (e.g. "us21")
//
// All functions are best-effort and never throw to the caller — email/sync
// failures are logged but must not break a family signup or a ticket purchase.

import { Resend } from 'resend';
import crypto from 'node:crypto';

const FROM = process.env.EMAIL_FROM || 'Grandma Jazz <hello@grandmajazz.com>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping send');
    return null;
  }
  return new Resend(key);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      })),
    });
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}

/**
 * Upsert a contact into the Mailchimp audience (idempotent).
 * Uses the members PUT endpoint keyed by the md5 of the lowercased email.
 */
export async function syncToMailchimp(
  email: string,
  mergeFields: Record<string, string> = {},
  tags: string[] = [],
): Promise<boolean> {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.warn('[email] Mailchimp not configured — skipping sync');
    return false;
  }
  const dc = process.env.MAILCHIMP_SERVER_PREFIX || apiKey.split('-')[1];
  if (!dc) {
    console.warn('[email] Mailchimp server prefix missing');
    return false;
  }

  const subscriberHash = crypto
    .createHash('md5')
    .update(email.toLowerCase())
    .digest('hex');

  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: mergeFields,
        tags,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[email] Mailchimp sync failed', res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Mailchimp sync error', err);
    return false;
  }
}

// ---------- Templates ----------

const shell = (inner: string) => `
  <div style="background:#0A0A0A;padding:32px 0;font-family:Roboto,Arial,sans-serif;color:#e3dcd4;">
    <div style="max-width:520px;margin:0 auto;background:#141414;border:1px solid rgba(184,140,65,0.25);border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(184,140,65,0.2);">
        <div style="font-size:20px;letter-spacing:2px;color:#b88c41;text-transform:uppercase;">Grandma Jazz</div>
      </div>
      <div style="padding:28px 32px;line-height:1.6;font-size:15px;">${inner}</div>
      <div style="padding:20px 32px;border-top:1px solid rgba(184,140,65,0.2);font-size:12px;color:#8a847c;">
        Grandma Jazz · Kamala, Phuket · <a style="color:#b88c41;" href="https://grandmajazz.com">grandmajazz.com</a>
      </div>
    </div>
  </div>`;

export function familyWelcomeHtml(name: string, title: string): string {
  return shell(`
    <h1 style="color:#e3dcd4;font-size:22px;margin:0 0 12px;">Welcome to the family, ${escapeHtml(title)} ${escapeHtml(name)}.</h1>
    <p>Your brick is on the wall. You're part of Grandma Jazz now — expect the occasional note about live nights, quiz sessions, and the good stuff.</p>
    <p style="margin-top:20px;">
      <a href="https://grandmajazz.com/family" style="display:inline-block;background:#b88c41;color:#0A0A0A;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">See the wall</a>
    </p>`);
}

export function ticketEmailHtml(opts: {
  eventTitle: string;
  dateLabel: string;
  ticketNumber: string;
  attendeeName: string;
}): string {
  return shell(`
    <h1 style="color:#e3dcd4;font-size:22px;margin:0 0 12px;">You're booked in.</h1>
    <p><strong style="color:#b88c41;">${escapeHtml(opts.eventTitle)}</strong><br/>${escapeHtml(opts.dateLabel)}</p>
    <p>Ticket <strong>#${escapeHtml(opts.ticketNumber)}</strong> · ${escapeHtml(opts.attendeeName)}</p>
    <p>Your Apple Wallet pass is attached — tap it on your iPhone to add it. See you at Grandma Jazz.</p>`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
