import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, createPublishedEvent, registrationPayload, type TestActor } from "./helpers";

/** Ticket surfaces: wallet flags/endpoints, ICS download, QR payload hygiene, uploads. */
describe("ticket surfaces", () => {
  let owner: TestActor;
  let event: { id: string; slug: string };
  let ticketToken: string;

  beforeAll(async () => {
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Surface Biz" });
    event = await createPublishedEvent(owner);
    const app = await getApp();
    const reg = await request(app).post(`/events/api/v1/events/${event.slug}/register`)
      .send(registrationPayload({ fullName: "Priya Private", email: "priya@test.local" }));
    ticketToken = reg.body.ticketToken;
  });

  it("QR payload contains no PII and no database ids", async () => {
    const app = await getApp();
    const res = await request(app).get(`/events/api/v1/t/${ticketToken}`);
    expect(res.status).toBe(200);
    // the QR encodes only the opaque ticket URL
    expect(res.body.qrSvg).toBeTruthy();
    const { rows } = await import("../server/db").then((m) =>
      m.pool.query(`SELECT id FROM ev_tickets LIMIT 1`));
    const dbId = rows[0].id as string;
    expect(res.body.qrSvg).not.toContain("Priya");
    expect(res.body.qrSvg).not.toContain("priya@test.local");
    expect(JSON.stringify(res.body)).not.toContain(dbId);
  });

  it("ticket responses are non-cacheable, non-indexable, non-referring", async () => {
    const app = await getApp();
    const res = await request(app).get(`/events/api/v1/t/${ticketToken}`);
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(res.headers["x-robots-tag"]).toContain("noindex");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("serves a valid ICS for the ticket", async () => {
    const app = await getApp();
    const res = await request(app).get(`/events/api/v1/t/${ticketToken}/calendar.ics`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/calendar");
    expect(res.text).toContain("BEGIN:VEVENT");
    expect(res.text).toContain("DTSTART:");
  });

  it("wallet endpoints report unavailable when credentials are absent (never fake passes)", async () => {
    const app = await getApp();
    const info = await request(app).get(`/events/api/v1/t/${ticketToken}`);
    expect(info.body.wallet).toEqual({ apple: false, google: false });
    expect((await request(app).get(`/events/api/v1/t/${ticketToken}/apple-wallet`)).status).toBe(503);
    expect((await request(app).get(`/events/api/v1/t/${ticketToken}/google-wallet`)).status).toBe(503);
  });

  it("rejects non-image uploads and images disguised by MIME type", async () => {
    const bad = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/hero-image`)
      .attach("image", Buffer.from("<?php echo 'pwn'; ?>"), { filename: "x.php", contentType: "application/x-php" });
    expect(bad.status).toBeGreaterThanOrEqual(400);

    const disguised = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/hero-image`)
      .attach("image", Buffer.from("not really a png at all"), { filename: "x.png", contentType: "image/png" });
    expect(disguised.status).toBe(400);
  });

  it("accepts a real image, re-encodes to webp with a randomized name", async () => {
    const sharp = (await import("sharp")).default;
    const png = await sharp({ create: { width: 900, height: 500, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .png().toBuffer();
    const res = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/hero-image`)
      .attach("image", png, { filename: "hero.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.heroImagePath).toMatch(/^\/events\/uploads\/[a-f0-9]{32}\.webp$/);
  });

  it("upload path traversal is impossible via the uploads static route", async () => {
    const app = await getApp();
    const res = await request(app).get("/events/uploads/..%2f..%2f.env");
    expect([400, 403, 404]).toContain(res.status);
  });
});

describe("gallery management", () => {
  let owner: TestActor;
  let event: { id: string; slug: string };

  beforeAll(async () => {
    owner = await createBusinessWithOwner({ name: "Gallery Biz" });
    event = await createPublishedEvent(owner);
  });

  async function png(): Promise<Buffer> {
    const sharp = (await import("sharp")).default;
    return sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 20, g: 20, b: 20 } } }).png().toBuffer();
  }

  it("uploads, lists on the public page, and removes gallery images", async () => {
    const app = await getApp();
    const up = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/gallery`)
      .attach("image", await png(), { filename: "g.png", contentType: "image/png" });
    expect(up.status).toBe(201);
    expect(up.body.gallery).toHaveLength(1);
    const imgPath = up.body.gallery[0].path;
    expect(imgPath).toMatch(/^\/events\/uploads\/[a-f0-9]{32}\.webp$/);

    const pub = await request(app).get(`/events/api/v1/events/${event.slug}`);
    expect(pub.body.event.gallery).toHaveLength(1);

    const rm = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/gallery/remove`)
      .send({ path: imgPath });
    expect(rm.status).toBe(200);
    expect(rm.body.gallery).toHaveLength(0);
  });

  it("supports inline description images end to end", async () => {
    const app = await getApp();
    const up = await owner.agent.post(`/events/api/v1/manage/events/${event.id}/images`)
      .attach("image", await png(), { filename: "inline.png", contentType: "image/png" });
    expect(up.status).toBe(201);
    const put = await owner.agent.put(`/events/api/v1/manage/events/${event.id}`).send({
      title: "Gallery Event", slug: event.slug,
      startsAtLocal: "2027-01-15T19:00", endsAtLocal: "2027-01-15T23:00", timezone: "Asia/Bangkok",
      descriptionHtml: `<p>Look:</p><img src="${up.body.path}" alt="room"><img src="https://evil.example/x.png">`,
    });
    expect(put.status).toBe(200);
    const pub = await request(app).get(`/events/api/v1/events/${event.slug}`);
    expect(pub.body.event.descriptionHtml).toContain(up.body.path);
    expect(pub.body.event.descriptionHtml).not.toContain("evil.example");
  });

  it("cross-tenant gallery upload is a 404", async () => {
    const beta = await createBusinessWithOwner({ name: "Other Gallery Biz" });
    const res = await beta.agent.post(`/events/api/v1/manage/events/${event.id}/gallery`)
      .attach("image", await png(), { filename: "g.png", contentType: "image/png" });
    expect(res.status).toBe(404);
  });
});
