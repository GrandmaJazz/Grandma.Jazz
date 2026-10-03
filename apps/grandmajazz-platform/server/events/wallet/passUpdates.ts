import { connect as http2Connect } from "node:http2";
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db, pool } from "../../db";
import { events, passRegistrations, registrations, tickets, venues } from "@shared/events-schema";
import { appleWalletConfigured, eventsConfig, googleWalletConfigured } from "../config";
import { passAuthToken, rateLimit } from "../security";
import { generateApplePass, type WalletTicketData } from "./apple";

/**
 * Apple Wallet pass-update pipeline:
 *   1. A pass carries webServiceURL + authenticationToken; the device
 *      registers here (device id + APNs push token per pass serial).
 *   2. When pass content changes (check-in, broadcast message, countdown,
 *      event edit/cancel) we bump ev_tickets.pass_updated_at and send an
 *      empty APNs push using the pass signing certificate.
 *   3. The device asks "what changed since <tag>?", re-fetches the .pkpass,
 *      and Wallet re-renders the card — including a lock-screen notification
 *      for any field with a changeMessage (the broadcast message field).
 *
 * Serial number == ticket id (stable). Auth token is a recomputable HMAC.
 */

const APNS_HOST = "https://api.push.apple.com";

// ------------------------------------------------------------- data assembly

export interface PassDynamicContent {
  countdownLabel: string;
  message: string | null;
  checkedIn: boolean;
  cancelled: boolean;
}

export async function loadPassBundle(serial: string) {
  if (!/^[0-9a-f-]{36}$/.test(serial)) return null;
  const [row] = await db
    .select({ ticket: tickets, reg: registrations, event: events })
    .from(tickets)
    .innerJoin(registrations, eq(registrations.id, tickets.registrationId))
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(eq(tickets.id, serial))
    .limit(1);
  if (!row) return null;
  const [venue] = row.event.venueId
    ? await db.select().from(venues).where(eq(venues.id, row.event.venueId)).limit(1)
    : [null];
  return { ...row, venue: venue ?? null };
}

/** "TONIGHT" / "TOMORROW" / "IN 12 DAYS" / "HAPPENING NOW" / "Thanks for coming — Grandma Jazz" — in the event tz. */
export function countdownLabel(event: { startsAt: Date; endsAt: Date; timezone: string; status: string }, now = new Date()): string {
  if (event.status === "cancelled") return "CANCELLED";
  if (now >= event.endsAt) return "Thanks for coming — Grandma Jazz";
  if (now >= event.startsAt) return "HAPPENING NOW";
  const dayIn = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: event.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const today = dayIn(now);
  const eventDay = dayIn(event.startsAt);
  if (today === eventDay) return "TONIGHT";
  const days = Math.round((Date.parse(eventDay) - Date.parse(today)) / 86_400_000);
  if (days === 1) return "TOMORROW";
  return `IN ${days} DAYS`;
}

export function dynamicContentFor(bundle: NonNullable<Awaited<ReturnType<typeof loadPassBundle>>>): PassDynamicContent {
  const cancelled = bundle.event.status === "cancelled" || bundle.ticket.status === "cancelled";
  return {
    countdownLabel: cancelled ? "CANCELLED" : new Date() >= bundle.event.endsAt ? "Thanks for coming — Grandma Jazz" : bundle.ticket.checkedInAt ? "CHECKED IN" : countdownLabel(bundle.event),
    message: bundle.event.passMessage,
    checkedIn: !!bundle.ticket.checkedInAt,
    cancelled,
  };
}

export async function buildPassForSerial(serial: string): Promise<Buffer | null> {
  const bundle = await loadPassBundle(serial);
  if (!bundle) return null;
  const { ticketToken } = await import("../security");
  const data: WalletTicketData = {
    event: bundle.event,
    venue: bundle.venue,
    ticket: bundle.ticket,
    attendeeName: bundle.reg.fullName,
    qrContent: `${eventsConfig.publicUrl}/events/t/${ticketToken(bundle.ticket.id)}`,
    dynamic: dynamicContentFor(bundle),
  };
  return generateApplePass(data);
}

// ------------------------------------------------------------------ APNs push

let apnsWarned = false;

/** Empty APNs push per registered device → Wallet re-fetches the pass. */
export async function pushPassUpdates(ticketIds: string[]): Promise<{ pushed: number; dropped: number }> {
  if (ticketIds.length === 0) return { pushed: 0, dropped: 0 };
  if (process.env.EVENTS_DISABLE_APNS_PUSH === "1") {
    // tests: bump timestamps (below would normally do it) without network I/O
    await db.update(tickets).set({ passUpdatedAt: new Date(), updatedAt: new Date() })
      .where(inArray(tickets.id, ticketIds));
    return { pushed: 0, dropped: 0 };
  }
  if (!appleWalletConfigured()) {
    if (!apnsWarned) { console.log("[events][wallet] APNs push skipped (Apple Wallet not configured)"); apnsWarned = true; }
    return { pushed: 0, dropped: 0 };
  }
  // bump first so a re-fetch triggered by the push sees fresh Last-Modified
  await db.update(tickets).set({ passUpdatedAt: new Date(), updatedAt: new Date() })
    .where(inArray(tickets.id, ticketIds));

  const regs = await db.select().from(passRegistrations)
    .where(inArray(passRegistrations.ticketId, ticketIds));
  if (regs.length === 0) return { pushed: 0, dropped: 0 };

  const cfg = eventsConfig.appleWallet;
  const client = http2Connect(APNS_HOST, {
    cert: readFileSync(cfg.certPath),
    key: readFileSync(cfg.keyPath),
    passphrase: cfg.keyPassphrase || undefined,
  });
  client.on("error", (err) => console.error("[events][wallet] APNs connection error:", err.message));

  let pushed = 0, dropped = 0;
  try {
    for (const reg of regs) {
      const status = await new Promise<number>((resolve) => {
        const req = client.request({
          ":method": "POST",
          ":path": `/3/device/${reg.pushToken}`,
          "apns-topic": cfg.passTypeId,
          "apns-push-type": "background",
          "apns-priority": "5",
        });
        const timer = setTimeout(() => { req.close(); resolve(0); }, 10_000);
        req.on("response", (headers) => { clearTimeout(timer); resolve(Number(headers[":status"]) || 0); });
        req.on("error", () => { clearTimeout(timer); resolve(0); });
        req.end("{}");
      });
      if (status === 200) pushed++;
      else if (status === 410) {
        // token gone (pass removed from the device) → drop the registration
        await db.delete(passRegistrations).where(eq(passRegistrations.id, reg.id));
        dropped++;
      } else {
        console.error(`[events][wallet] APNs push rejected (status=${status}); registration retained for retry`);
      }
    }
  } finally {
    client.close();
  }
  if (pushed || dropped) console.log(`[events][wallet] APNs: ${pushed} pushed, ${dropped} stale registrations dropped`);
  return { pushed, dropped };
}

/** Bump + push every registered pass of an event (message, edit, cancel…). */
export async function pushEventPassUpdates(eventId: string): Promise<{ pushed: number }> {
  const rows = await db
    .select({ ticketId: passRegistrations.ticketId })
    .from(passRegistrations)
    .innerJoin(tickets, eq(tickets.id, passRegistrations.ticketId))
    .where(eq(tickets.eventId, eventId));
  const ids = Array.from(new Set(rows.map((r) => r.ticketId)));
  const result = await pushPassUpdates(ids);
  return { pushed: result.pushed };
}

export async function passHolderStats(eventId: string): Promise<{ passes: number; devices: number; googlePasses: number }> {
  const [row] = await db
    .select({
      passes: sql<number>`count(DISTINCT ${passRegistrations.ticketId})::int`,
      devices: sql<number>`count(DISTINCT ${passRegistrations.deviceLibraryId})::int`,
    })
    .from(passRegistrations)
    .innerJoin(tickets, eq(tickets.id, passRegistrations.ticketId))
    .where(eq(tickets.eventId, eventId));
  const [google] = await db.select({ count: sql<number>`count(*)::int` }).from(tickets)
    .where(and(eq(tickets.eventId, eventId), sql`${tickets.googleObjectId} IS NOT NULL`));
  return { passes: row?.passes ?? 0, devices: row?.devices ?? 0, googlePasses: google?.count ?? 0 };
}

// ----------------------------------------------- countdown refresh worker

let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Hourly: recompute each live event's countdown label; when it changes
 * (a day rolls over in the event's timezone, the event starts/ends) push all
 * its passes so the card design stays current without any manual action.
 */
export function startPassRefreshWorker(): void {
  if (refreshTimer || (!appleWalletConfigured() && !googleWalletConfigured())) return;
  void refreshCountdowns().catch((err) => console.error("[events][wallet] initial countdown refresh failed:", err));
  refreshTimer = setInterval(() => {
    void refreshCountdowns().catch((err) => console.error("[events][wallet] countdown refresh failed:", err));
  }, 60 * 60 * 1000);
  refreshTimer.unref?.();
  console.log("[events] wallet pass refresh worker started (hourly)");
}

export function stopPassRefreshWorker(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

export async function refreshCountdowns(): Promise<number> {
  const candidates = await db.select().from(events)
    .where(and(
      inArray(events.status, ["published", "registration_closed", "completed", "cancelled"]),
      gt(events.endsAt, sql`now() - interval '2 days'`),
    ));
  let refreshed = 0;
  for (const event of candidates) {
    const tag = countdownLabel(event);
    if (tag !== event.passCountdownTag) {
      await db.update(events).set({ passCountdownTag: tag }).where(eq(events.id, event.id));
      const { pushed } = await pushEventPassUpdates(event.id);
      if (googleWalletConfigured()) {
        const [venue] = event.venueId
          ? await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1)
          : [null];
        const { updateGoogleEvent } = await import("./google");
        await updateGoogleEvent(event, venue ?? null);
      }
      if (pushed > 0) refreshed += pushed;
    }
  }
  return refreshed;
}

// ------------------------------------------------- Apple web-service router

function checkPassAuth(header: string | undefined, serial: string): boolean {
  const token = (header || "").replace(/^ApplePass\s+/i, "").trim();
  if (!token) return false;
  const expected = passAuthToken(serial);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Implements the Apple Wallet web service (webServiceURL points here; iOS
 * appends /v1/...). Spec: "Adding a Web Service to Update Passes".
 */
export function appleWebServiceRouter(): Router {
  const r = Router();
  const guard = rateLimit("wallet-ws", 60, 2);

  // register a device for pass updates
  r.post("/v1/devices/:deviceId/registrations/:passTypeId/:serial", guard, async (req, res, next) => {
    try {
      if (!checkPassAuth(req.headers.authorization, req.params.serial)) {
        res.status(401).send(); return;
      }
      const pushToken = String(req.body?.pushToken || "");
      if (!pushToken || req.params.passTypeId !== eventsConfig.appleWallet.passTypeId) {
        res.status(400).send(); return;
      }
      const bundle = await loadPassBundle(req.params.serial);
      if (!bundle) { res.status(404).send(); return; }
      const { rowCount } = await pool.query(
        `INSERT INTO ev_pass_registrations (ticket_id, pass_type_id, device_library_id, push_token)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (device_library_id, ticket_id)
         DO UPDATE SET push_token = EXCLUDED.push_token, updated_at = now()
         WHERE ev_pass_registrations.push_token IS DISTINCT FROM EXCLUDED.push_token`,
        [req.params.serial, req.params.passTypeId, req.params.deviceId, pushToken],
      );
      res.status(rowCount ? 201 : 200).send();
    } catch (err) { next(err); }
  });

  // which of this device's passes changed since <tag>?
  r.get("/v1/devices/:deviceId/registrations/:passTypeId", guard, async (req, res, next) => {
    try {
      const since = String(req.query.passesUpdatedSince || "");
      const sinceDate = /^\d+$/.test(since) ? new Date(Number(since)) : null;
      const rows = await db
        .select({ serial: passRegistrations.ticketId, updatedAt: tickets.passUpdatedAt })
        .from(passRegistrations)
        .innerJoin(tickets, eq(tickets.id, passRegistrations.ticketId))
        .where(eq(passRegistrations.deviceLibraryId, req.params.deviceId));
      const changed = rows.filter((row) => !sinceDate || row.updatedAt > sinceDate);
      if (rows.length === 0) { res.status(404).send(); return; }
      if (changed.length === 0) { res.status(204).send(); return; }
      const lastUpdated = Math.max(...changed.map((row) => row.updatedAt.getTime()));
      res.json({ lastUpdated: String(lastUpdated), serialNumbers: changed.map((row) => row.serial) });
    } catch (err) { next(err); }
  });

  // fetch the latest pass
  r.get("/v1/passes/:passTypeId/:serial", guard, async (req, res, next) => {
    try {
      if (!checkPassAuth(req.headers.authorization, req.params.serial)) {
        res.status(401).send(); return;
      }
      const bundle = await loadPassBundle(req.params.serial);
      if (!bundle) { res.status(404).send(); return; }
      const modified = bundle.ticket.passUpdatedAt;
      const ims = req.headers["if-modified-since"];
      if (ims && new Date(ims).getTime() >= Math.floor(modified.getTime() / 1000) * 1000) {
        res.status(304).send(); return;
      }
      const pkpass = await buildPassForSerial(req.params.serial);
      if (!pkpass) { res.status(404).send(); return; }
      res.set("Content-Type", "application/vnd.apple.pkpass");
      res.set("Last-Modified", modified.toUTCString());
      res.set("Cache-Control", "no-cache");
      res.send(pkpass);
    } catch (err) { next(err); }
  });

  // unregister
  r.delete("/v1/devices/:deviceId/registrations/:passTypeId/:serial", guard, async (req, res, next) => {
    try {
      if (!checkPassAuth(req.headers.authorization, req.params.serial)) {
        res.status(401).send(); return;
      }
      await db.delete(passRegistrations).where(and(
        eq(passRegistrations.deviceLibraryId, req.params.deviceId),
        eq(passRegistrations.ticketId, req.params.serial),
      ));
      res.status(200).send();
    } catch (err) { next(err); }
  });

  // device-side error reporting
  r.post("/v1/log", guard, (req, res) => {
    const logs = Array.isArray(req.body?.logs) ? req.body.logs.slice(0, 10) : [];
    for (const line of logs) console.warn("[events][wallet][device-log]", String(line).slice(0, 300));
    res.status(200).send();
  });

  return r;
}
