import { beforeAll, describe, expect, it } from "vitest";
import { createBusinessWithOwner, createPublishedEvent, pool, resetDb } from "./helpers";
import { ensureWeeklyQuizEvents } from "../server/events/recurringEvents";

describe("bookable weekly quiz dates", () => {
  beforeAll(async () => { await resetDb(); });

  it("preserves existing dates and cancellations and carries forward the current capacity", async () => {
    const owner = await createBusinessWithOwner({ name: "Quiz" });
    await pool.query("UPDATE ev_businesses SET slug = 'seed-fixture' WHERE slug = 'grandma-jazz'");
    await pool.query("UPDATE ev_businesses SET slug = 'grandma-jazz' WHERE id = $1", [owner.businessId]);
    const template = await createPublishedEvent(owner, { capacity: 12 });
    await pool.query("UPDATE ev_events SET slug = 'quiz-session-2027-01-02', starts_at = '2027-01-02T09:20:00Z' WHERE id = $1", [template.id]);
    const cancelled = await createPublishedEvent(owner);
    await pool.query("UPDATE ev_events SET slug = 'quiz-session-2027-01-09', status = 'cancelled', starts_at = '2027-01-09T09:20:00Z' WHERE id = $1", [cancelled.id]);
    delete process.env.EVENTS_AUTO_SEED_QUIZ;
    const now = new Date("2027-01-01T00:00:00Z");
    await ensureWeeklyQuizEvents(now);
    await ensureWeeklyQuizEvents(now);
    const { rows } = await pool.query("SELECT slug, status, capacity FROM ev_events WHERE business_id = $1 ORDER BY slug", [owner.businessId]);
    expect(rows).toHaveLength(4);
    expect(rows.find(row => row.slug === "quiz-session-2027-01-09")?.status).toBe("cancelled");
    expect(rows.find(row => row.slug === "quiz-session-2027-01-16")).toMatchObject({ status: "published", capacity: 12 });
    process.env.EVENTS_AUTO_SEED_QUIZ = "0";
  });
});
