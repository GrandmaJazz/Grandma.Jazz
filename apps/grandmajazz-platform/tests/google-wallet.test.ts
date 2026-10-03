import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletTicketData } from "../server/events/wallet/apple";

const request = vi.hoisted(() => vi.fn());
vi.mock("google-auth-library", () => ({ JWT: class { request = request; } }));
import { createGoogleSaveUrl, updateGoogleEvent, setGoogleObjectState, addGoogleMessages } from "../server/events/wallet/google";

const data = {
  event: { id: "event-1", title: "Jazz Night", slug: "jazz-night", startsAt: new Date("2027-01-15T12:00Z"), endsAt: new Date("2027-01-15T16:00Z") },
  venue: { name: "Grandma Jazz", city: "Kamala", country: "Thailand" },
  ticket: { id: "ticket-1", reference: "GJ-TEST-PASS", status: "valid" },
  attendeeName: "Test Guest", qrContent: "https://www.grandmajazz.com/events/t/test-token",
} as WalletTicketData;
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "gj-google-"));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  writeFileSync(path.join(dir, "key.json"), JSON.stringify({ client_email: "fixture@example.test", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
  vi.stubEnv("GOOGLE_WALLET_ENABLED", "true");
  vi.stubEnv("GOOGLE_WALLET_ISSUER_ID", "123456");
  vi.stubEnv("GOOGLE_WALLET_SA_KEY_PATH", path.join(dir, "key.json"));
});
beforeEach(() => request.mockReset().mockResolvedValue({ data: {} }));
afterAll(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

describe("Google Wallet", () => {
  it("creates an event ticket and signed save link containing its object ID", async () => {
    const url = await createGoogleSaveUrl(data);
    expect(url).toMatch(/^https:\/\/pay.google.com\/gp\/v\/save\//);
    const jwt = JSON.parse(Buffer.from(url.split("/").pop()!.split(".")[1], "base64url").toString());
    expect(jwt.payload.eventTicketObjects).toEqual([{ id: "123456.gj_ticket_ticket1" }]);
    const cls = request.mock.calls[0][0].data;
    expect(cls.hexBackgroundColor).toBe("#000000");
    expect(cls.logo.sourceUri.uri).toContain("/events/assets/wallet-grandma-jazz-square.png");
    expect(cls.wideLogo.sourceUri.uri).toContain("/events/assets/wallet-grandma-jazz.png");
    expect(cls.classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos).toHaveLength(2);
    expect(cls.textModulesData.map((field: { id: string }) => field.id)).toEqual(["date", "venue", "status"]);
    expect(request.mock.calls[1][0].data.barcode.value).toBe(data.qrContent);
    expect(request.mock.calls[1][0].data.textModulesData).toEqual([
      { id: "attendee", header: "ATTENDEE", body: "Test Guest" },
      { id: "ticket", header: "TICKET", body: "GJ-TEST-PASS" },
    ]);
  });
  it("patches an existing pass without replacing previously sent messages", async () => {
    request.mockRejectedValueOnce({ response: { status: 409 } }).mockResolvedValue({ data: {} });
    await createGoogleSaveUrl(data);
    expect(request.mock.calls[1][0].method).toBe("PATCH");
    expect(request.mock.calls[1][0].data).not.toHaveProperty("messages");
  });
  it("updates date and venue on passes already saved to phones", async () => {
    await updateGoogleEvent(data.event, data.venue);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: "PATCH", url: expect.stringContaining("/eventTicketClass/123456.gj_event_event1"),
      data: expect.objectContaining({ dateTime: { start: data.event.startsAt.toISOString(), end: data.event.endsAt.toISOString() } }),
    }));
  });
  it("deactivates and restores a ticket and sends an announcement", async () => {
    await setGoogleObjectState(data.ticket.id, "INACTIVE");
    await setGoogleObjectState(data.ticket.id, "ACTIVE");
    expect(request.mock.calls.slice(0, 2).map(([arg]) => arg.data.state)).toEqual(["INACTIVE", "ACTIVE"]);
    expect(await addGoogleMessages([data.ticket.id], "Event update", "Event cancelled")).toBe(1);
    expect(request.mock.calls[2][0].data.message.messageType).toBe("TEXT_AND_NOTIFY");
  });
});
