import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { Router, type Response } from "express";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  auditLog, businessMemberships, businesses, checkIns, emailOutbox, events,
  oneTimeTokens, registrations, tickets, users, venues,
  EVENT_STATUSES, type EventStatus,
} from "@shared/events-schema";
import { requireRole, requireUser, type AuthedRequest } from "../session";
import { generateOneTimeToken, normalizeEmail, rateLimit, ticketToken } from "../security";
import { sanitizeRichText, slugify, validateSlug } from "../content";
import { isValidTimezone, utcToZonedLocal, zonedLocalToUtc } from "../time";
import { cancelRegistration, registerAttendee, restoreRegistration } from "../registrationService";
import { reverseCheckIn, scanTicket } from "../checkinService";
import {
  enqueueAccountEmail, enqueueEventNotice, enqueueRegistrationCancellation, enqueueTicketResend,
} from "../emails";
import { enqueueRegistrationConfirmation } from "../emails";
import { addGoogleMessages, invalidateGoogleObject, setGoogleObjectState, updateGoogleEvent } from "../wallet/google";
import { isSafeUploadName, storeEventImage, uploadMiddleware } from "../uploads";
import { audit } from "../audit";
import { appleWalletConfigured, eventsConfig, googleWalletConfigured } from "../config";
import { INVITE_TTL_MS } from "./authRoutes";

/** Organizer/staff API. Every route is authenticated and tenant-scoped. */
export function manageRouter(): Router {
  const r = Router();
  r.use(requireUser);

  // ---------------------------------------------------------------- dashboard
  r.get("/dashboard", requireRole("event_manager"), async (req, res, next) => {
    try {
      const businessId = biz(req);
      const now = new Date();
      const allEvents = await db.select().from(events)
        .where(and(eq(events.businessId, businessId), sql`${events.status} != 'archived'`))
        .orderBy(asc(events.startsAt));
      const counts = await registrationAndCheckinCounts(businessId);
      const recent = await db
        .select({
          id: registrations.id, fullName: registrations.fullName,
          eventId: registrations.eventId, registeredAt: registrations.registeredAt,
          status: registrations.status,
        })
        .from(registrations)
        .where(eq(registrations.businessId, businessId))
        .orderBy(desc(registrations.registeredAt))
        .limit(10);
      const titleById = new Map(allEvents.map((e) => [e.id, e.title]));
      res.json({
        totals: {
          upcoming: allEvents.filter((e) => e.status === "published" && e.startsAt > now).length,
          published: allEvents.filter((e) => e.status === "published").length,
          drafts: allEvents.filter((e) => e.status === "draft").length,
          completed: allEvents.filter((e) => e.status === "completed" || (e.endsAt < now && e.status === "published")).length,
        },
        events: allEvents.map((e) => ({
          id: e.id, title: e.title, slug: e.slug, status: e.status,
          startsAt: e.startsAt.toISOString(), timezone: e.timezone,
          capacity: e.capacity,
          confirmed: counts.get(e.id)?.confirmed ?? 0,
          checkedIn: counts.get(e.id)?.checkedIn ?? 0,
        })),
        recentRegistrations: recent.map((r2) => ({
          id: r2.id, fullName: r2.fullName, status: r2.status,
          eventTitle: titleById.get(r2.eventId) ?? "",
          registeredAt: r2.registeredAt.toISOString(),
        })),
      });
    } catch (err) { next(err); }
  });

  // ------------------------------------------------------------------- venues
  r.get("/venues", requireRole("event_manager"), async (req, res, next) => {
    try {
      const rows = await db.select().from(venues)
        .where(eq(venues.businessId, biz(req))).orderBy(asc(venues.name));
      res.json({ venues: rows });
    } catch (err) { next(err); }
  });

  r.post("/venues", requireRole("event_manager"), async (req, res, next) => {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) { res.status(400).json({ error: "Venue name is required" }); return; }
      const [venue] = await db.insert(venues).values({
        businessId: biz(req),
        name,
        addressLine1: str(req.body?.addressLine1),
        addressLine2: str(req.body?.addressLine2),
        city: str(req.body?.city),
        region: str(req.body?.region),
        postalCode: str(req.body?.postalCode),
        country: str(req.body?.country),
        mapUrl: httpsUrl(req.body?.mapUrl),
        latitude: coord(req.body?.latitude),
        longitude: coord(req.body?.longitude),
        accessibilityNotes: str(req.body?.accessibilityNotes),
        contactPhone: str(req.body?.contactPhone),
      }).returning();
      res.status(201).json({ venue });
    } catch (err) { next(err); }
  });

  // ------------------------------------------------------------------- events
  r.get("/events", requireRole("event_manager"), async (req, res, next) => {
    try {
      const businessId = biz(req);
      const rows = await db.select().from(events)
        .where(eq(events.businessId, businessId))
        .orderBy(desc(events.startsAt));
      const counts = await registrationAndCheckinCounts(businessId);
      res.json({
        events: rows.map((e) => ({
          ...serializeEvent(e),
          confirmed: counts.get(e.id)?.confirmed ?? 0,
          checkedIn: counts.get(e.id)?.checkedIn ?? 0,
        })),
      });
    } catch (err) { next(err); }
  });

  r.post("/events", requireRole("event_manager"), async (req, res, next) => {
    try {
      const parsed = await parseEventBody(req.body, null);
      if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
      const frequency = String(req.body?.repeatFrequency || "none");
      const count = Number(req.body?.repeatCount || 1);
      if (!["none", "weekly", "biweekly", "monthly"].includes(frequency) ||
          !Number.isInteger(count) || count < 1 || count > 52 ||
          (frequency === "none" && count !== 1)) {
        res.status(400).json({ error: "Choose 1–52 occurrences and a valid repeat interval" }); return;
      }
      const publish = count > 1 && req.body?.publishSeries === true;
      const startLocal = String(req.body.startsAtLocal);
      const rows = Array.from({ length: count }, (_, index) => {
        const startsAt = index === 0 ? parsed.values.startsAt :
          zonedLocalToUtc(shiftLocalDate(startLocal, frequency, index), parsed.values.timezone);
        const offsetMs = startsAt.getTime() - parsed.values.startsAt.getTime();
        const date = utcToZonedLocal(startsAt, parsed.values.timezone).slice(0, 10);
        return {
          ...parsed.values,
          slug: count > 1 ? `${parsed.values.slug}-${date}` : parsed.values.slug,
          startsAt,
          endsAt: new Date(parsed.values.endsAt.getTime() + offsetMs),
          registrationOpensAt: parsed.values.registrationOpensAt ? new Date(parsed.values.registrationOpensAt.getTime() + offsetMs) : null,
          registrationClosesAt: parsed.values.registrationClosesAt ? new Date(parsed.values.registrationClosesAt.getTime() + offsetMs) : null,
          businessId: biz(req),
          status: publish ? "published" as const : "draft" as const,
          publishedAt: publish ? new Date() : null,
          createdByUserId: user(req).id,
        };
      });
      if (rows.some((row) => row.slug.length > 80)) {
        res.status(400).json({ error: "Shorten the slug to leave room for occurrence dates" }); return;
      }
      const created = await db.transaction(async (tx) => tx.insert(events).values(rows).returning());
      for (const event of created) {
        await audit({ businessId: biz(req), actorUserId: user(req).id, action: "event.create", targetType: "event", targetId: event.id,
          metadata: count > 1 ? { repeatFrequency: frequency, occurrences: count } : undefined });
      }
      res.status(201).json({ event: serializeEvent(created[0]), events: created.map(serializeEvent) });
    } catch (err) {
      if (isSlugConflict(err)) { res.status(409).json({ error: "That slug is already in use" }); return; }
      next(err);
    }
  });

  r.get("/events/:eventId", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const [venue] = event.venueId
        ? await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1) : [null];
      const counts = await registrationAndCheckinCounts(biz(req), event.id);
      const c = counts.get(event.id) ?? { confirmed: 0, checkedIn: 0, cancelled: 0 };
      res.json({
        event: serializeEvent(event),
        venue: venue ?? null,
        stats: {
          confirmed: c.confirmed,
          cancelled: c.cancelled,
          checkedIn: c.checkedIn,
          remaining: event.capacity == null ? null : Math.max(0, event.capacity - c.confirmed),
        },
        publicUrl: `${eventsConfig.publicUrl}/events/${event.slug}`,
      });
    } catch (err) { next(err); }
  });

  r.put("/events/:eventId", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      if (["archived", "cancelled"].includes(event.status)) {
        res.status(409).json({ error: `A ${event.status} event cannot be edited` });
        return;
      }
      const parsed = await parseEventBody(req.body, event);
      if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }

      // capacity may not drop below confirmed attendance
      if (parsed.values.capacity != null) {
        const counts = await registrationAndCheckinCounts(biz(req), event.id);
        const confirmed = counts.get(event.id)?.confirmed ?? 0;
        if (parsed.values.capacity < confirmed) {
          res.status(409).json({
            error: `Capacity cannot be set below the ${confirmed} confirmed registrations. Cancel registrations first or choose a larger capacity.`,
          });
          return;
        }
      }

      const changed = materialChanges(event, parsed.values);
      const [updated] = await db.update(events)
        .set({ ...parsed.values, updatedAt: new Date() })
        .where(and(eq(events.id, event.id), eq(events.businessId, biz(req))))
        .returning();
      if (changed.length > 0) {
        // wallet passes re-render with the new date/venue/title (best-effort)
        void import("../wallet/passUpdates").then((m) => m.pushEventPassUpdates(event.id)).catch(() => {});
        const [venue] = updated.venueId
          ? await db.select().from(venues).where(eq(venues.id, updated.venueId)).limit(1)
          : [null];
        void updateGoogleEvent(updated, venue ?? null);
      }
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: "event.update",
        targetType: "event", targetId: event.id, metadata: { changedFields: changed },
      });
      res.json({ event: serializeEvent(updated), materialChanges: changed });
    } catch (err) {
      if (isSlugConflict(err)) { res.status(409).json({ error: "That slug is already in use" }); return; }
      next(err);
    }
  });

  r.post("/events/:eventId/status", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const target = String(req.body?.status || "") as EventStatus;
      if (!EVENT_STATUSES.includes(target)) {
        res.status(400).json({ error: "Unknown status" });
        return;
      }
      const allowed = allowedTransitions(event.status);
      if (!allowed.includes(target)) {
        res.status(409).json({ error: `Cannot move a ${event.status} event to ${target}` });
        return;
      }
      const patch: Partial<typeof events.$inferInsert> = { status: target, updatedAt: new Date() };
      if (target === "published" && !event.publishedAt) patch.publishedAt = new Date();
      if (target === "cancelled") {
        patch.cancelledAt = new Date();
        patch.passMessage = "This event has been cancelled. Please check your email for details.";
        patch.passMessageAt = new Date();
      }
      if (target === "archived") patch.archivedAt = new Date();
      const [updated] = await db.update(events).set(patch)
        .where(and(eq(events.id, event.id), eq(events.businessId, biz(req)))).returning();

      if (target === "cancelled") {
        // invalidate all active tickets; wallet objects best-effort
        const cancelled = await db.update(tickets)
          .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
          .where(and(eq(tickets.eventId, event.id), eq(tickets.status, "valid")))
          .returning({ id: tickets.id, googleObjectId: tickets.googleObjectId });
        const googleTicketIds = cancelled.filter((t) => t.googleObjectId).map((t) => t.id);
        if (googleTicketIds.length > 0) {
          void (async () => {
            await addGoogleMessages(googleTicketIds, "Event cancelled", patch.passMessage!);
            await Promise.all(googleTicketIds.map((id) => invalidateGoogleObject(id)));
          })().catch((err) => console.error("[events][wallet] Google cancellation notice failed:", err));
        }
        // Apple passes flip to CANCELLED / voided on attendees' phones
        void import("../wallet/passUpdates").then((m) => m.pushEventPassUpdates(event.id)).catch(() => {});
      }
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: `event.status.${target}`,
        targetType: "event", targetId: event.id, metadata: { from: event.status },
      });
      res.json({ event: serializeEvent(updated) });
    } catch (err) {
      if (isSlugConflict(err)) {
        res.status(409).json({ error: "Another active event already uses this slug; change the slug first" });
        return;
      }
      next(err);
    }
  });

  r.post("/events/:eventId/duplicate", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const copySlugBase = `${event.slug}-copy`;
      let slug = copySlugBase;
      for (let i = 2; i < 50; i++) {
        const [taken] = await db.select({ id: events.id }).from(events)
          .where(and(eq(events.slug, slug), sql`${events.status} != 'archived'`)).limit(1);
        if (!taken) break;
        slug = `${copySlugBase}-${i}`;
      }
      const [copy] = await db.insert(events).values({
        businessId: event.businessId,
        venueId: event.venueId,
        title: `${event.title} (copy)`,
        slug,
        subtitle: event.subtitle,
        descriptionHtml: event.descriptionHtml,
        heroImagePath: event.heroImagePath,
        heroImageAlt: event.heroImageAlt,
        gallery: event.gallery,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        timezone: event.timezone,
        registrationOpensAt: event.registrationOpensAt,
        registrationClosesAt: event.registrationClosesAt,
        capacity: event.capacity,
        showRemainingCapacity: event.showRemainingCapacity,
        dressCode: event.dressCode,
        minAge: event.minAge,
        faqs: event.faqs,
        contactEmail: event.contactEmail,
        contactPhone: event.contactPhone,
        ogTitle: event.ogTitle,
        ogDescription: event.ogDescription,
        status: "draft", // registrations/tickets are never copied
        createdByUserId: user(req).id,
      }).returning();
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "event.duplicate", targetType: "event", targetId: copy.id, metadata: { from: event.id } });
      res.status(201).json({ event: serializeEvent(copy) });
    } catch (err) { next(err); }
  });

  r.get("/events/:eventId/audit", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const rows = await db.select({
        action: auditLog.action, createdAt: auditLog.createdAt,
        actorUserId: auditLog.actorUserId, metadata: auditLog.metadata,
      }).from(auditLog)
        .where(and(eq(auditLog.businessId, biz(req)), eq(auditLog.targetType, "event"), eq(auditLog.targetId, event.id)))
        .orderBy(desc(auditLog.createdAt)).limit(100);
      res.json({ entries: rows });
    } catch (err) { next(err); }
  });

  // notify attendees of a material update / cancellation / reminder (explicit, previewed)
  r.post("/events/:eventId/notify", requireRole("event_manager"), rateLimit("notify", 5, 1 / 60), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const kind = String(req.body?.kind || "");
      if (!["event_update", "event_cancellation", "event_reminder"].includes(kind)) {
        res.status(400).json({ error: "Unknown notification kind" });
        return;
      }
      const confirm = Boolean(req.body?.confirm);
      const changeSummary = String(req.body?.changeSummary || "").slice(0, 1000);
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(registrations)
        .where(and(eq(registrations.eventId, event.id), eq(registrations.status, "confirmed")));
      if (!confirm) {
        // preview step: tell the organizer exactly what will happen
        res.json({ preview: true, recipients: count, kind, changeSummary, deliveryEnabled: eventsConfig.emailMode === "resend" });
        return;
      }
      const batchId = String(req.body?.batchId || randomUUID());
      const queued = await enqueueEventNotice({
        eventId: event.id,
        kind: kind as "event_update" | "event_cancellation" | "event_reminder",
        changeSummary: changeSummary || undefined,
        batchId,
      });
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: `event.notify.${kind}`,
        targetType: "event", targetId: event.id, metadata: { queued, batchId },
      });
      res.json({ queued, batchId, deliveryEnabled: eventsConfig.emailMode === "resend" });
    } catch (err) { next(err); }
  });

  // --------------------------------------------------------- wallet passes
  r.get("/events/:eventId/pass-holders", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const { passHolderStats } = await import("../wallet/passUpdates");
      const stats = await passHolderStats(event.id);
      res.set("Cache-Control", "no-store");
      res.json({ ...stats, currentMessage: event.passMessage, messageAt: event.passMessageAt?.toISOString() ?? null });
    } catch (err) { next(err); }
  });

  // Broadcast to everyone who added the pass to their wallet. Preview first
  // (confirm=false), then send: stores the message on the event, pushes APNs
  // so Apple passes update + notify, and mirrors to Google objects when live.
  r.post("/events/:eventId/pass-message", requireRole("event_manager"), rateLimit("pass-msg", 5, 1 / 60), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const message = String(req.body?.message || "").trim().slice(0, 300);
      if (!message) { res.status(400).json({ error: "A message is required" }); return; }
      const { passHolderStats, pushEventPassUpdates } = await import("../wallet/passUpdates");
      const stats = await passHolderStats(event.id);
      if (!req.body?.confirm) {
        res.json({ preview: true, ...stats, message });
        return;
      }
      await db.update(events)
        .set({ passMessage: message, passMessageAt: new Date(), updatedAt: new Date() })
        .where(and(eq(events.id, event.id), eq(events.businessId, biz(req))));
      const { pushed } = await pushEventPassUpdates(event.id);
      let googleSent = 0;
      const { googleWalletAvailable, addGoogleMessages } = await import("../wallet/google");
      if (googleWalletAvailable()) {
        const googleTickets = await db.select({ id: tickets.id }).from(tickets)
          .where(and(eq(tickets.eventId, event.id), sql`${tickets.googleObjectId} IS NOT NULL`));
        googleSent = await addGoogleMessages(googleTickets.map((t) => t.id), "Grandma Jazz", message);
      }
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: "event.pass_message",
        targetType: "event", targetId: event.id,
        metadata: { passes: stats.passes, pushed, googleSent, message },
      });
      res.json({ ok: true, passes: stats.passes, pushed, googleSent });
    } catch (err) { next(err); }
  });

  // -------------------------------------------------------------------- media
  r.post("/events/:eventId/hero-image", requireRole("event_manager"),
    uploadMiddleware.single("image"), async (req, res, next) => {
      try {
        const event = await ownedEvent(req, res); if (!event) return;
        if (!req.file) { res.status(400).json({ error: "An image file is required" }); return; }
        const alt = String(req.body?.alt || "").slice(0, 300);
        const stored = await storeEventImage(req.file.buffer);
        await db.update(events)
          .set({ heroImagePath: stored.publicPath, heroImageAlt: alt || event.title, updatedAt: new Date() })
          .where(and(eq(events.id, event.id), eq(events.businessId, biz(req))));
        res.status(201).json({ heroImagePath: stored.publicPath, width: stored.width, height: stored.height });
      } catch (err: any) {
        if (String(err?.message || "").includes("image")) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    });

  // gallery image: upload + append (cap 12)
  r.post("/events/:eventId/gallery", requireRole("event_manager"),
    uploadMiddleware.single("image"), async (req, res, next) => {
      try {
        const event = await ownedEvent(req, res); if (!event) return;
        if (!req.file) { res.status(400).json({ error: "An image file is required" }); return; }
        const gallery = Array.isArray(event.gallery) ? event.gallery as Array<{ path: string; alt: string }> : [];
        if (gallery.length >= 12) {
          res.status(400).json({ error: "A gallery can hold at most 12 images" });
          return;
        }
        const alt = String(req.body?.alt || "").slice(0, 300);
        const stored = await storeEventImage(req.file.buffer);
        const next_ = [...gallery, { path: stored.publicPath, alt }];
        await db.update(events).set({ gallery: next_, updatedAt: new Date() })
          .where(and(eq(events.id, event.id), eq(events.businessId, biz(req))));
        res.status(201).json({ gallery: next_ });
      } catch (err: any) {
        if (String(err?.message || "").includes("image")) { res.status(400).json({ error: err.message }); return; }
        next(err);
      }
    });

  r.post("/events/:eventId/gallery/remove", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const path_ = String(req.body?.path || "");
      const gallery = (Array.isArray(event.gallery) ? event.gallery as Array<{ path: string; alt: string }> : [])
        .filter((img) => img.path !== path_);
      await db.update(events).set({ gallery, updatedAt: new Date() })
        .where(and(eq(events.id, event.id), eq(events.businessId, biz(req))));
      await deleteUploadIfUnreferenced(path_);
      res.json({ gallery });
    } catch (err) { next(err); }
  });

  // inline image for the rich-text description (not added to the gallery)
  r.post("/events/:eventId/images", requireRole("event_manager"),
    uploadMiddleware.single("image"), async (req, res, next) => {
      try {
        const event = await ownedEvent(req, res); if (!event) return;
        if (!req.file) { res.status(400).json({ error: "An image file is required" }); return; }
        const stored = await storeEventImage(req.file.buffer);
        res.status(201).json({ path: stored.publicPath, width: stored.width, height: stored.height });
      } catch (err: any) {
        if (String(err?.message || "").includes("image")) { res.status(400).json({ error: err.message }); return; }
        next(err);
      }
    });

  // ---------------------------------------------------------------- attendees
  r.get("/events/:eventId/attendees", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const q = String(req.query.q || "").trim();
      const status = String(req.query.status || "");
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const pageSize = Math.min(100, Math.max(10, parseInt(String(req.query.pageSize || "50"), 10) || 50));

      const conditions = [eq(registrations.eventId, event.id), eq(registrations.businessId, biz(req))];
      if (status === "confirmed" || status === "cancelled") conditions.push(eq(registrations.status, status));
      if (q) {
        conditions.push(or(
          ilike(registrations.fullName, `%${q}%`),
          ilike(registrations.emailNormalized, `%${q.toLowerCase()}%`),
          ilike(tickets.reference, `%${q.toUpperCase()}%`),
        )!);
      }
      const base = db
        .select({
          registration: registrations,
          ticket: tickets,
        })
        .from(registrations)
        .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
        .where(and(...conditions));
      const rows = await base
        .orderBy(desc(registrations.registeredAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(registrations)
        .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
        .where(and(...conditions));
      const deliveries = await deliveryStates(rows.map((r2) => r2.registration.id));
      res.json({
        page, pageSize, total,
        attendees: rows.map(({ registration: rg, ticket: t }) => ({
          registrationId: rg.id,
          ticketId: t.id,
          fullName: rg.fullName,
          email: rg.email,
          phone: rg.phone,
          notes: rg.notes,
          status: rg.status,
          source: rg.source,
          marketingConsent: rg.marketingConsent,
          registeredAt: rg.registeredAt.toISOString(),
          cancelledAt: rg.cancelledAt?.toISOString() ?? null,
          ticketReference: t.reference,
          ticketStatus: t.status,
          checkedInAt: t.checkedInAt?.toISOString() ?? null,
          delivery: deliveries.get(rg.id) ?? "none",
        })),
      });
    } catch (err) { next(err); }
  });

  r.get("/events/:eventId/attendees.csv", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const rows = await db
        .select({ registration: registrations, ticket: tickets })
        .from(registrations)
        .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
        .where(and(eq(registrations.eventId, event.id), eq(registrations.businessId, biz(req))))
        .orderBy(asc(registrations.registeredAt));
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: "attendees.export",
        targetType: "event", targetId: event.id, metadata: { rows: rows.length },
      });
      const header = ["full_name", "email", "phone", "notes", "status", "source", "marketing_consent",
        "registered_at", "cancelled_at", "ticket_reference", "ticket_status", "checked_in_at"];
      const csvRows = rows.map(({ registration: rg, ticket: t }) => [
        rg.fullName, rg.email, rg.phone, rg.notes ?? "", rg.status, rg.source,
        rg.marketingConsent ? "yes" : "no",
        rg.registeredAt.toISOString(), rg.cancelledAt?.toISOString() ?? "",
        t.reference, t.status, t.checkedInAt?.toISOString() ?? "",
      ]);
      const csv = [header, ...csvRows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n") + "\n";
      res.set("Cache-Control", "no-store");
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="attendees-${event.slug}-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send("﻿" + csv); // BOM for Excel UTF-8
    } catch (err) { next(err); }
  });

  r.post("/events/:eventId/attendees", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const result = await registerAttendee({
        eventId: event.id,
        fullName: String(req.body?.fullName || ""),
        email: String(req.body?.email || ""),
        phone: String(req.body?.phone || ""),
        notes: String(req.body?.notes || "").slice(0, 2000) || undefined,
        termsAccepted: true, // recorded by staff on the attendee's behalf
        marketingConsent: false,
        source: "manual",
        createdByUserId: user(req).id,
        overrideWindow: Boolean(req.body?.overrideWindow),
      });
      if (!result.ok) {
        res.status(result.code === "full" || result.code === "duplicate_email" ? 409 : 400)
          .json({ error: result.message, code: result.code });
        return;
      }
      await audit({
        businessId: biz(req), actorUserId: user(req).id, action: "attendee.manual_add",
        targetType: "registration", targetId: result.registrationId,
      });
      res.status(201).json({ registrationId: result.registrationId, ticketReference: result.ticketReference });
    } catch (err) { next(err); }
  });

  r.post("/registrations/:registrationId/resend", requireRole("event_manager"), async (req, res, next) => {
    try {
      const reg = await ownedRegistration(req, res); if (!reg) return;
      await enqueueTicketResend(reg.id);
      await db.update(tickets).set({ lastDeliveredAt: new Date() }).where(eq(tickets.registrationId, reg.id));
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "attendee.resend_ticket", targetType: "registration", targetId: reg.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/registrations/:registrationId/cancel", requireRole("event_manager"), async (req, res, next) => {
    try {
      const reg = await ownedRegistration(req, res); if (!reg) return;
      const result = await cancelRegistration({
        registrationId: reg.id,
        businessId: biz(req),
        reason: String(req.body?.reason || "").slice(0, 500) || undefined,
      });
      if (!result.ok) { res.status(409).json({ error: "Registration is not active" }); return; }
      const [t] = await db.select({ id: tickets.id, googleObjectId: tickets.googleObjectId })
        .from(tickets).where(eq(tickets.registrationId, reg.id)).limit(1);
      if (t?.googleObjectId) void invalidateGoogleObject(t.id);
      if (t) void import("../wallet/passUpdates").then((m) => m.pushPassUpdates([t.id])).catch(() => {});
      if (req.body?.notifyAttendee !== false) await enqueueRegistrationCancellation(reg.id);
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "attendee.cancel", targetType: "registration", targetId: reg.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/registrations/:registrationId/restore", requireRole("event_manager"), async (req, res, next) => {
    try {
      const reg = await ownedRegistration(req, res); if (!reg) return;
      const result = await restoreRegistration({ registrationId: reg.id, businessId: biz(req) });
      if (!result.ok) { res.status(409).json({ error: result.reason }); return; }
      const [t] = await db.select({ id: tickets.id, googleObjectId: tickets.googleObjectId })
        .from(tickets).where(eq(tickets.registrationId, reg.id)).limit(1);
      if (t?.googleObjectId) void setGoogleObjectState(t.id, "ACTIVE");
      if (t) void import("../wallet/passUpdates").then((m) => m.pushPassUpdates([t.id])).catch(() => {});
      await enqueueRegistrationConfirmation(reg.id).catch(() => {});
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "attendee.restore", targetType: "registration", targetId: reg.id });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ----------------------------------------------------------------- check-in
  // checkin_staff and above. Responses expose only what door staff need.
  r.get("/events/:eventId/check-in/summary", requireRole("checkin_staff"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const counts = await registrationAndCheckinCounts(biz(req), event.id);
      const c = counts.get(event.id) ?? { confirmed: 0, checkedIn: 0, cancelled: 0 };
      res.set("Cache-Control", "no-store");
      res.json({
        eventTitle: event.title,
        eventStatus: event.status,
        confirmed: c.confirmed,
        checkedIn: c.checkedIn,
      });
    } catch (err) { next(err); }
  });

  r.post("/events/:eventId/check-in/scan", requireRole("checkin_staff"), rateLimit("scan", 60, 5), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const result = await scanTicket({
        businessId: biz(req),
        eventId: event.id,
        code: String(req.body?.code || ""),
        staffUserId: user(req).id,
        source: (["qr", "manual", "offline"].includes(req.body?.source) ? req.body.source : "qr"),
        idempotencyKey: String(req.body?.idempotencyKey || "").slice(0, 64) || undefined,
      });
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch (err) { next(err); }
  });

  // minimal attendee search for door staff: name + reference + status only
  r.get("/events/:eventId/check-in/search", requireRole("checkin_staff"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const q = String(req.query.q || "").trim();
      if (q.length < 2) { res.json({ results: [] }); return; }
      const rows = await db
        .select({
          fullName: registrations.fullName,
          reference: tickets.reference,
          ticketStatus: tickets.status,
          registrationStatus: registrations.status,
          checkedInAt: tickets.checkedInAt,
        })
        .from(registrations)
        .innerJoin(tickets, eq(tickets.registrationId, registrations.id))
        .where(and(
          eq(registrations.eventId, event.id),
          eq(registrations.businessId, biz(req)),
          or(ilike(registrations.fullName, `%${q}%`), ilike(tickets.reference, `%${q.toUpperCase()}%`)),
        ))
        .limit(20);
      res.set("Cache-Control", "no-store");
      res.json({
        results: rows.map((row) => ({
          fullName: row.fullName,
          reference: row.reference,
          status: row.registrationStatus === "cancelled" ? "cancelled" : row.ticketStatus,
          checkedInAt: row.checkedInAt?.toISOString() ?? null,
        })),
      });
    } catch (err) { next(err); }
  });

  r.post("/tickets/:ticketId/reverse-check-in", requireRole("event_manager"), async (req, res, next) => {
    try {
      const reason = String(req.body?.reason || "").trim();
      if (!reason) { res.status(400).json({ error: "A reason is required" }); return; }
      const ok = await reverseCheckIn({
        businessId: biz(req),
        ticketId: req.params.ticketId,
        byUserId: user(req).id,
        reason: reason.slice(0, 500),
      });
      if (!ok) { res.status(404).json({ error: "Ticket not found or not checked in" }); return; }
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // --------------------------------------------------------------------- team
  r.get("/team", requireRole("business_owner"), async (req, res, next) => {
    try {
      const rows = await db
        .select({
          membershipId: businessMemberships.id,
          role: businessMemberships.role,
          status: businessMemberships.status,
          userId: users.id,
          name: users.name,
          email: users.email,
          userStatus: users.status,
        })
        .from(businessMemberships)
        .innerJoin(users, eq(users.id, businessMemberships.userId))
        .where(and(eq(businessMemberships.businessId, biz(req)), sql`${businessMemberships.status} != 'revoked'`))
        .orderBy(asc(users.name));
      res.json({ team: rows });
    } catch (err) { next(err); }
  });

  r.post("/team/invite", requireRole("business_owner"), rateLimit("team-invite", 10, 1 / 60), async (req, res, next) => {
    try {
      const email = normalizeEmail(String(req.body?.email || ""));
      const name = String(req.body?.name || "").trim();
      const role = String(req.body?.role || "");
      if (!email.includes("@") || !name) { res.status(400).json({ error: "Name and email are required" }); return; }
      if (!["business_owner", "event_manager", "checkin_staff"].includes(role)) {
        res.status(400).json({ error: "Unknown role" });
        return;
      }
      const businessId = biz(req);
      const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);

      let [invitee] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!invitee) {
        [invitee] = await db.insert(users).values({ email, name, status: "invited" }).returning();
      }
      const [existing] = await db.select().from(businessMemberships)
        .where(and(eq(businessMemberships.businessId, businessId), eq(businessMemberships.userId, invitee.id)))
        .limit(1);
      if (existing && existing.status === "active") {
        res.status(409).json({ error: "That person is already on the team" });
        return;
      }
      if (existing) {
        await db.update(businessMemberships)
          .set({ role: role as any, status: "invited", invitedByUserId: user(req).id, updatedAt: new Date() })
          .where(eq(businessMemberships.id, existing.id));
      } else {
        await db.insert(businessMemberships).values({
          businessId, userId: invitee.id, role: role as any, status: "invited", invitedByUserId: user(req).id,
        });
      }
      const { token, hash } = generateOneTimeToken();
      await db.insert(oneTimeTokens).values({
        userId: invitee.id, purpose: "invite", tokenHash: hash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });
      await enqueueAccountEmail({
        template: "organizer_invitation",
        recipient: email,
        recipientName: name,
        businessName: business?.name || "Grandma Jazz",
        actionUrl: `${eventsConfig.publicUrl}/events/manage/accept-invite?token=${token}`,
      });
      await audit({ businessId, actorUserId: user(req).id, action: "team.invite", targetType: "user", targetId: invitee.id, metadata: { role } });
      res.status(201).json({ ok: true });
    } catch (err) { next(err); }
  });

  r.post("/team/:membershipId/revoke", requireRole("business_owner"), async (req, res, next) => {
    try {
      const [membership] = await db.select().from(businessMemberships)
        .where(and(eq(businessMemberships.id, req.params.membershipId), eq(businessMemberships.businessId, biz(req))))
        .limit(1);
      if (!membership) { res.status(404).json({ error: "Membership not found" }); return; }
      if (membership.userId === user(req).id) {
        res.status(409).json({ error: "You cannot revoke your own access" });
        return;
      }
      await db.update(businessMemberships)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(businessMemberships.id, membership.id));
      // kill their sessions
      await db.update(users).set({ sessionEpoch: sql`${users.sessionEpoch} + 1` }).where(eq(users.id, membership.userId));
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "team.revoke", targetType: "user", targetId: membership.userId });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ----------------------------------------------------------------- settings
  r.get("/settings", requireRole("business_owner"), async (req, res, next) => {
    try {
      const [business] = await db.select().from(businesses).where(eq(businesses.id, biz(req))).limit(1);
      res.json({ business, wallet: {
        apple: appleWalletConfigured(),
        google: googleWalletConfigured(),
        googleDemoReady: !!(eventsConfig.googleWallet.issuerId && eventsConfig.googleWallet.saKeyPath && existsSync(eventsConfig.googleWallet.saKeyPath)),
      } });
    } catch (err) { next(err); }
  });

  r.put("/settings", requireRole("business_owner"), async (req, res, next) => {
    try {
      const patch: Partial<typeof businesses.$inferInsert> = { updatedAt: new Date() };
      if (req.body?.name) patch.name = String(req.body.name).trim().slice(0, 120);
      if (req.body?.contactEmail !== undefined) patch.contactEmail = str(req.body.contactEmail);
      if (req.body?.contactPhone !== undefined) patch.contactPhone = str(req.body.contactPhone);
      if (req.body?.instagramUrl !== undefined) patch.instagramUrl = httpsUrl(req.body.instagramUrl);
      if (req.body?.defaultTimezone) {
        const tz = String(req.body.defaultTimezone);
        if (!isValidTimezone(tz)) { res.status(400).json({ error: "Unknown timezone" }); return; }
        patch.defaultTimezone = tz;
      }
      const [business] = await db.update(businesses).set(patch)
        .where(eq(businesses.id, biz(req))).returning();
      await audit({ businessId: biz(req), actorUserId: user(req).id, action: "business.settings_update", targetType: "business", targetId: biz(req) });
      res.json({ business });
    } catch (err) { next(err); }
  });

  // organizer email-delivery visibility (no bodies, no tokens)
  r.get("/events/:eventId/deliveries", requireRole("event_manager"), async (req, res, next) => {
    try {
      const event = await ownedEvent(req, res); if (!event) return;
      const rows = await db
        .select({
          id: emailOutbox.id, template: emailOutbox.template, recipient: emailOutbox.recipient,
          status: emailOutbox.status, attempts: emailOutbox.attempts,
          sentAt: emailOutbox.sentAt, createdAt: emailOutbox.createdAt, lastError: emailOutbox.lastError,
        })
        .from(emailOutbox)
        .where(and(eq(emailOutbox.eventId, event.id), eq(emailOutbox.businessId, biz(req))))
        .orderBy(desc(emailOutbox.createdAt))
        .limit(200);
      res.json({ deliveries: rows });
    } catch (err) { next(err); }
  });

  return r;

  // ------------------------------------------------------------------ helpers
  function biz(req: import("express").Request): string {
    const m = (req as AuthedRequest).membership;
    if (!m) throw Object.assign(new Error("No business membership"), { status: 403 });
    return m.businessId;
  }
  function user(req: import("express").Request) {
    return (req as AuthedRequest).user;
  }
  async function ownedEvent(req: import("express").Request, res: Response) {
    const [event] = await db.select().from(events)
      .where(and(eq(events.id, req.params.eventId), eq(events.businessId, biz(req))))
      .limit(1);
    if (!event) {
      // 404, not 403: existence of other tenants' events is not disclosed
      res.status(404).json({ error: "Event not found" });
      return null;
    }
    return event;
  }
  async function ownedRegistration(req: import("express").Request, res: Response) {
    const [reg] = await db.select().from(registrations)
      .where(and(eq(registrations.id, req.params.registrationId), eq(registrations.businessId, biz(req))))
      .limit(1);
    if (!reg) {
      res.status(404).json({ error: "Registration not found" });
      return null;
    }
    return reg;
  }
}

// --------------------------------------------------------------- pure helpers

/** Unlink an uploads file once nothing (hero, gallery, description) references it. */
async function deleteUploadIfUnreferenced(publicPath: string): Promise<void> {
  const name = publicPath.split("/").pop() || "";
  if (!isSafeUploadName(name)) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(sql`${events.heroImagePath} = ${publicPath}
      OR ${events.gallery}::text LIKE ${"%" + publicPath + "%"}
      OR ${events.descriptionHtml} LIKE ${"%" + publicPath + "%"}`);
  if (count > 0) return;
  const { unlink } = await import("node:fs/promises");
  const path = await import("node:path");
  await unlink(path.join(eventsConfig.uploadsDir, name)).catch(() => {});
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, 500) : null;
}

function httpsUrl(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return url.toString().slice(0, 800);
  } catch {
    return null;
  }
}

function coord(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? String(n) : null;
}

function isSlugConflict(err: any): boolean {
  return err?.code === "23505" && String(err?.constraint || "").includes("slug");
}

/** Shift a local event start by calendar weeks/months, keeping its wall time. */
function shiftLocalDate(local: string, frequency: string, index: number): string {
  const [date, time] = local.split("T");
  const [year, month, day] = date.split("-").map(Number);
  if (frequency === "monthly") {
    const target = new Date(Date.UTC(year, month - 1 + index, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, last));
    return `${target.toISOString().slice(0, 10)}T${time}`;
  }
  const weeks = frequency === "biweekly" ? index * 2 : index;
  const target = new Date(Date.UTC(year, month - 1, day + 7 * weeks));
  return `${target.toISOString().slice(0, 10)}T${time}`;
}

function allowedTransitions(from: EventStatus): EventStatus[] {
  switch (from) {
    case "draft": return ["published", "archived"];
    case "published": return ["registration_closed", "cancelled", "completed", "draft"];
    case "registration_closed": return ["published", "cancelled", "completed"];
    case "completed": return ["archived"];
    case "cancelled": return ["archived"];
    case "archived": return [];
  }
}

interface EventBodyValues {
  title: string;
  slug: string;
  subtitle: string | null;
  descriptionHtml: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  showRemainingCapacity: boolean;
  dressCode: string | null;
  minAge: number | null;
  faqs: Array<{ q: string; a: string }>;
  contactEmail: string | null;
  contactPhone: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  venueId: string | null;
}

async function parseEventBody(
  body: any,
  existing: typeof events.$inferSelect | null,
): Promise<{ values: EventBodyValues } | { error: string }> {
  const title = String(body?.title || "").trim().slice(0, 200);
  if (!title) return { error: "Title is required" };

  let slug = String(body?.slug || "").trim() || slugify(title);
  slug = slugify(slug);
  const slugError = validateSlug(slug);
  if (slugError) return { error: slugError };

  const timezone = String(body?.timezone || existing?.timezone || "Asia/Bangkok");
  if (!isValidTimezone(timezone)) return { error: "Unknown timezone" };

  const startsLocal = String(body?.startsAtLocal || "");
  const endsLocal = String(body?.endsAtLocal || "");
  if (!startsLocal || !endsLocal) return { error: "Start and end date/time are required" };
  let startsAt: Date, endsAt: Date;
  try {
    startsAt = zonedLocalToUtc(startsLocal, timezone);
    endsAt = zonedLocalToUtc(endsLocal, timezone);
  } catch {
    return { error: "Invalid date/time format" };
  }
  if (endsAt <= startsAt) return { error: "The event must end after it starts" };

  let registrationOpensAt: Date | null = null;
  let registrationClosesAt: Date | null = null;
  try {
    if (body?.registrationOpensAtLocal) registrationOpensAt = zonedLocalToUtc(String(body.registrationOpensAtLocal), timezone);
    if (body?.registrationClosesAtLocal) registrationClosesAt = zonedLocalToUtc(String(body.registrationClosesAtLocal), timezone);
  } catch {
    return { error: "Invalid registration window date/time" };
  }
  if (registrationOpensAt && registrationClosesAt && registrationClosesAt <= registrationOpensAt) {
    return { error: "Registration must close after it opens" };
  }

  let capacity: number | null = null;
  if (body?.capacity !== undefined && body?.capacity !== null && body?.capacity !== "") {
    capacity = parseInt(String(body.capacity), 10);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100000) {
      return { error: "Capacity must be a positive number (or blank for unlimited)" };
    }
  }

  let minAge: number | null = null;
  if (body?.minAge !== undefined && body?.minAge !== null && body?.minAge !== "") {
    minAge = parseInt(String(body.minAge), 10);
    if (!Number.isFinite(minAge) || minAge < 1 || minAge > 99) return { error: "Invalid minimum age" };
  }

  const faqsRaw = Array.isArray(body?.faqs) ? body.faqs : [];
  const faqs = faqsRaw
    .map((f: any) => ({ q: String(f?.q || "").trim().slice(0, 300), a: String(f?.a || "").trim().slice(0, 2000) }))
    .filter((f: any) => f.q && f.a)
    .slice(0, 20);

  return {
    values: {
      title,
      slug,
      subtitle: str(body?.subtitle),
      descriptionHtml: sanitizeRichText(String(body?.descriptionHtml || "")),
      startsAt,
      endsAt,
      timezone,
      registrationOpensAt,
      registrationClosesAt,
      capacity,
      showRemainingCapacity: body?.showRemainingCapacity !== false,
      dressCode: str(body?.dressCode),
      minAge,
      faqs,
      contactEmail: str(body?.contactEmail),
      contactPhone: str(body?.contactPhone),
      ogTitle: str(body?.ogTitle),
      ogDescription: str(body?.ogDescription),
      venueId: body?.venueId ? String(body.venueId) : null,
    },
  };
}

const MATERIAL_FIELDS: Array<keyof EventBodyValues> = ["startsAt", "endsAt", "timezone", "venueId", "title"];

function materialChanges(existing: typeof events.$inferSelect, values: EventBodyValues): string[] {
  const changed: string[] = [];
  for (const field of MATERIAL_FIELDS) {
    const before = existing[field as keyof typeof existing];
    const after = values[field];
    const a = before instanceof Date ? before.getTime() : before;
    const b = after instanceof Date ? after.getTime() : after;
    if (a !== b) changed.push(field);
  }
  return changed;
}

function serializeEvent(e: typeof events.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    subtitle: e.subtitle,
    descriptionHtml: e.descriptionHtml,
    heroImagePath: e.heroImagePath,
    heroImageAlt: e.heroImageAlt,
    gallery: e.gallery,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    startsAtLocal: utcToZonedLocal(e.startsAt, e.timezone),
    endsAtLocal: utcToZonedLocal(e.endsAt, e.timezone),
    timezone: e.timezone,
    registrationOpensAtLocal: e.registrationOpensAt ? utcToZonedLocal(e.registrationOpensAt, e.timezone) : null,
    registrationClosesAtLocal: e.registrationClosesAt ? utcToZonedLocal(e.registrationClosesAt, e.timezone) : null,
    capacity: e.capacity,
    showRemainingCapacity: e.showRemainingCapacity,
    dressCode: e.dressCode,
    minAge: e.minAge,
    faqs: e.faqs,
    contactEmail: e.contactEmail,
    contactPhone: e.contactPhone,
    ogTitle: e.ogTitle,
    ogDescription: e.ogDescription,
    venueId: e.venueId,
    status: e.status,
    publishedAt: e.publishedAt?.toISOString() ?? null,
    cancelledAt: e.cancelledAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

async function registrationAndCheckinCounts(businessId: string, eventId?: string) {
  const conditions = [eq(registrations.businessId, businessId)];
  if (eventId) conditions.push(eq(registrations.eventId, eventId));
  const regRows = await db
    .select({
      eventId: registrations.eventId,
      status: registrations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(registrations)
    .where(and(...conditions))
    .groupBy(registrations.eventId, registrations.status);
  const checkinConditions = [eq(tickets.businessId, businessId), sql`${tickets.checkedInAt} IS NOT NULL`];
  if (eventId) checkinConditions.push(eq(tickets.eventId, eventId));
  const checkinRows = await db
    .select({ eventId: tickets.eventId, count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(and(...checkinConditions))
    .groupBy(tickets.eventId);

  const map = new Map<string, { confirmed: number; cancelled: number; checkedIn: number }>();
  const entry = (id: string) => {
    let e = map.get(id);
    if (!e) { e = { confirmed: 0, cancelled: 0, checkedIn: 0 }; map.set(id, e); }
    return e;
  };
  for (const row of regRows) {
    if (row.status === "confirmed") entry(row.eventId).confirmed = row.count;
    else entry(row.eventId).cancelled = row.count;
  }
  for (const row of checkinRows) entry(row.eventId).checkedIn = row.count;
  return map;
}

async function deliveryStates(registrationIds: string[]): Promise<Map<string, string>> {
  if (registrationIds.length === 0) return new Map();
  const rows = await db
    .select({ registrationId: emailOutbox.registrationId, status: emailOutbox.status })
    .from(emailOutbox)
    .where(and(
      inArray(emailOutbox.registrationId, registrationIds),
      eq(emailOutbox.template, "registration_confirmation"),
    ));
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.registrationId) map.set(row.registrationId, row.status);
  }
  return map;
}
