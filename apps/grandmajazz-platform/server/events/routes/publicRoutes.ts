import { Router } from "express";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { events, registrations, tickets, venues } from "@shared/events-schema";
import { rateLimit } from "../security";
import { registerAttendee } from "../registrationService";
import { enqueueTicketResend } from "../emails";
import { eventsConfig } from "../config";

/**
 * Public (unauthenticated) API: event listing/detail, registration, resend.
 * Never exposes draft/archived events, attendee data, or database internals.
 */

const PUBLIC_STATUSES = ["published", "registration_closed", "cancelled", "completed"] as const;

export function publicRouter(): Router {
  const r = Router();

  r.get("/events", async (_req, res, next) => {
    try {
      const rows = await db
        .select({ event: events, venue: venues })
        .from(events)
        .leftJoin(venues, eq(venues.id, events.venueId))
        .where(and(
          inArray(events.status, ["published", "registration_closed"]),
          gte(events.endsAt, new Date()),
        ))
        .orderBy(asc(events.startsAt));
      const counts = await confirmedCounts(rows.map((row) => row.event.id));
      res.set("Cache-Control", "public, max-age=60");
      res.json({ events: rows.map(({ event, venue }) => publicEventSummary(event, venue, counts.get(event.id) ?? 0)) });
    } catch (err) { next(err); }
  });

  r.get("/events/:slug", async (req, res, next) => {
    try {
      let [row] = await db
        .select({ event: events, venue: venues })
        .from(events)
        .leftJoin(venues, eq(venues.id, events.venueId))
        .where(and(eq(events.slug, req.params.slug), inArray(events.status, [...PUBLIC_STATUSES])))
        .limit(1);
      if (!row) {
        // authorized draft preview: an organizer of the owning business may view
        const preview = await draftForOrganizer(req, req.params.slug);
        if (preview) {
          res.set("Cache-Control", "private, no-store");
          res.json({ event: publicEventDetail(preview.event, preview.venue, 0), preview: true });
          return;
        }
        res.status(404).json({ error: "Event not found" });
        return;
      }
      const counts = await confirmedCounts([row.event.id]);
      res.set("Cache-Control", "public, max-age=30");
      res.json({ event: publicEventDetail(row.event, row.venue, counts.get(row.event.id) ?? 0) });
    } catch (err) { next(err); }
  });

  r.post("/events/:slug/register", rateLimit("register", 8, 1 / 20), async (req, res, next) => {
    try {
      const [event] = await db.select().from(events)
        .where(and(eq(events.slug, req.params.slug), eq(events.status, "published"))).limit(1);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      // Honeypot: bots fill every field; humans never see this one.
      if (String(req.body?.website || "").trim() !== "") {
        res.status(400).json({ error: "Registration could not be processed" });
        return;
      }
      const result = await registerAttendee({
        eventId: event.id,
        fullName: String(req.body?.fullName || ""),
        email: String(req.body?.email || ""),
        phone: String(req.body?.phone || ""),
        notes: String(req.body?.notes || "").slice(0, 2000) || undefined,
        ageConfirmed: Boolean(req.body?.ageConfirmed),
        termsAccepted: Boolean(req.body?.termsAccepted),
        marketingConsent: Boolean(req.body?.marketingConsent),
        idempotencyKey: sanitizeIdempotencyKey(req.body?.idempotencyKey),
        source: "public",
      });
      if (!result.ok) {
        const status = result.code === "full" || result.code === "duplicate_email" ? 409
          : result.code === "invalid" ? 400 : 403;
        res.status(status).json({ error: result.message, code: result.code });
        return;
      }
      res.status(201).json({
        ticketToken: result.ticketToken,
        ticketReference: result.ticketReference,
        duplicate: result.duplicate,
      });
    } catch (err) { next(err); }
  });

  // Resend the ticket for an event+email pair. Response never reveals whether
  // the registration exists.
  r.post("/events/:slug/resend-ticket", rateLimit("resend", 5, 1 / 120), async (req, res, next) => {
    try {
      const generic = { ok: true, message: "If a registration exists for that email, the ticket has been resent." };
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email) { res.json(generic); return; }
      const [event] = await db.select({ id: events.id }).from(events)
        .where(eq(events.slug, req.params.slug)).limit(1);
      if (event) {
        const [reg] = await db.select({ id: registrations.id }).from(registrations)
          .where(and(
            eq(registrations.eventId, event.id),
            eq(registrations.emailNormalized, email),
            eq(registrations.status, "confirmed"),
          )).limit(1);
        if (reg) await enqueueTicketResend(reg.id);
      }
      res.json(generic);
    } catch (err) { next(err); }
  });

  r.get("/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ok", module: "events" });
    } catch {
      res.status(503).json({ status: "degraded", module: "events" });
    }
  });

  return r;
}

/** Draft/archived events are visible only to active staff of the owning business. */
async function draftForOrganizer(req: import("express").Request, slug: string) {
  const userId = req.session?.userId;
  if (!userId) return null;
  const [row] = await db
    .select({ event: events, venue: venues })
    .from(events)
    .leftJoin(venues, eq(venues.id, events.venueId))
    .where(eq(events.slug, slug))
    .limit(1);
  if (!row) return null;
  const { businessMemberships } = await import("@shared/events-schema");
  const [membership] = await db.select({ id: businessMemberships.id })
    .from(businessMemberships)
    .where(and(
      eq(businessMemberships.userId, userId),
      eq(businessMemberships.businessId, row.event.businessId),
      eq(businessMemberships.status, "active"),
    ))
    .limit(1);
  return membership ? row : null;
}

async function confirmedCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const rows = await db
    .select({ eventId: registrations.eventId, count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(inArray(registrations.eventId, eventIds), eq(registrations.status, "confirmed")))
    .groupBy(registrations.eventId);
  return new Map(rows.map((r) => [r.eventId, r.count]));
}

export type RegistrationState =
  | "not_yet_open" | "open" | "limited" | "full" | "closed" | "cancelled" | "completed";

export function registrationState(event: typeof events.$inferSelect, confirmed: number): {
  state: RegistrationState;
  remaining: number | null;
} {
  const now = new Date();
  const remaining = event.capacity == null ? null : Math.max(0, event.capacity - confirmed);
  if (event.status === "cancelled") return { state: "cancelled", remaining };
  if (event.status === "completed" || now > event.endsAt) return { state: "completed", remaining };
  if (event.status === "registration_closed") return { state: "closed", remaining };
  if (event.status !== "published") return { state: "closed", remaining };
  if (event.registrationOpensAt && now < event.registrationOpensAt) return { state: "not_yet_open", remaining };
  if ((event.registrationClosesAt && now > event.registrationClosesAt) || now > event.startsAt) {
    return { state: "closed", remaining };
  }
  if (remaining !== null && remaining <= 0) return { state: "full", remaining: 0 };
  if (remaining !== null && event.capacity != null && remaining <= Math.max(3, Math.ceil(event.capacity * 0.1))) {
    return { state: "limited", remaining };
  }
  return { state: "open", remaining };
}

function publicVenue(venue: typeof venues.$inferSelect | null) {
  if (!venue) return null;
  return {
    name: venue.name,
    addressLine1: venue.addressLine1,
    addressLine2: venue.addressLine2,
    city: venue.city,
    country: venue.country,
    mapUrl: venue.mapUrl,
    latitude: venue.latitude,
    longitude: venue.longitude,
    accessibilityNotes: venue.accessibilityNotes,
  };
}

function publicEventSummary(event: typeof events.$inferSelect, venue: typeof venues.$inferSelect | null, confirmed: number) {
  const reg = registrationState(event, confirmed);
  return {
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle,
    heroImagePath: event.heroImagePath,
    heroImageAlt: event.heroImageAlt,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    venueName: venue?.name ?? null,
    city: venue?.city ?? null,
    status: event.status,
    registration: {
      state: reg.state,
      remaining: event.showRemainingCapacity ? reg.remaining : null,
    },
  };
}

function publicEventDetail(event: typeof events.$inferSelect, venue: typeof venues.$inferSelect | null, confirmed: number) {
  const reg = registrationState(event, confirmed);
  return {
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle,
    descriptionHtml: event.descriptionHtml, // sanitized at write time
    heroImagePath: event.heroImagePath,
    heroImageAlt: event.heroImageAlt,
    gallery: event.gallery,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
    dressCode: event.dressCode,
    minAge: event.minAge,
    faqs: event.faqs,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    venue: publicVenue(venue),
    status: event.status,
    canonicalUrl: `${eventsConfig.publicUrl}/events/${event.slug}`,
    emailAvailable: eventsConfig.emailMode === "resend",
    registration: {
      state: reg.state,
      remaining: event.showRemainingCapacity ? reg.remaining : null,
    },
  };
}

function sanitizeIdempotencyKey(value: unknown): string | undefined {
  const s = String(value || "").trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : undefined;
}

export { publicEventDetail, publicEventSummary, confirmedCounts };
