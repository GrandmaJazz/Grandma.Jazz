import { Router } from "express";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db";
import { events, registrations, tickets, venues } from "@shared/events-schema";
import { rateLimit, sha256 } from "../security";
import { buildEventIcs, googleCalendarUrl } from "../ics";
import { htmlToText } from "../content";
import { eventsConfig } from "../config";
import { formatEventDateTime } from "../time";
import { appleWalletAvailable, generateApplePass, type WalletTicketData } from "../wallet/apple";
import { createGoogleSaveUrl, googleWalletAvailable } from "../wallet/google";
import { enqueueTicketResend } from "../emails";

/**
 * Secure public ticket access: /events/api/v1/t/{token}/...
 * The token is an unguessable HMAC-derived credential; only its SHA-256 is
 * stored. Responses carry no database ids and are never cacheable.
 */

async function loadByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db
    .select({ ticket: tickets, reg: registrations, event: events })
    .from(tickets)
    .innerJoin(registrations, eq(registrations.id, tickets.registrationId))
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(eq(tickets.tokenHash, sha256(token)))
    .limit(1);
  if (!row) return null;
  const [venue] = row.event.venueId
    ? await db.select().from(venues).where(eq(venues.id, row.event.venueId)).limit(1)
    : [null];
  return { ...row, venue: venue ?? null };
}

function noStore(res: import("express").Response) {
  res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.set("Referrer-Policy", "no-referrer");
}

export function ticketRouter(): Router {
  const r = Router();

  r.get("/:token", rateLimit("ticket-view", 30, 1), async (req, res, next) => {
    try {
      const bundle = await loadByToken(req.params.token);
      if (!bundle) {
        noStore(res);
        res.status(404).json({ error: "Ticket not found" });
        return;
      }
      const { ticket, reg, event, venue } = bundle;
      const qrContent = `${eventsConfig.publicUrl}/events/t/${req.params.token}`;
      const qrSvg = await QRCode.toString(qrContent, {
        type: "svg", errorCorrectionLevel: "M", margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      noStore(res);
      res.json({
        ticket: {
          reference: ticket.reference,
          status: event.status === "cancelled" ? "cancelled" : ticket.status,
          checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
          attendeeName: reg.fullName,
          registrationStatus: reg.status,
        },
        event: {
          title: event.title,
          subtitle: event.subtitle,
          slug: event.slug,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          timezone: event.timezone,
          whenText: formatEventDateTime(event.startsAt, event.timezone),
          status: event.status,
          minAge: event.minAge,
          dressCode: event.dressCode,
          contactEmail: event.contactEmail,
          contactPhone: event.contactPhone,
          heroImagePath: event.heroImagePath,
        },
        venue: venue ? {
          name: venue.name,
          addressLine1: venue.addressLine1,
          city: venue.city,
          country: venue.country,
          mapUrl: venue.mapUrl,
        } : null,
        qrSvg,
        calendar: {
          icsUrl: `${eventsConfig.base}/api/v1/t/${req.params.token}/calendar.ics`,
          googleUrl: googleCalendarUrl(event, venue),
        },
        emailAvailable: eventsConfig.emailMode === "resend",
        wallet: {
          apple: appleWalletAvailable() && ticket.status === "valid",
          google: googleWalletAvailable() && ticket.status === "valid",
        },
      });
    } catch (err) { next(err); }
  });

  r.get("/:token/calendar.ics", rateLimit("ticket-ics", 10, 1 / 6), async (req, res, next) => {
    try {
      const bundle = await loadByToken(req.params.token);
      if (!bundle) { noStore(res); res.status(404).send("Not found"); return; }
      const ics = buildEventIcs(bundle.event, bundle.venue, {
        cancelled: bundle.event.status === "cancelled",
        descriptionText: htmlToText(bundle.event.descriptionHtml).slice(0, 800),
      });
      noStore(res);
      res.set("Content-Type", "text/calendar; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="grandma-jazz-${bundle.event.slug}.ics"`);
      res.send(ics);
    } catch (err) { next(err); }
  });

  r.post("/:token/resend", rateLimit("ticket-resend", 3, 1 / 300), async (req, res, next) => {
    try {
      const bundle = await loadByToken(req.params.token);
      // generic response either way
      if (bundle && bundle.reg.status === "confirmed") {
        await enqueueTicketResend(bundle.reg.id);
      }
      noStore(res);
      res.json({ ok: true, message: "If this ticket is active, it has been emailed again." });
    } catch (err) { next(err); }
  });

  r.get("/:token/apple-wallet", rateLimit("wallet", 10, 1 / 30), async (req, res, next) => {
    try {
      if (!appleWalletAvailable()) {
        res.status(503).json({ error: "Apple Wallet is not available yet" });
        return;
      }
      const bundle = await loadByToken(req.params.token);
      if (!bundle || bundle.ticket.status !== "valid" || bundle.event.status === "cancelled") {
        noStore(res);
        res.status(404).json({ error: "Ticket not found or no longer valid" });
        return;
      }
      const { dynamicContentFor } = await import("../wallet/passUpdates");
      const data: WalletTicketData = {
        event: bundle.event,
        venue: bundle.venue,
        ticket: bundle.ticket,
        attendeeName: bundle.reg.fullName,
        qrContent: `${eventsConfig.publicUrl}/events/t/${req.params.token}`,
        dynamic: dynamicContentFor(bundle),
      };
      const pkpass = await generateApplePass(data);
      await db.update(tickets).set({ applePassSerial: bundle.ticket.id }).where(eq(tickets.id, bundle.ticket.id));
      noStore(res);
      res.set("Content-Type", "application/vnd.apple.pkpass");
      res.set("Content-Disposition", `attachment; filename="grandma-jazz-${bundle.ticket.reference}.pkpass"`);
      res.send(pkpass);
    } catch (err) { next(err); }
  });

  r.get("/:token/google-wallet", rateLimit("wallet", 10, 1 / 30), async (req, res, next) => {
    try {
      if (!googleWalletAvailable()) {
        res.status(503).json({ error: "Google Wallet is not available yet" });
        return;
      }
      const bundle = await loadByToken(req.params.token);
      if (!bundle || bundle.ticket.status !== "valid" || bundle.event.status === "cancelled") {
        noStore(res);
        res.status(404).json({ error: "Ticket not found or no longer valid" });
        return;
      }
      const saveUrl = await createGoogleSaveUrl({
        event: bundle.event,
        venue: bundle.venue,
        ticket: bundle.ticket,
        attendeeName: bundle.reg.fullName,
        qrContent: `${eventsConfig.publicUrl}/events/t/${req.params.token}`,
      });
      await db.update(tickets)
        .set({ googleObjectId: `gj_ticket_${bundle.ticket.id.replace(/-/g, "")}` })
        .where(eq(tickets.id, bundle.ticket.id));
      noStore(res);
      res.redirect(302, saveUrl);
    } catch (err) { next(err); }
  });

  return r;
}
