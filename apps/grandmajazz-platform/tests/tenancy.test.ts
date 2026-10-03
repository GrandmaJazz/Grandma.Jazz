import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, createPublishedEvent, registrationPayload, addStaff, type TestActor } from "./helpers";

/**
 * Tenant isolation and role restrictions. One business must never be able to
 * read, alter, export, check in, or email another business's data — and
 * probing must be indistinguishable from nonexistence (404, not 403).
 */
describe("tenant isolation", () => {
  let alpha: TestActor;
  let beta: TestActor;
  let alphaEvent: { id: string; slug: string };
  let alphaRegistrationId: string;
  let alphaTicketId: string;

  beforeAll(async () => {
    await resetDb();
    alpha = await createBusinessWithOwner({ name: "Alpha" });
    beta = await createBusinessWithOwner({ name: "Beta" });
    alphaEvent = await createPublishedEvent(alpha);
    const app = await getApp();
    const reg = await request(app).post(`/events/api/v1/events/${alphaEvent.slug}/register`).send(registrationPayload());
    expect(reg.status).toBe(201);
    const attendees = await alpha.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}/attendees`);
    alphaRegistrationId = attendees.body.attendees[0].registrationId;
    alphaTicketId = attendees.body.attendees[0].ticketId;
  });

  it("cannot read another tenant's event, attendees, or deliveries", async () => {
    expect((await beta.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}`)).status).toBe(404);
    expect((await beta.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}/attendees`)).status).toBe(404);
    expect((await beta.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}/attendees.csv`)).status).toBe(404);
    expect((await beta.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}/deliveries`)).status).toBe(404);
    expect((await beta.agent.get(`/events/api/v1/manage/events/${alphaEvent.id}/audit`)).status).toBe(404);
  });

  it("cannot mutate another tenant's event or registrations", async () => {
    expect((await beta.agent.put(`/events/api/v1/manage/events/${alphaEvent.id}`).send({
      title: "Hijacked", startsAtLocal: "2027-01-15T19:00", endsAtLocal: "2027-01-15T23:00", timezone: "Asia/Bangkok",
    })).status).toBe(404);
    expect((await beta.agent.post(`/events/api/v1/manage/events/${alphaEvent.id}/status`).send({ status: "cancelled" })).status).toBe(404);
    expect((await beta.agent.post(`/events/api/v1/manage/registrations/${alphaRegistrationId}/cancel`).send({})).status).toBe(404);
    expect((await beta.agent.post(`/events/api/v1/manage/registrations/${alphaRegistrationId}/resend`).send({})).status).toBe(404);
    expect((await beta.agent.post(`/events/api/v1/manage/events/${alphaEvent.id}/notify`).send({ kind: "event_update" })).status).toBe(404);
  });

  it("cannot check in or reverse another tenant's tickets", async () => {
    // beta owner scanning an alpha ticket through beta's own event: unknown
    const betaEvent = await createPublishedEvent(beta);
    const app = await getApp();
    const alphaTicket = await request(app).post(`/events/api/v1/events/${alphaEvent.slug}/register`)
      .send(registrationPayload());
    const scan = await beta.agent.post(`/events/api/v1/manage/events/${betaEvent.id}/check-in/scan`)
      .send({ code: alphaTicket.body.ticketToken });
    expect(scan.body.result).toBe("unknown_ticket");
    expect((await beta.agent.post(`/events/api/v1/manage/tickets/${alphaTicketId}/reverse-check-in`).send({ reason: "x" })).status).toBe(404);
    // and beta cannot scan through alpha's event id at all
    expect((await beta.agent.post(`/events/api/v1/manage/events/${alphaEvent.id}/check-in/scan`).send({ code: "GJ-AAAA-AAAA" })).status).toBe(404);
  });

  it("sequential/guessed IDs and foreign tickets look nonexistent, not forbidden", async () => {
    const res = await beta.agent.get(`/events/api/v1/manage/events/00000000-0000-0000-0000-000000000001`);
    expect(res.status).toBe(404);
  });
});

describe("role restrictions", () => {
  let owner: TestActor;
  let manager: TestActor;
  let door: TestActor;
  let event: { id: string; slug: string };

  beforeAll(async () => {
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Roles Biz" });
    manager = await addStaff(owner, "event_manager");
    door = await addStaff(owner, "checkin_staff");
    event = await createPublishedEvent(owner);
    const app = await getApp();
    await request(app).post(`/events/api/v1/events/${event.slug}/register`).send(registrationPayload());
  });

  it("check-in staff cannot access attendee PII, exports, event mutation, team or settings", async () => {
    expect((await door.agent.get(`/events/api/v1/manage/events/${event.id}/attendees`)).status).toBe(403);
    expect((await door.agent.get(`/events/api/v1/manage/events/${event.id}/attendees.csv`)).status).toBe(403);
    expect((await door.agent.get(`/events/api/v1/manage/dashboard`)).status).toBe(403);
    expect((await door.agent.post(`/events/api/v1/manage/events`).send({ title: "x" })).status).toBe(403);
    expect((await door.agent.get(`/events/api/v1/manage/team`)).status).toBe(403);
    expect((await door.agent.get(`/events/api/v1/manage/settings`)).status).toBe(403);
    // but CAN run check-in
    expect((await door.agent.get(`/events/api/v1/manage/events/${event.id}/check-in/summary`)).status).toBe(200);
  });

  it("event managers manage events but not team/settings; owners manage all", async () => {
    expect((await manager.agent.get(`/events/api/v1/manage/dashboard`)).status).toBe(200);
    expect((await manager.agent.get(`/events/api/v1/manage/events/${event.id}/attendees`)).status).toBe(200);
    expect((await manager.agent.get(`/events/api/v1/manage/team`)).status).toBe(403);
    expect((await manager.agent.get(`/events/api/v1/manage/settings`)).status).toBe(403);
    expect((await owner.agent.get(`/events/api/v1/manage/team`)).status).toBe(200);
    expect((await owner.agent.get(`/events/api/v1/manage/settings`)).status).toBe(200);
  });

  it("platform endpoints reject non-platform-admins", async () => {
    expect((await owner.agent.get(`/events/api/v1/platform/businesses`)).status).toBe(403);
    expect((await door.agent.post(`/events/api/v1/platform/businesses`).send({ name: "X", ownerName: "Y", ownerEmail: "y@test.local" })).status).toBe(403);
  });

  it("anonymous users get 401 from every organizer route", async () => {
    const app = await getApp();
    for (const path of [
      "/events/api/v1/manage/dashboard",
      "/events/api/v1/manage/events",
      `/events/api/v1/manage/events/${event.id}/attendees`,
      "/events/api/v1/manage/team",
      "/events/api/v1/platform/businesses",
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
    }
  });
});
