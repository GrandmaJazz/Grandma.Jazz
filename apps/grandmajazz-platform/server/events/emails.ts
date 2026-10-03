import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  emailOutbox, events, registrations, tickets, venues,
  type EmailTemplate, type EventRow, type Venue,
} from "@shared/events-schema";
import { eventsConfig } from "./config";
import { escapeHtml } from "./content";
import { ticketToken } from "./security";
import { formatEventDateTime } from "./time";

/**
 * Branded transactional emails for the events module.
 * Visual language mirrors the existing Grandma Jazz welcome email:
 * black panels, white Galvji-style type, wide tracking, and contrast-framed
 * logo/brick tiles so forced light/dark email clients keep the mark readable.
 */

const P_STYLE = `color: #ffffff; font-size: 16px; font-weight: 400; line-height: 1.8; margin: 0 0 20px 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.03em;`;
const SMALL_STYLE = `color: #999999; font-size: 12px; line-height: 1.6; margin: 0; font-family: 'Galvji', Georgia, serif; letter-spacing: 0.05em;`;

function brandShell(title: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      body { background: #000000 !important; background-color: #000000 !important; }
      .gj-logo-frame { background: #ffffff !important; background-color: #ffffff !important; }
      .gj-logo-inner { background: #000000 !important; background-color: #000000 !important; }
    }
    @media (prefers-color-scheme: light) {
      .gj-logo-frame { background: #ffffff !important; background-color: #ffffff !important; }
      .gj-logo-inner { background: #000000 !important; background-color: #000000 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #000000; font-family: 'Galvji', Georgia, serif;" bgcolor="#000000">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#000000" style="background:#000000;">
    <tr><td align="center" style="padding: 40px 20px;" bgcolor="#000000">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px;" bgcolor="#000000">
        <tr><td align="center" style="padding: 0 0 30px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="background:#ffffff; background-color:#ffffff;">
            <tr>
              <td class="gj-logo-frame" align="center" bgcolor="#ffffff" style="background:#ffffff; background-color:#ffffff; border:2px solid #000000; padding:6px;">
                <table role="presentation" cellspacing="0" cellpadding="0" bgcolor="#000000" style="background:#000000; background-color:#000000;">
                  <tr>
                    <td class="gj-logo-inner" align="center" bgcolor="#000000" style="background:#000000; background-color:#000000;">
                      <img src="${eventsConfig.publicUrl}/events/assets/logo.png" width="138" height="45" alt="Grandma Jazz"
                        style="display:block; width:138px; height:45px; border:0; outline:none;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding: 0 20px 10px 20px;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 300; letter-spacing: 0.15em; margin: 0; font-family: 'Galvji', Georgia, serif;">${escapeHtml(title)}</h1>
        </td></tr>
        ${bodyRows}
        <tr><td style="padding: 40px 20px 0 20px;" align="center">
          <p style="${SMALL_STYLE}">Grandma Jazz · Phuket · <a href="${eventsConfig.publicUrl}/events" style="color:#999999;">grandmajazz.com/events</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buttonRow(href: string, label: string): string {
  return `<tr><td align="center" style="padding: 10px 20px 20px 20px;">
    <a href="${escapeHtml(href)}" style="display:inline-block; border: 2px solid rgba(255,255,255,0.9); border-radius: 10px; background:#000000; color:#ffffff; text-decoration:none; padding: 12px 28px; font-family: 'Galvji', Georgia, serif; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase;">${escapeHtml(label)}</a>
  </td></tr>`;
}

function detailTile(rowsHtml: string): string {
  return `<tr><td style="padding: 20px;" align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 2px solid rgba(255,255,255,0.9); border-radius: 10px;">
      <tr><td style="padding: 24px 28px;">${rowsHtml}</td></tr>
    </table>
  </td></tr>`;
}

interface TicketEmailData {
  event: EventRow;
  venue: Venue | null;
  attendeeName: string;
  reference: string;
  token: string;
}

function ticketEmailBody(d: TicketEmailData, opening: string): { rows: string; text: string } {
  const ticketUrl = `${eventsConfig.publicUrl}/events/t/${d.token}`;
  const calendarUrl = `${ticketUrl}/calendar.ics`;
  const when = formatEventDateTime(d.event.startsAt, d.event.timezone);
  const where = d.venue
    ? [d.venue.name, d.venue.addressLine1, d.venue.city].filter(Boolean).join(", ")
    : "";
  const rows = `
    <tr><td style="padding: 20px 40px 0 40px;">
      <p style="${P_STYLE}">${escapeHtml(opening)}</p>
    </td></tr>
    ${detailTile(`
      <p style="${P_STYLE} margin-bottom: 8px;"><strong>${escapeHtml(d.event.title)}</strong></p>
      <p style="${P_STYLE} margin-bottom: 8px;">${escapeHtml(when)} (${escapeHtml(d.event.timezone)})</p>
      ${where ? `<p style="${P_STYLE} margin-bottom: 8px;">${escapeHtml(where)}</p>` : ""}
      <p style="${P_STYLE} margin-bottom: 0;">Ticket ${escapeHtml(d.reference)} · ${escapeHtml(d.attendeeName)}</p>
    `)}
    ${buttonRow(ticketUrl, "View your ticket")}
    <tr><td align="center" style="padding: 0 20px;">
      <p style="${SMALL_STYLE}">Your QR code is on the ticket page — show it at the door.<br>
      <a href="${escapeHtml(calendarUrl)}" style="color:#999999;">Add to calendar</a>${d.event.minAge ? ` · ${d.event.minAge}+ event` : ""}</p>
    </td></tr>`;
  const text = [
    opening, "",
    d.event.title,
    `${when} (${d.event.timezone})`,
    where,
    `Ticket ${d.reference} — ${d.attendeeName}`,
    "",
    `Your ticket & QR code: ${ticketUrl}`,
    `Add to calendar: ${calendarUrl}`,
    d.event.minAge ? `This is a ${d.event.minAge}+ event.` : "",
    "", "Grandma Jazz · grandmajazz.com/events",
  ].filter((l) => l !== null).join("\n");
  return { rows, text };
}

// --------------------------------------------------------------- enqueueing

async function enqueue(row: {
  template: EmailTemplate;
  recipient: string;
  subject: string;
  html: string;
  textBody: string;
  businessId?: string | null;
  eventId?: string | null;
  registrationId?: string | null;
  ticketId?: string | null;
  dedupeKey?: string | null;
}): Promise<void> {
  await db.insert(emailOutbox)
    .values({ ...row, status: "pending" })
    .onConflictDoNothing({ target: emailOutbox.dedupeKey });
}

async function loadTicketBundle(registrationId: string) {
  const [row] = await db
    .select({ reg: registrations, ticket: tickets, event: events })
    .from(registrations)
    .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(registrations.id, registrationId))
    .limit(1);
  if (!row) return null;
  const [venue] = row.event.venueId
    ? await db.select().from(venues).where(eq(venues.id, row.event.venueId)).limit(1)
    : [null];
  return { ...row, venue: venue ?? null };
}

export async function enqueueRegistrationConfirmation(registrationId: string): Promise<void> {
  const bundle = await loadTicketBundle(registrationId);
  if (!bundle || bundle.reg.status !== "confirmed") return;
  const data: TicketEmailData = {
    event: bundle.event,
    venue: bundle.venue,
    attendeeName: bundle.reg.fullName,
    reference: bundle.ticket.reference,
    token: ticketToken(bundle.ticket.id),
  };
  const { rows, text } = ticketEmailBody(
    data,
    `Hello ${bundle.reg.fullName}, you're on the list. Here is your ticket, my dear.`,
  );
  await enqueue({
    template: "registration_confirmation",
    recipient: bundle.reg.email,
    subject: `Your ticket — ${bundle.event.title}`,
    html: brandShell("You're coming to the show", rows),
    textBody: text,
    businessId: bundle.reg.businessId,
    eventId: bundle.event.id,
    registrationId,
    ticketId: bundle.ticket.id,
    // exactly one confirmation per registration, even across retries
    dedupeKey: `confirmation:${registrationId}`,
  });
}

export async function enqueueTicketResend(registrationId: string): Promise<void> {
  const bundle = await loadTicketBundle(registrationId);
  if (!bundle || bundle.reg.status !== "confirmed" || bundle.ticket.status !== "valid") return;
  const data: TicketEmailData = {
    event: bundle.event,
    venue: bundle.venue,
    attendeeName: bundle.reg.fullName,
    reference: bundle.ticket.reference,
    token: ticketToken(bundle.ticket.id),
  };
  const { rows, text } = ticketEmailBody(data, `Hello ${bundle.reg.fullName}, here is your ticket again.`);
  await enqueue({
    template: "ticket_resend",
    recipient: bundle.reg.email,
    subject: `Your ticket — ${bundle.event.title}`,
    html: brandShell("Your ticket", rows),
    textBody: text,
    businessId: bundle.reg.businessId,
    eventId: bundle.event.id,
    registrationId,
    ticketId: bundle.ticket.id,
    // at most one resend per registration per hour (dedupe window)
    dedupeKey: `resend:${registrationId}:${new Date().toISOString().slice(0, 13)}`,
  });
}

export async function enqueueRegistrationCancellation(registrationId: string): Promise<void> {
  const bundle = await loadTicketBundle(registrationId);
  if (!bundle) return;
  const when = formatEventDateTime(bundle.event.startsAt, bundle.event.timezone);
  const rows = `
    <tr><td style="padding: 20px 40px 0 40px;">
      <p style="${P_STYLE}">Hello ${escapeHtml(bundle.reg.fullName)},</p>
      <p style="${P_STYLE}">Your registration for <strong>${escapeHtml(bundle.event.title)}</strong> (${escapeHtml(when)}) has been cancelled. Ticket ${escapeHtml(bundle.ticket.reference)} is no longer valid.</p>
      <p style="${P_STYLE}">If this wasn't expected, just reply to this email.</p>
    </td></tr>`;
  const text = `Hello ${bundle.reg.fullName},\n\nYour registration for ${bundle.event.title} (${when}) has been cancelled. Ticket ${bundle.ticket.reference} is no longer valid.\n\nIf this wasn't expected, reply to this email.`;
  await enqueue({
    template: "registration_cancellation",
    recipient: bundle.reg.email,
    subject: `Registration cancelled — ${bundle.event.title}`,
    html: brandShell("Registration cancelled", rows),
    textBody: text,
    businessId: bundle.reg.businessId,
    eventId: bundle.event.id,
    registrationId,
    ticketId: bundle.ticket.id,
    dedupeKey: `regcancel:${registrationId}:${bundle.reg.cancelledAt?.toISOString() ?? "now"}`,
  });
}

/** Event update / cancellation notice to every active registration. */
export async function enqueueEventNotice(opts: {
  eventId: string;
  kind: "event_update" | "event_cancellation" | "event_reminder";
  changeSummary?: string;
  batchId: string; // organizer-confirmed send batch — makes bulk sends idempotent
}): Promise<number> {
  const [event] = await db.select().from(events).where(eq(events.id, opts.eventId)).limit(1);
  if (!event) return 0;
  const [venue] = event.venueId
    ? await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1)
    : [null];
  const regs = await db
    .select({ reg: registrations, ticket: tickets })
    .from(registrations)
    .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
    .where(and(eq(registrations.eventId, opts.eventId), eq(registrations.status, "confirmed")));

  const when = formatEventDateTime(event.startsAt, event.timezone);
  let count = 0;
  for (const { reg, ticket } of regs) {
    const ticketUrl = `${eventsConfig.publicUrl}/events/t/${ticketToken(ticket.id)}`;
    let title: string, subject: string, lead: string;
    if (opts.kind === "event_cancellation") {
      title = "Event cancelled";
      subject = `Cancelled — ${event.title}`;
      lead = `We're sorry — <strong>${escapeHtml(event.title)}</strong> (${escapeHtml(when)}) has been cancelled. Your ticket is no longer valid.`;
    } else if (opts.kind === "event_update") {
      title = "Event update";
      subject = `Update — ${event.title}`;
      lead = `Details for <strong>${escapeHtml(event.title)}</strong> have changed.${opts.changeSummary ? `<br><br>${escapeHtml(opts.changeSummary)}` : ""}<br><br>It now takes place ${escapeHtml(when)} (${escapeHtml(event.timezone)}).`;
    } else {
      title = "See you soon";
      subject = `Reminder — ${event.title}`;
      lead = `A friendly reminder: <strong>${escapeHtml(event.title)}</strong> is ${escapeHtml(when)} (${escapeHtml(event.timezone)}).`;
    }
    const rows = `
      <tr><td style="padding: 20px 40px 0 40px;">
        <p style="${P_STYLE}">Hello ${escapeHtml(reg.fullName)},</p>
        <p style="${P_STYLE}">${lead}</p>
      </td></tr>
      ${opts.kind === "event_cancellation" ? "" : buttonRow(ticketUrl, "View your ticket")}`;
    const textLead = lead.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
    const text = `Hello ${reg.fullName},\n\n${textLead}${opts.kind === "event_cancellation" ? "" : `\n\nYour ticket: ${ticketUrl}`}`;
    await enqueue({
      template: opts.kind,
      recipient: reg.email,
      subject,
      html: brandShell(title, rows),
      textBody: text,
      businessId: reg.businessId,
      eventId: event.id,
      registrationId: reg.id,
      ticketId: ticket.id,
      dedupeKey: `${opts.kind}:${opts.batchId}:${reg.id}`,
    });
    count++;
  }
  return count;
}

export async function enqueueAccountEmail(opts: {
  template: "organizer_invitation" | "password_reset";
  recipient: string;
  recipientName: string;
  actionUrl: string;
  businessName?: string;
  dedupeKey?: string;
}): Promise<void> {
  const isInvite = opts.template === "organizer_invitation";
  const title = isInvite ? "You're invited" : "Reset your password";
  const lead = isInvite
    ? `You've been invited to help run ${escapeHtml(opts.businessName || "Grandma Jazz")} events. Set up your account to get started. This link is valid for 7 days.`
    : `We received a request to reset your password. This link is valid for 2 hours. If you didn't ask for this, you can ignore this email.`;
  const rows = `
    <tr><td style="padding: 20px 40px 0 40px;">
      <p style="${P_STYLE}">Hello ${escapeHtml(opts.recipientName)},</p>
      <p style="${P_STYLE}">${lead}</p>
    </td></tr>
    ${buttonRow(opts.actionUrl, isInvite ? "Accept invitation" : "Reset password")}`;
  const text = `Hello ${opts.recipientName},\n\n${lead.replace(/<[^>]+>/g, "")}\n\n${opts.actionUrl}`;
  await enqueue({
    template: opts.template,
    recipient: opts.recipient,
    subject: isInvite ? `Invitation — ${opts.businessName || "Grandma Jazz"} events` : "Reset your password — Grandma Jazz events",
    html: brandShell(title, rows),
    textBody: text,
    dedupeKey: opts.dedupeKey ?? null,
  });
}
