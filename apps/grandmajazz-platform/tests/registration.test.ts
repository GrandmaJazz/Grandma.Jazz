import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, createPublishedEvent, registrationPayload, pool, type TestActor } from "./helpers";
import { drainOutbox } from "../server/events/outboxWorker";
import { resetRateLimits } from "../server/events/security";

describe("public registration", () => {
  let owner: TestActor;

  beforeAll(async () => {
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Reg Biz" });
  });

  it("registers a visitor and issues a ticket + queues exactly one confirmation email", async () => {
    const app = await getApp();
    const event = await createPublishedEvent(owner);
    const payload = registrationPayload();
    const res = await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ticketToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(res.body.ticketReference).toMatch(/^GJ-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // idempotent retry: same key → same ticket, no extra registration
    const retry = await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(payload);
    expect(retry.status).toBe(201);
    expect(retry.body.ticketToken).toBe(res.body.ticketToken);
    expect(retry.body.duplicate).toBe(true);

    const { rows } = await pool.query(
      `SELECT count(*)::int AS c FROM ev_registrations WHERE email_normalized = $1`,
      [payload.email],
    );
    expect(rows[0].c).toBe(1);

    // exactly one confirmation email despite the retry
    const { rows: outbox } = await pool.query(
      `SELECT count(*)::int AS c FROM ev_email_outbox WHERE template = 'registration_confirmation' AND recipient = $1`,
      [payload.email],
    );
    expect(outbox[0].c).toBe(1);

    // capture-mode drain marks it sent without leaving duplicates
    await drainOutbox();
    const { rows: sent } = await pool.query(
      `SELECT status FROM ev_email_outbox WHERE recipient = $1`, [payload.email],
    );
    expect(sent.map((r) => r.status)).toEqual(["sent"]);
  });

  it("rejects duplicate confirmed registration for the same email", async () => {
    const app = await getApp();
    const event = await createPublishedEvent(owner);
    const first = registrationPayload({ email: "dupe@test.local" });
    expect((await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(first)).status).toBe(201);
    const second = await request(app).post(`/events/api/v1/events/${event.slug}/register`)
      .send(registrationPayload({ email: "DUPE@test.local" }));
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("duplicate_email");
  });

  it("never exceeds capacity under concurrency (last-place race)", async () => {
    resetRateLimits();
    const app = await getApp();
    const event = await createPublishedEvent(owner, { capacity: 3 });
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app).post(`/events/api/v1/events/${event.slug}/register`)
          .set("X-Forwarded-For", `10.1.0.${i + 1}`) // separate rate-limit buckets
          .send(registrationPayload())),
    );
    const succeeded = results.filter((r) => r.status === 201);
    const full = results.filter((r) => r.status === 409 && r.body.code === "full");
    expect(succeeded.length).toBe(3);
    expect(full.length).toBe(5);
    const { rows } = await pool.query(
      `SELECT count(*)::int AS c FROM ev_registrations r JOIN ev_events e ON e.id = r.event_id
        WHERE e.slug = $1 AND r.status = 'confirmed'`, [event.slug]);
    expect(rows[0].c).toBe(3);
  });

  it("refuses drafts, closed windows and honeypot submissions", async () => {
    const app = await getApp();
    // draft
    const draft = await owner.agent.post("/events/api/v1/manage/events").send({
      title: "Draft Only", startsAtLocal: "2027-03-01T19:00", endsAtLocal: "2027-03-01T22:00", timezone: "Asia/Bangkok",
    });
    const draftReg = await request(app)
      .post(`/events/api/v1/events/${draft.body.event.slug}/register`).send(registrationPayload());
    expect(draftReg.status).toBe(404);
    // draft is not publicly readable either
    expect((await request(app).get(`/events/api/v1/events/${draft.body.event.slug}`)).status).toBe(404);

    // closed window
    const closed = await createPublishedEvent(owner, {
      registrationClosesAtLocal: "2020-01-01T00:00",
      startsAtLocal: "2027-04-01T19:00", endsAtLocal: "2027-04-01T22:00",
    });
    const closedReg = await request(app)
      .post(`/events/api/v1/events/${closed.slug}/register`).send(registrationPayload());
    expect(closedReg.status).toBe(403);
    expect(closedReg.body.code).toBe("window_closed");

    // honeypot
    const hp = await createPublishedEvent(owner);
    const hpReg = await request(app).post(`/events/api/v1/events/${hp.slug}/register`)
      .send(registrationPayload({ website: "http://spam.example" }));
    expect(hpReg.status).toBe(400);
  });

  it("requires terms acceptance and age confirmation when configured", async () => {
    const app = await getApp();
    const event = await createPublishedEvent(owner, { minAge: 20 });
    const noTerms = await request(app).post(`/events/api/v1/events/${event.slug}/register`)
      .send(registrationPayload({ termsAccepted: false, ageConfirmed: true }));
    expect(noTerms.status).toBe(400);
    const noAge = await request(app).post(`/events/api/v1/events/${event.slug}/register`)
      .send(registrationPayload({ ageConfirmed: false }));
    expect(noAge.status).toBe(400);
    const ok = await request(app).post(`/events/api/v1/events/${event.slug}/register`)
      .send(registrationPayload({ ageConfirmed: true }));
    expect(ok.status).toBe(201);
  });

  it("cancellation invalidates the ticket and frees capacity; restore re-checks capacity", async () => {
    const app = await getApp();
    const event = await createPublishedEvent(owner, { capacity: 1 });
    const reg = await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(registrationPayload());
    expect(reg.status).toBe(201);

    const attendees = await owner.agent.get(`/events/api/v1/manage/events/${event.id}/attendees`);
    const registrationId = attendees.body.attendees[0].registrationId;

    const cancel = await owner.agent.post(`/events/api/v1/manage/registrations/${registrationId}/cancel`)
      .send({ notifyAttendee: false });
    expect(cancel.status).toBe(200);

    // cancelled ticket page reflects it
    const t = await request(app).get(`/events/api/v1/t/${reg.body.ticketToken}`);
    expect(t.body.ticket.status).toBe("cancelled");

    // capacity freed: someone else takes the place
    const other = await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(registrationPayload());
    expect(other.status).toBe(201);

    // restore now fails: event is full again
    const restore = await owner.agent.post(`/events/api/v1/manage/registrations/${registrationId}/restore`);
    expect(restore.status).toBe(409);
  });

  it("resend endpoints never disclose registration existence", async () => {
    const app = await getApp();
    const event = await createPublishedEvent(owner);
    const known = registrationPayload({ email: "resendme@test.local" });
    await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(known);
    const hit = await request(app).post(`/events/api/v1/events/${event.slug}/resend-ticket`).send({ email: "resendme@test.local" });
    const miss = await request(app).post(`/events/api/v1/events/${event.slug}/resend-ticket`).send({ email: "nobody@test.local" });
    expect(hit.status).toBe(200);
    expect(miss.status).toBe(200);
    expect(hit.body).toEqual(miss.body);
  });
});
