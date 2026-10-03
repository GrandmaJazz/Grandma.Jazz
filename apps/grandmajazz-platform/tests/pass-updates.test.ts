import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, createPublishedEvent, registrationPayload, pool, type TestActor } from "./helpers";

/**
 * Apple Wallet pass-update web service + broadcast messages.
 * Runs with self-signed fixture certs (APNs pushes disabled via
 * EVENTS_DISABLE_APNS_PUSH; the DB side of a push — the pass_updated_at bump —
 * still happens and is what the assertions use).
 */

function setupFixtureCerts() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gj-ws-"));
  const ossl = (args: string[]) => execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });
  ossl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem", "-days", "2", "-subj", "/CN=Fake WWDR/O=T/C=US"]);
  ossl(["req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", "signer.key", "-out", "signer.csr", "-subj", "/CN=Fake Signer/O=T/C=US"]);
  ossl(["x509", "-req", "-in", "signer.csr", "-CA", "ca.pem", "-CAkey", "ca.key", "-CAcreateserial", "-out", "signer.pem", "-days", "2"]);
  process.env.APPLE_WALLET_ENABLED = "true";
  process.env.APPLE_PASS_TYPE_ID = "pass.store.grandmajazz.events";
  process.env.APPLE_TEAM_ID = "TESTTEAM01";
  process.env.APPLE_PASS_CERT_PATH = path.join(dir, "signer.pem");
  process.env.APPLE_PASS_KEY_PATH = path.join(dir, "signer.key");
  process.env.APPLE_WWDR_CERT_PATH = path.join(dir, "ca.pem");
  process.env.APPLE_WALLET_ASSET_DIR = path.resolve("server/events/wallet/apple-assets");
}

const binaryParser = (res: any, cb: (err: any, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("pass updates & broadcasts", () => {
  let owner: TestActor;
  let event: { id: string; slug: string };
  let serial: string; // ticket id
  let authToken: string;
  const deviceId = "device-abc-123";
  const WS = "/events/api/v1/wallet/apple";

  beforeAll(async () => {
    setupFixtureCerts();
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Pass Biz" });
    event = await createPublishedEvent(owner, { capacity: 10 });
    const app = await getApp();
    const reg = await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(registrationPayload());
    expect(reg.status).toBe(201);
    const { rows } = await pool.query(`SELECT id FROM ev_tickets LIMIT 1`);
    serial = rows[0].id;
    const { passAuthToken } = await import("../server/events/security");
    authToken = passAuthToken(serial);
  });

  it("countdown labels progress correctly", async () => {
    const { countdownLabel } = await import("../server/events/wallet/passUpdates");
    const tz = "Asia/Bangkok";
    const ev = (startsAt: Date, endsAt: Date, status = "published") => ({ startsAt, endsAt, timezone: tz, status });
    const now = new Date("2027-01-10T05:00:00Z"); // Jan 10, 12:00 Bangkok
    expect(countdownLabel(ev(new Date("2027-01-10T12:00:00Z"), new Date("2027-01-10T16:00:00Z")), now)).toBe("TONIGHT");
    expect(countdownLabel(ev(new Date("2027-01-11T12:00:00Z"), new Date("2027-01-11T16:00:00Z")), now)).toBe("TOMORROW");
    expect(countdownLabel(ev(new Date("2027-01-22T12:00:00Z"), new Date("2027-01-22T16:00:00Z")), now)).toBe("IN 12 DAYS");
    expect(countdownLabel(ev(new Date("2027-01-10T04:00:00Z"), new Date("2027-01-10T16:00:00Z")), now)).toBe("HAPPENING NOW");
    expect(countdownLabel(ev(new Date("2027-01-09T12:00:00Z"), new Date("2027-01-09T16:00:00Z")), now)).toBe("Thanks for coming — Grandma Jazz");
    expect(countdownLabel(ev(new Date("2027-01-22T12:00:00Z"), new Date("2027-01-22T16:00:00Z"), "cancelled"), now)).toBe("CANCELLED");
  });

  it("device registration requires the pass auth token", async () => {
    const app = await getApp();
    const bad = await request(app)
      .post(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", "ApplePass wrong-token")
      .send({ pushToken: "apns-token-1" });
    expect(bad.status).toBe(401);

    const good = await request(app)
      .post(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`)
      .send({ pushToken: "apns-token-1" });
    expect(good.status).toBe(201);

    // idempotent re-registration
    const again = await request(app)
      .post(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`)
      .send({ pushToken: "apns-token-1" });
    expect(again.status).toBe(200);
  });

  it("lists updatable passes with passesUpdatedSince semantics", async () => {
    const app = await getApp();
    const all = await request(app).get(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events`);
    expect(all.status).toBe(200);
    expect(all.body.serialNumbers).toContain(serial);
    const tag = all.body.lastUpdated;

    const none = await request(app)
      .get(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events?passesUpdatedSince=${tag}`);
    expect(none.status).toBe(204);

    const unknownDevice = await request(app)
      .get(`${WS}/v1/devices/nope/registrations/pass.store.grandmajazz.events`);
    expect(unknownDevice.status).toBe(404);
  });

  it("serves the latest signed pass with Last-Modified / 304 handling", async () => {
    const app = await getApp();
    const res = await request(app)
      .get(`${WS}/v1/passes/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`)
      .buffer(true).parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("pkpass");
    expect(res.headers["last-modified"]).toBeTruthy();
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe("PK");

    const notModified = await request(app)
      .get(`${WS}/v1/passes/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`)
      .set("If-Modified-Since", res.headers["last-modified"]);
    expect(notModified.status).toBe(304);

    const unauthorized = await request(app).get(`${WS}/v1/passes/pass.store.grandmajazz.events/${serial}`);
    expect(unauthorized.status).toBe(401);
  });

  it("broadcast message: preview → confirm bumps passes and renders on the pass", async () => {
    const app = await getApp();
    const preview = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/pass-message`)
      .send({ message: "Doors open 18:30 tonight, my dears.", confirm: false });
    expect(preview.status).toBe(200);
    expect(preview.body.preview).toBe(true);
    expect(preview.body.passes).toBe(1);

    const before = await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial]);
    const sent = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/pass-message`)
      .send({ message: "Doors open 18:30 tonight, my dears.", confirm: true });
    expect(sent.status).toBe(200);
    expect(sent.body.ok).toBe(true);
    const after = await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial]);
    expect(new Date(after.rows[0].pass_updated_at).getTime())
      .toBeGreaterThan(new Date(before.rows[0].pass_updated_at).getTime());

    // the fresh pass carries the message field with a changeMessage
    const res = await request(app)
      .get(`${WS}/v1/passes/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`)
      .buffer(true).parse(binaryParser);
    expect(res.status).toBe(200);
    const passJson = extractPassJson(res.body as Buffer);
    const msgField = passJson.eventTicket.backFields.find((f: any) => f.key === "message");
    expect(msgField.value).toBe("Doors open 18:30 tonight, my dears.");
    expect(msgField.changeMessage).toBe("%@");
    expect(passJson.webServiceURL).toContain("/events/api/v1/wallet/apple");
    expect(passJson.authenticationToken).toBe(authToken);
    // dynamic strip artwork included
    expect(res.body.toString("latin1")).toContain("strip.png");
  });

  it("check-in flips the pass content (bump + CHECKED IN)", async () => {
    const before = await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial]);
    const scan = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: `GJ-${(await refFor(serial)).slice(3)}` });
    expect(scan.body.result).toBe("checked_in");
    await new Promise((r) => setTimeout(r, 300)); // push is fire-and-forget
    const after = await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial]);
    expect(new Date(after.rows[0].pass_updated_at).getTime())
      .toBeGreaterThan(new Date(before.rows[0].pass_updated_at).getTime());

    const { loadPassBundle, dynamicContentFor } = await import("../server/events/wallet/passUpdates");
    const bundle = await loadPassBundle(serial);
    expect(dynamicContentFor(bundle!).countdownLabel).toBe("CHECKED IN");
  });

  it("cross-tenant organizers cannot broadcast to this event", async () => {
    const beta = await createBusinessWithOwner({ name: "Other Biz" });
    const res = await beta.agent.post(`/events/api/v1/manage/events/${event.id}/pass-message`)
      .send({ message: "hijack", confirm: true });
    expect(res.status).toBe(404);
  });

  it("individual cancellation and restoration update the saved pass", async () => {
    const { rows: [ticket] } = await pool.query(`SELECT registration_id FROM ev_tickets WHERE id = $1`, [serial]);
    const before = await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial]);
    expect((await owner.agent.post(`/events/api/v1/manage/registrations/${ticket.registration_id}/cancel`)
      .send({ notifyAttendee: false })).status).toBe(200);
    await expect.poll(async () => (await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial])).rows[0].pass_updated_at.getTime())
      .toBeGreaterThan(before.rows[0].pass_updated_at.getTime());
    const { buildPassForSerial } = await import("../server/events/wallet/passUpdates");
    const cancelled = extractPassJson((await buildPassForSerial(serial))!);
    expect(cancelled.voided).toBe(true);
    expect(cancelled.eventTicket.headerFields[0].value).toBe("CANCELLED");
    expect(cancelled.eventTicket.backFields.find((f: any) => f.key === "status").value).toBe("Ticket cancelled");
    const cancelledAt = (await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial])).rows[0].pass_updated_at.getTime();
    expect((await owner.agent.post(`/events/api/v1/manage/registrations/${ticket.registration_id}/restore`).send({})).status).toBe(200);
    await expect.poll(async () => (await pool.query(`SELECT pass_updated_at FROM ev_tickets WHERE id = $1`, [serial])).rows[0].pass_updated_at.getTime())
      .toBeGreaterThan(cancelledAt);
    expect(extractPassJson((await buildPassForSerial(serial))!).voided).not.toBe(true);
  });

  it("event cancellation overrides check-in, updates the pass and allows a cancellation message", async () => {
    expect((await owner.agent.post(`/events/api/v1/manage/events/${event.id}/status`).send({ status: "cancelled" })).status).toBe(200);
    const { buildPassForSerial } = await import("../server/events/wallet/passUpdates");
    const pass = extractPassJson((await buildPassForSerial(serial))!);
    expect(pass.voided).toBe(true);
    expect(pass.eventTicket.headerFields[0].value).toBe("CANCELLED");
    expect(pass.eventTicket.backFields.find((f: any) => f.key === "status")).toMatchObject({ value: "Event cancelled", changeMessage: "%@" });
    expect((await owner.agent.post(`/events/api/v1/manage/events/${event.id}/pass-message`)
      .send({ message: "Tonight is cancelled. We will share a new date soon.", confirm: true })).status).toBe(200);
    const updated = extractPassJson((await buildPassForSerial(serial))!);
    expect(updated.eventTicket.backFields.find((f: any) => f.key === "message").value).toContain("Tonight is cancelled");
    const preview = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/notify`)
      .send({ kind: "event_cancellation", confirm: false });
    expect(preview.body).toMatchObject({ recipients: 1, deliveryEnabled: false });
    const queued = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/notify`)
      .send({ kind: "event_cancellation", confirm: true });
    expect(queued.body).toMatchObject({ queued: 1, deliveryEnabled: false });
  });

  it("unregistering removes the device registration", async () => {
    const app = await getApp();
    const res = await request(app)
      .delete(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events/${serial}`)
      .set("Authorization", `ApplePass ${authToken}`);
    expect(res.status).toBe(200);
    const list = await request(app).get(`${WS}/v1/devices/${deviceId}/registrations/pass.store.grandmajazz.events`);
    expect(list.status).toBe(404);
  });
});

async function refFor(serial: string): Promise<string> {
  const { rows } = await pool.query(`SELECT reference FROM ev_tickets WHERE id = $1`, [serial]);
  return rows[0].reference;
}

/** pull pass.json out of the pkpass zip buffer (stored, not compressed, is not guaranteed — use unzip). */
function extractPassJson(buf: Buffer): any {
  const os = require("node:os");
  const fs = require("node:fs");
  const path = require("node:path");
  const { execFileSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gj-pj-"));
  fs.writeFileSync(path.join(dir, "p.pkpass"), buf);
  execFileSync("unzip", ["-o", "p.pkpass"], { cwd: dir, stdio: "pipe" });
  return JSON.parse(fs.readFileSync(path.join(dir, "pass.json"), "utf8"));
}
