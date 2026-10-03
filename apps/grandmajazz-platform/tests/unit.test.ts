import { describe, expect, it } from "vitest";
import { slugify, validateSlug, sanitizeRichText, htmlToText, escapeHtml } from "../server/events/content";
import { generateTicketReference, normalizeEmail, normalizePhone, ticketToken, ticketTokenHash, sha256 } from "../server/events/security";
import { zonedLocalToUtc, utcToZonedLocal, isValidTimezone, formatEventDateTime } from "../server/events/time";
import { buildEventIcs, googleCalendarUrl } from "../server/events/ics";
import type { EventRow, Venue } from "../shared/events-schema";

describe("slugs", () => {
  it("slugifies titles", () => {
    expect(slugify("Sunday Jazz — Night No. 5!")).toBe("sunday-jazz-night-no-5");
    expect(slugify("  áccênted TITLE  ")).toBe("accented-title");
  });
  it("rejects reserved and malformed slugs", () => {
    for (const bad of ["manage", "api", "t", "platform", "login", "static", "admin", "health"]) {
      expect(validateSlug(bad), bad).toBeTruthy();
    }
    expect(validateSlug("UPPER")).toBeTruthy();
    expect(validateSlug("-lead")).toBeTruthy();
    expect(validateSlug("a")).toBeTruthy();
    expect(validateSlug("sunday-jazz-5")).toBeNull();
  });
});

describe("rich text sanitizer", () => {
  it("strips scripts, event handlers and dangerous URLs", () => {
    const dirty = `<p onclick="x()">hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>`;
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("<img");
    expect(clean).toContain("<p>hi</p>");
  });
  it("keeps the allowlist and hardens links", () => {
    const clean = sanitizeRichText(`<h2>About</h2><ul><li><strong>bold</strong></li></ul><a href="https://x.example">x</a>`);
    expect(clean).toContain("<h2>About</h2>");
    expect(clean).toContain('rel="noopener noreferrer"');
  });
  it("htmlToText flattens markup", () => {
    expect(htmlToText("<p>a</p><p>b</p>")).toContain("a");
    expect(htmlToText("<script>x</script>hello")).toBe("hello");
  });
  it("escapeHtml covers quotes", () => {
    expect(escapeHtml(`<x> & "y" 'z'`)).toBe("&lt;x&gt; &amp; &quot;y&quot; &#39;z&#39;");
  });
});

describe("tokens and normalization", () => {
  it("ticket tokens are deterministic per id, high-entropy, and hash-consistent", () => {
    const t1 = ticketToken("11111111-1111-1111-1111-111111111111");
    const t2 = ticketToken("22222222-2222-2222-2222-222222222222");
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(40);
    expect(ticketTokenHash("11111111-1111-1111-1111-111111111111")).toBe(sha256(t1));
  });
  it("ticket references use the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTicketReference()).toMatch(/^GJ-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    }
  });
  it("normalizes email and phone; rejects junk phones without over-rejecting international", () => {
    expect(normalizeEmail("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(normalizePhone("+66 (81) 234-5678")).toBe("+66812345678");
    expect(normalizePhone("081 234 5678")).toBe("0812345678");
    expect(normalizePhone("not a phone")).toBeNull();
  });
});

describe("timezone handling", () => {
  it("converts Bangkok wall-clock to UTC and back", () => {
    const utc = zonedLocalToUtc("2026-08-01T19:00", "Asia/Bangkok");
    expect(utc.toISOString()).toBe("2026-08-01T12:00:00.000Z");
    expect(utcToZonedLocal(utc, "Asia/Bangkok")).toBe("2026-08-01T19:00");
  });
  it("handles DST zones via fixpoint", () => {
    const summer = zonedLocalToUtc("2026-07-01T12:00", "Europe/London"); // BST +1
    expect(summer.toISOString()).toBe("2026-07-01T11:00:00.000Z");
    const winter = zonedLocalToUtc("2026-01-01T12:00", "Europe/London"); // GMT
    expect(winter.toISOString()).toBe("2026-01-01T12:00:00.000Z");
  });
  it("validates timezones", () => {
    expect(isValidTimezone("Asia/Bangkok")).toBe(true);
    expect(isValidTimezone("Mars/OlympusMons")).toBe(false);
  });
  it("formats in the event timezone with 12-hour AM/PM", () => {
    const evening = new Date("2026-08-01T12:00:00Z"); // 19:00 Bangkok
    expect(formatEventDateTime(evening, "Asia/Bangkok")).toContain("7:00 PM");
    const afternoon = new Date("2026-07-11T09:20:00Z"); // 16:20 Bangkok
    expect(formatEventDateTime(afternoon, "Asia/Bangkok")).toContain("4:20 PM");
    const morning = new Date("2026-08-01T03:05:00Z"); // 10:05 Bangkok
    expect(formatEventDateTime(morning, "Asia/Bangkok")).toContain("10:05 AM");
  });
});

describe("ICS generation", () => {
  const event = {
    id: "e1",
    slug: "test-night",
    title: "Test Night; with, specials\nand newline",
    startsAt: new Date("2026-08-01T12:00:00Z"),
    endsAt: new Date("2026-08-01T16:00:00Z"),
    status: "published",
    descriptionHtml: "<p>desc</p>",
  } as unknown as EventRow;
  const venue = { name: "Grandma Jazz", addressLine1: "Cherngtalay", city: "Phuket", country: "Thailand", latitude: "7.99", longitude: "98.29" } as unknown as Venue;

  it("produces structurally valid, escaped, CRLF-folded ICS", () => {
    const ics = buildEventIcs(event, venue, { descriptionText: "A long description ".repeat(10) });
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    expect(ics).toContain("UID:event-e1@grandmajazz.com");
    expect(ics).toContain("DTSTART:20260801T120000Z");
    expect(ics).toContain("DTEND:20260801T160000Z");
    expect(ics).toContain("SUMMARY:Test Night\\; with\\, specials\\nand newline");
    expect(ics).toContain("GEO:7.99;98.29");
    // every line ≤ 75 octets after folding
    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8"), line).toBeLessThanOrEqual(76);
    }
  });
  it("emits METHOD:CANCEL + STATUS:CANCELLED for cancelled events", () => {
    const ics = buildEventIcs(event, venue, { cancelled: true, sequence: 2 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:2");
  });
  it("builds a Google Calendar link with UTC bounds", () => {
    const url = googleCalendarUrl(event, venue);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("20260801T120000Z%2F20260801T160000Z");
  });
});

describe("rich text images", () => {
  it("keeps only our own uploaded images", () => {
    const clean = sanitizeRichText(
      `<img src="/events/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp" alt="the room">` +
      `<img src="https://evil.example/x.png">` +
      `<img src="/etc/passwd">` +
      `<img src="/events/uploads/../../.env">`,
    );
    expect(clean).toBe(`<img src="/events/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp" alt="the room" />`);
  });
});
