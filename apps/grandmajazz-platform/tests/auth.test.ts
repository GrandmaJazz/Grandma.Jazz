import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getApp, resetDb, createBusinessWithOwner, type TestActor } from "./helpers";
import { pool } from "../server/db";
import { resetRateLimits } from "../server/events/security";
import { drainOutbox } from "../server/events/outboxWorker";

describe("authentication", () => {
  let owner: TestActor;

  beforeAll(async () => {
    await resetDb();
    owner = await createBusinessWithOwner({ name: "Auth Biz" });
  });

  it("rejects wrong passwords and unknown accounts identically", async () => {
    const app = await getApp();
    resetRateLimits();
    const bad = await request(app).post("/events/api/v1/auth/login").send({ email: owner.email, password: "wrong-password-here" });
    const ghost = await request(app).post("/events/api/v1/auth/login").send({ email: "ghost@test.local", password: "wrong-password-here" });
    expect(bad.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(bad.body).toEqual(ghost.body);
  });

  it("rate limits repeated login attempts", async () => {
    const app = await getApp();
    resetRateLimits();
    let limited = false;
    for (let i = 0; i < 15; i++) {
      const res = await request(app).post("/events/api/v1/auth/login")
        .set("X-Forwarded-For", "10.9.9.9")
        .send({ email: "brute@test.local", password: `guess-${i}-aaaaaa` });
      if (res.status === 429) { limited = true; break; }
    }
    expect(limited).toBe(true);
    resetRateLimits();
  });

  it("password change invalidates other sessions but keeps the current one", async () => {
    const app = await getApp();
    const other = request.agent(app);
    await other.post("/events/api/v1/auth/login").send({ email: owner.email, password: owner.password }).expect(200);

    await owner.agent.post("/events/api/v1/auth/change-password")
      .send({ currentPassword: owner.password, newPassword: "brand-new-password-1" }).expect(200);
    owner.password = "brand-new-password-1";

    expect((await owner.agent.get("/events/api/v1/auth/me")).status).toBe(200);
    expect((await other.get("/events/api/v1/auth/me")).status).toBe(401);
  });

  it("forgot-password does not enumerate accounts, and reset tokens are single-use", async () => {
    const app = await getApp();
    resetRateLimits();
    const hit = await request(app).post("/events/api/v1/auth/forgot-password").send({ email: owner.email });
    const miss = await request(app).post("/events/api/v1/auth/forgot-password").send({ email: "ghost@test.local" });
    expect(hit.body).toEqual(miss.body);

    await drainOutbox();
    const { rows } = await pool.query(
      `SELECT text_body FROM ev_email_outbox WHERE template = 'password_reset' AND recipient = $1 ORDER BY created_at DESC LIMIT 1`,
      [owner.email],
    );
    expect(rows.length).toBe(1);
    const token = rows[0].text_body.match(/reset-password\?token=([A-Za-z0-9_-]+)/)?.[1];
    expect(token).toBeTruthy();

    const first = await request(app).post("/events/api/v1/auth/reset-password")
      .send({ token, password: "after-reset-password-1" });
    expect(first.status).toBe(200);
    const reuse = await request(app).post("/events/api/v1/auth/reset-password")
      .send({ token, password: "after-reset-password-2" });
    expect(reuse.status).toBe(400);

    const login = await request(app).post("/events/api/v1/auth/login")
      .send({ email: owner.email, password: "after-reset-password-1" });
    expect(login.status).toBe(200);
  });

  it("rejects weak passwords", async () => {
    const app = await getApp();
    const res = await request(app).post("/events/api/v1/auth/reset-password")
      .send({ token: "whatever", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/10 characters/);
  });

  it("blocks cross-origin cookie mutations (CSRF)", async () => {
    const res = await owner.agent.post("/events/api/v1/manage/venues")
      .set("Origin", "https://evil.example")
      .send({ name: "CSRF Venue" });
    expect(res.status).toBe(403);
  });
});
