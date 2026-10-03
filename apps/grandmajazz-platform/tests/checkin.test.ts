import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, createPublishedEvent, registrationPayload, addStaff, type TestActor } from "./helpers";

async function registerOne(slug: string) {
  const app = await getApp();
  const res = await request(app).post(`/events/api/v1/events/${slug}/register`).send(registrationPayload());
  expect(res.status).toBe(201);
  return res.body as { ticketToken: string; ticketReference: string };
}

describe("check-in", () => {
  let owner: TestActor;
  let staff: TestActor;

  beforeAll(async () => {
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Door Biz" });
    staff = await addStaff(owner, "checkin_staff");
  });

  it("checks a valid ticket in exactly once; duplicate scan reports original time", async () => {
    const event = await createPublishedEvent(owner);
    const ticket = await registerOne(event.slug);

    const first = await staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: `https://grandmajazz.com/events/t/${ticket.ticketToken}` });
    expect(first.status).toBe(200);
    expect(first.body.result).toBe("checked_in");

    const second = await staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: ticket.ticketToken });
    expect(second.body.result).toBe("already_checked_in");
    expect(second.body.checkedInAt).toBeTruthy();
  });

  it("two concurrent scans of the same ticket → one success, one already_checked_in", async () => {
    const event = await createPublishedEvent(owner);
    const ticket = await registerOne(event.slug);
    const [a, b] = await Promise.all([
      staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`).send({ code: ticket.ticketToken, idempotencyKey: "k-a" }),
      staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`).send({ code: ticket.ticketToken, idempotencyKey: "k-b" }),
    ]);
    const results = [a.body.result, b.body.result].sort();
    expect(results).toEqual(["already_checked_in", "checked_in"]);
  });

  it("rejects wrong-event, unknown, and cancelled tickets", async () => {
    const eventA = await createPublishedEvent(owner);
    const eventB = await createPublishedEvent(owner);
    const ticket = await registerOne(eventA.slug);

    const wrong = await staff.agent.post(`/events/api/v1/manage/events/${eventB.id}/check-in/scan`)
      .send({ code: ticket.ticketToken });
    expect(wrong.body.result).toBe("wrong_event");

    const unknown = await staff.agent.post(`/events/api/v1/manage/events/${eventA.id}/check-in/scan`)
      .send({ code: "GJ-XXXX-YYYY" });
    expect(unknown.body.result).toBe("unknown_ticket");

    // cancel the registration → ticket rejected
    const attendees = await owner.agent.get(`/events/api/v1/manage/events/${eventA.id}/attendees`);
    const registrationId = attendees.body.attendees[0].registrationId;
    await owner.agent.post(`/events/api/v1/manage/registrations/${registrationId}/cancel`).send({ notifyAttendee: false });
    const cancelled = await staff.agent.post(`/events/api/v1/manage/events/${eventA.id}/check-in/scan`)
      .send({ code: ticket.ticketToken });
    expect(cancelled.body.result).toBe("cancelled_ticket");
  });

  it("manual reference entry works and reversal allows re-check-in with audit", async () => {
    const event = await createPublishedEvent(owner);
    const ticket = await registerOne(event.slug);

    const byRef = await staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: ticket.ticketReference.toLowerCase(), source: "manual" });
    expect(byRef.body.result).toBe("checked_in");

    // staff cannot reverse; manager can
    const attendees = await owner.agent.get(`/events/api/v1/manage/events/${event.id}/attendees`);
    const ticketId = attendees.body.attendees[0].ticketId;
    const staffReverse = await staff.agent.post(`/events/api/v1/manage/tickets/${ticketId}/reverse-check-in`)
      .send({ reason: "mistake" });
    expect(staffReverse.status).toBe(403);

    const reverse = await owner.agent.post(`/events/api/v1/manage/tickets/${ticketId}/reverse-check-in`)
      .send({ reason: "scanned the wrong person" });
    expect(reverse.status).toBe(200);

    const again = await staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: ticket.ticketReference });
    expect(again.body.result).toBe("checked_in");
  });

  it("check-in on a cancelled event is rejected", async () => {
    const event = await createPublishedEvent(owner);
    const ticket = await registerOne(event.slug);
    await owner.agent.post(`/events/api/v1/manage/events/${event.id}/status`).send({ status: "cancelled" });
    const res = await staff.agent.post(`/events/api/v1/manage/events/${event.id}/check-in/scan`)
      .send({ code: ticket.ticketToken });
    // ticket was auto-cancelled by event cancellation
    expect(["event_cancelled", "cancelled_ticket"]).toContain(res.body.result);
  });

  it("door staff see the minimal search shape (no email/phone/notes)", async () => {
    const event = await createPublishedEvent(owner);
    await registerOne(event.slug);
    const res = await staff.agent.get(`/events/api/v1/manage/events/${event.id}/check-in/search?q=Visitor`);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    const keys = Object.keys(res.body.results[0]).sort();
    expect(keys).toEqual(["checkedInAt", "fullName", "reference", "status"]);
  });
});
