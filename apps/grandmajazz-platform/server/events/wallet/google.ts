import { readFile } from "node:fs/promises";
import { eventsConfig, googleWalletConfigured } from "../config";
import { formatEventDateTime } from "../time";
import { countdownLabel } from "./passUpdates";
import type { WalletTicketData } from "./apple";
import type { EventRow, Venue } from "@shared/events-schema";

/**
 * Google Wallet adapter (event ticket class/object + signed "Save to Google
 * Wallet" JWT link). Feature-flagged; absent credentials → capability reports
 * unavailable. Until the issuer account is approved for publishing, saves work
 * only for test accounts registered in the issuer console (demo mode).
 *
 * Credential setup: docs/events/CREDENTIAL_SETUP.md
 */

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";

export function googleWalletAvailable(): boolean {
  return googleWalletConfigured();
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let cachedKey: ServiceAccountKey | null = null;
async function loadKey(): Promise<ServiceAccountKey> {
  if (cachedKey) return cachedKey;
  const raw = await readFile(eventsConfig.googleWallet.saKeyPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) throw new Error("Invalid Google service-account key file");
  cachedKey = { client_email: parsed.client_email, private_key: parsed.private_key };
  return cachedKey;
}

function classId(eventId: string): string {
  return `${eventsConfig.googleWallet.issuerId}.gj_event_${eventId.replace(/-/g, "")}`;
}
function objectId(ticketId: string): string {
  return `${eventsConfig.googleWallet.issuerId}.gj_ticket_${ticketId.replace(/-/g, "")}`;
}

function buildClass(data: Pick<WalletTicketData, "event" | "venue">) {
  const venueName = data.venue?.name || "Grandma Jazz";
  const address = data.venue
    ? [data.venue.addressLine1, data.venue.city, data.venue.country].filter(Boolean).join(", ")
    : "";
  return {
    id: classId(data.event.id),
    eventId: data.event.id,
    issuerName: "Grandma Jazz",
    eventName: { defaultValue: { language: "en", value: data.event.title } },
    logo: {
      sourceUri: { uri: `${eventsConfig.publicUrl}/events/assets/wallet-grandma-jazz-square.png` },
      contentDescription: { defaultValue: { language: "en", value: "Grandma Jazz" } },
    },
    // Apple's pass uses this same owner-supplied mark. Google controls its
    // own card chrome, but the wide logo, black card and field order match.
    wideLogo: {
      sourceUri: { uri: `${eventsConfig.publicUrl}/events/assets/wallet-grandma-jazz.png` },
      contentDescription: { defaultValue: { language: "en", value: "Grandma Jazz" } },
    },
    venue: {
      name: { defaultValue: { language: "en", value: venueName } },
      address: { defaultValue: { language: "en", value: address || venueName } },
    },
    dateTime: { start: data.event.startsAt.toISOString(), end: data.event.endsAt.toISOString() },
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: "#000000",
    textModulesData: [
      { id: "date", header: "DATE", body: formatEventDateTime(data.event.startsAt, data.event.timezone) },
      { id: "venue", header: "VENUE", body: venueName },
      { id: "status", header: "", body: countdownLabel(data.event) },
    ],
    classTemplateInfo: {
      cardTemplateOverride: { cardRowTemplateInfos: [
        { twoItems: {
          startItem: { firstValue: { fields: [{ fieldPath: "class.textModulesData['date']" }] } },
          endItem: { firstValue: { fields: [{ fieldPath: "class.textModulesData['venue']" }] } },
        } },
        { twoItems: {
          startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['attendee']" }] } },
          endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['ticket']" }] } },
        } },
      ] },
      cardBarcodeSectionDetails: {
        firstTopDetail: { fieldSelector: { fields: [{ fieldPath: "class.textModulesData['status']" }] } },
      },
    },
    homepageUri: { uri: `${eventsConfig.publicUrl}/events/${data.event.slug}`, description: "Event page" },
  };
}

/** Keep already-saved Google passes current when the organizer edits an event. */
export async function updateGoogleEvent(event: EventRow, venue: Venue | null): Promise<void> {
  if (!googleWalletConfigured()) return;
  try {
    await authedFetch(`/eventTicketClass/${encodeURIComponent(classId(event.id))}`, {
      method: "PATCH", body: buildClass({ event, venue }),
    });
  } catch (err: any) {
    // No class exists until the first attendee requests a Google pass.
    if ((err?.response?.status ?? err?.code) !== 404) {
      console.error("[events][wallet] Google event update failed:", redact(err));
    }
  }
}

function buildObject(data: WalletTicketData) {
  return {
    id: objectId(data.ticket.id),
    classId: classId(data.event.id),
    state: data.ticket.status === "valid" ? "ACTIVE" : "INACTIVE",
    ticketHolderName: data.attendeeName,
    ticketNumber: data.ticket.reference,
    textModulesData: [
      { id: "attendee", header: "ATTENDEE", body: data.attendeeName },
      { id: "ticket", header: "TICKET", body: data.ticket.reference },
    ],
    barcode: { type: "QR_CODE", value: data.qrContent },
    hexBackgroundColor: "#000000",
    linksModuleData: {
      uris: [{ uri: data.qrContent, description: "Your ticket page", id: "ticket" }],
    },
  };
}

async function authedFetch(pathname: string, init: { method: string; body?: unknown }) {
  const { JWT } = await import("google-auth-library");
  const key = await loadKey();
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
  const res = await client.request({
    url: `${WALLET_API}${pathname}`,
    method: init.method as any,
    data: init.body,
    timeout: 15_000,
  });
  return res.data as any;
}

/** Idempotently ensure class+object exist/updated, return a signed save URL. */
export async function createGoogleSaveUrl(data: WalletTicketData): Promise<string> {
  if (!googleWalletConfigured()) {
    throw new Error("Google Wallet is not configured (see docs/events/CREDENTIAL_SETUP.md)");
  }
  const cls = buildClass(data);
  const obj = buildObject(data);

  await upsert(`/eventTicketClass`, cls);
  await upsert(`/eventTicketObject`, obj);

  const key = await loadKey();
  const saveJwt = {
    iss: key.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: [eventsConfig.googleWallet.origin],
    payload: { eventTicketObjects: [{ id: obj.id }] },
  };
  const { createSign } = await import("node:crypto");
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(saveJwt)).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  const signature = signer.sign(key.private_key).toString("base64url");
  return `https://pay.google.com/gp/v/save/${header}.${body}.${signature}`;
}

async function upsert(resource: string, payload: { id: string }) {
  try {
    await authedFetch(resource, { method: "POST", body: payload });
  } catch (err: any) {
    const status = err?.response?.status ?? err?.code;
    if (status === 409) {
      // exists → update in place (material event/ticket changes propagate)
      await authedFetch(`${resource}/${encodeURIComponent(payload.id)}`, { method: "PATCH", body: payload });
      return;
    }
    throw err;
  }
}

/**
 * Broadcast a message onto Google Wallet objects (shows in the pass details;
 * Google may surface a notification). Best-effort per ticket; used by the
 * organizer "message pass holders" action when Google Wallet is configured.
 */
export async function addGoogleMessages(ticketIds: string[], header: string, body: string): Promise<number> {
  if (!googleWalletConfigured() || ticketIds.length === 0) return 0;
  let sent = 0;
  for (const id of ticketIds) {
    try {
      await authedFetch(`/eventTicketObject/${encodeURIComponent(objectId(id))}/addMessage`, {
        method: "POST",
        body: { message: { header: header.slice(0, 60), body: body.slice(0, 500), messageType: "TEXT_AND_NOTIFY" } },
      });
      sent++;
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code;
      if (status !== 404) console.error("[events][wallet] Google addMessage failed:", redact(err));
    }
  }
  return sent;
}

function redact(err: any): string {
  return String(err?.message || err).slice(0, 200);
}

/** Mark a ticket's wallet object inactive (cancellation). Best-effort. */
export async function invalidateGoogleObject(ticketId: string): Promise<void> {
  return setGoogleObjectState(ticketId, "INACTIVE");
}

export async function setGoogleObjectState(ticketId: string, state: "ACTIVE" | "INACTIVE"): Promise<void> {
  if (!googleWalletConfigured()) return;
  try {
    await authedFetch(`/eventTicketObject/${encodeURIComponent(objectId(ticketId))}`, {
      method: "PATCH",
      body: { state },
    });
  } catch (err) {
    console.error("[events][wallet] failed to update Google object:", redact(err));
  }
}
