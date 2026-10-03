import { eventsConfig } from "./config";
import type { EventRow, Venue } from "@shared/events-schema";

/** RFC 5545 text escaping. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Fold lines to 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // don't split multi-byte characters
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return out.join("\r\n");
}

export interface IcsOptions {
  /** SEQUENCE increments on material updates. */
  sequence?: number;
  /** METHOD:CANCEL + STATUS:CANCELLED for cancelled events. */
  cancelled?: boolean;
  descriptionText?: string;
}

/**
 * Build a VCALENDAR for an event. Times are emitted in UTC (Z) which every
 * major client converts to local time correctly; the event's wall-clock
 * timezone is communicated on the page/ticket/email surfaces.
 * UID is stable across regenerations: event id @ grandmajazz.com.
 */
export function buildEventIcs(event: EventRow, venue: Venue | null, opts: IcsOptions = {}): string {
  const uid = `event-${event.id}@grandmajazz.com`;
  const url = `${eventsConfig.publicUrl}/events/${event.slug}`;
  const location = venue
    ? [venue.name, venue.addressLine1, venue.city, venue.country].filter(Boolean).join(", ")
    : "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Grandma Jazz//Events//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(event.startsAt)}`,
    `DTEND:${icsUtc(event.endsAt)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `SEQUENCE:${opts.sequence ?? 0}`,
    `STATUS:${opts.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `URL:${icsEscape(url)}`,
  ];
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  const descParts = [opts.descriptionText?.trim(), url].filter(Boolean) as string[];
  if (descParts.length) lines.push(`DESCRIPTION:${descParts.map(icsEscape).join("\\n\\n")}`);
  if (venue?.latitude && venue?.longitude) lines.push(`GEO:${venue.latitude};${venue.longitude}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Google Calendar "add" link. */
export function googleCalendarUrl(event: EventRow, venue: Venue | null): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsUtc(event.startsAt)}/${icsUtc(event.endsAt)}`,
    details: `${eventsConfig.publicUrl}/events/${event.slug}`,
  });
  const location = venue
    ? [venue.name, venue.addressLine1, venue.city, venue.country].filter(Boolean).join(", ")
    : "";
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
