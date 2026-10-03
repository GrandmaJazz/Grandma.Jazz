import { readFile } from "node:fs/promises";
import { appleWalletConfigured, eventsConfig } from "../config";
import { passAuthToken } from "../security";
import { formatEventDateTime } from "../time";
import type { EventRow, Ticket, Venue } from "@shared/events-schema";

/**
 * Apple Wallet adapter. Feature-flagged: when credentials are absent the
 * capability reports unavailable and no endpoint pretends to issue passes.
 * Uses passkit-generator (imported lazily so the app runs without the
 * dependency chain being exercised until the feature is on).
 *
 * Credential setup: docs/events/CREDENTIAL_SETUP.md
 */

export interface WalletTicketData {
  event: EventRow;
  venue: Venue | null;
  ticket: Ticket;
  attendeeName: string;
  qrContent: string; // opaque ticket URL — no PII
  /** live content (countdown chip, broadcast message, check-in state) */
  dynamic?: import("./passUpdates").PassDynamicContent;
}

export function appleWalletAvailable(): boolean {
  return appleWalletConfigured();
}

export async function generateApplePass(data: WalletTicketData): Promise<Buffer> {
  if (!appleWalletConfigured()) {
    throw new Error("Apple Wallet is not configured (see docs/events/CREDENTIAL_SETUP.md)");
  }
  const cfg = eventsConfig.appleWallet;
  const { PKPass } = await import("passkit-generator");

  const [signerCert, signerKey, wwdr] = await Promise.all([
    readFile(cfg.certPath),
    readFile(cfg.keyPath),
    readFile(cfg.wwdrPath),
  ]);

  const pass = new PKPass(
    {},
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase: cfg.keyPassphrase || undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: cfg.passTypeId,
      teamIdentifier: cfg.teamId,
      organizationName: "Grandma Jazz",
      description: `Ticket — ${data.event.title}`,
      serialNumber: data.ticket.id, // stable serial per ticket
      // Grandma Jazz brand within Apple constraints: black ground, white text
      backgroundColor: "rgb(0,0,0)",
      foregroundColor: "rgb(255,255,255)",
      labelColor: "rgb(153,153,153)",
      // pass-update web service: devices register here and get pushed when
      // the pass content changes (countdown, check-in, broadcast messages)
      webServiceURL: `${eventsConfig.publicUrl}/events/api/v1/wallet/apple`,
      authenticationToken: passAuthToken(data.ticket.id),
      voided: data.event.status === "cancelled" || data.dynamic?.cancelled || data.ticket.status !== "valid" || undefined,
      sharingProhibited: true,
    },
  );
  pass.type = "eventTicket";
  pass.setBarcodes({
    message: data.qrContent,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
  });
  pass.setRelevantDate(data.event.startsAt);
  if (data.venue?.latitude && data.venue?.longitude) {
    pass.setLocations({
      latitude: parseFloat(data.venue.latitude),
      longitude: parseFloat(data.venue.longitude),
    });
  }
  const dyn = data.dynamic;
  if (dyn) {
    // header sits beside the logo — the "live" element of the card
    pass.headerFields.push({
      key: "countdown", label: "", value: dyn.countdownLabel === "Thanks for coming — Grandma Jazz" ? "THANK YOU" : dyn.countdownLabel,
    });
  }
  // no label: iOS draws the value over the strip artwork; a label would
  // double up with the strip and the header countdown chip
  pass.primaryFields.push({ key: "event", label: "", value: dyn?.countdownLabel === "Thanks for coming — Grandma Jazz" ? "Thanks for coming — Grandma Jazz" : data.event.title, changeMessage: "Event updated: %@" });
  pass.secondaryFields.push(
    { key: "when", label: "DATE", value: formatEventDateTime(data.event.startsAt, data.event.timezone), changeMessage: "Event date updated: %@" },
  );
  if (data.venue) {
    pass.secondaryFields.push({ key: "venue", label: "VENUE", value: data.venue.name, changeMessage: "Event venue updated: %@" });
  }
  pass.auxiliaryFields.push(
    { key: "attendee", label: "ATTENDEE", value: data.attendeeName },
    { key: "ref", label: "TICKET", value: data.ticket.reference },
  );
  if (dyn?.countdownLabel === "Thanks for coming — Grandma Jazz") {
    pass.backFields.push({ key: "eventName", label: "EVENT", value: data.event.title });
  }
  pass.backFields.push({
    key: "status", label: "STATUS",
    value: data.event.status === "cancelled" ? "Event cancelled" : dyn?.cancelled || data.ticket.status === "cancelled" ? "Ticket cancelled" : data.ticket.status === "expired" ? "Ticket expired" : "Valid ticket",
    changeMessage: "%@",
  });
  {
    // changeMessage → iOS shows a lock-screen notification with the new value
    // whenever a pushed update alters this field (the broadcast mechanism)
    pass.backFields.push({
      key: "message", label: "FROM GRANDMA", value: dyn?.message || "See you at Grandma Jazz.", changeMessage: "%@",
    });
  }
  if (data.event.minAge) {
    pass.backFields.push({ key: "age", label: "ENTRY", value: `${data.event.minAge}+ event` });
  }
  pass.backFields.push({
    key: "link", label: "YOUR TICKET", value: data.qrContent,
  });

  // Required images: icon + logo. Brand assets live beside the app source.
  const assetDir = cfg.assetDir;
  for (const asset of ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png"]) {
    try {
      pass.addBuffer(asset, await readFile(`${assetDir}/${asset}`));
    } catch {
      throw new Error(`Apple Wallet asset missing: ${assetDir}/${asset} (see CREDENTIAL_SETUP.md)`);
    }
  }

  // dynamic strip artwork — re-rendered on every fetch so the card visibly
  // changes (IN 5 DAYS → TONIGHT → HAPPENING NOW → CHECKED IN / Thanks for coming)
  if (dyn) {
    const { renderStrip } = await import("./stripImage");
    const spec = {
      eventTitle: data.event.title,
      label: dyn.countdownLabel,
      emphasize: dyn.checkedIn || ["TONIGHT", "HAPPENING NOW"].includes(dyn.countdownLabel),
      cancelled: dyn.cancelled,
    };
    pass.addBuffer("strip.png", renderStrip(spec, 1));
    pass.addBuffer("strip@2x.png", renderStrip(spec, 2));
    pass.addBuffer("strip@3x.png", renderStrip(spec, 3));
  }

  return pass.getAsBuffer();
}
