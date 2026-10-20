import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { familySignupRouter, type FamilySignupStore } from "../server/familySignup";
import { FAMILY_MARKETING_VERSION, type FamilyMarketingChoice } from "../shared/family-original/marketingChoice";
import type { FamilyMember } from "../shared/schema";
import type { AdmissionResult } from "../server/mailchimpAdmission";

const member: FamilyMember = {
  id: "fixture-member", title: "Cousin", name: "Séna", email: Buffer.from("fixture@example.invalid").toString("base64"),
  mailchimpAdded: false, welcomeEmailSent: false, followupScheduled: false, createdAt: new Date("2026-10-20T00:00:00Z"),
};
function fixture() {
  const storage = {
    findMemberByEmail: vi.fn(async (): Promise<FamilyMember | null> => null),
    createMember: vi.fn(async () => member),
    updateMailchimpStatus: vi.fn(async () => {}),
    updateWelcomeEmailStatus: vi.fn(async () => {}),
  };
  const dependencies = {
    storage,
    withMemberEmailLock: vi.fn(async <T>(_email: string, work: (members: FamilySignupStore) => Promise<T>): Promise<T> => work(storage)),
    recordChoice: vi.fn(async (_id: string, choice: FamilyMarketingChoice) => choice.marketingConsentVersion ? {
      consented: choice.marketingConsent === true, copyVersion: choice.marketingConsentVersion,
      recordedAt: new Date("2026-10-20T00:00:00Z"),
    } : null),
    admitSubscriber: vi.fn(async (): Promise<AdmissionResult> => ({ success: true, created: true })),
    welcomeEnabled: vi.fn(() => true),
  };
  const app = express(); app.use(express.json(), familySignupRouter(dependencies));
  return { app, dependencies };
}
const body = { title: "Cousin", name: "Séna", email: " Fixture@EXAMPLE.invalid ", marketingConsent: true, marketingConsentVersion: FAMILY_MARKETING_VERSION };

describe("Mailchimp-only Family signup without provider or database access", () => {
  beforeEach(() => vi.clearAllMocks());
  it("queues only a newly admitted, explicitly consented signup when the welcome is enabled", async () => {
    const { app, dependencies: d } = fixture();
    const result = await request(app).post("/api/members").send(body);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ name: "Séna", emailQueued: true, emailSent: false, welcomeEmailSent: false, mailchimpAdded: true });
    expect(d.storage.createMember).toHaveBeenCalledWith({ title: "Cousin", name: "Séna", email: "fixture@example.invalid" });
    expect(d.admitSubscriber).toHaveBeenCalledWith("fixture@example.invalid", "Cousin", "Séna", expect.objectContaining({ consented: true }));
    expect(d.storage.updateWelcomeEmailStatus).not.toHaveBeenCalled();
  });
  it("does not claim a queued email while the provider welcome flag is off", async () => {
    const { app, dependencies: d } = fixture(); d.welcomeEnabled.mockReturnValue(false);
    expect((await request(app).post("/api/members").send(body)).body.emailQueued).toBe(false);
  });
  it.each([false, undefined])("saves the brick without any marketing call for consent %s", async consent => {
    const { app, dependencies: d } = fixture();
    const result = await request(app).post("/api/members").send({ ...body, marketingConsent: consent, marketingConsentVersion: consent === undefined ? undefined : FAMILY_MARKETING_VERSION });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ emailQueued: false, emailSent: false, mailchimpAdded: false });
    expect(d.storage.createMember).toHaveBeenCalledOnce();
    expect(d.admitSubscriber).not.toHaveBeenCalled();
  });
  it("holds marketing when consent evidence cannot be saved but keeps the new brick", async () => {
    const { app, dependencies: d } = fixture(); d.recordChoice.mockRejectedValue(new Error("fixture unavailable"));
    const result = await request(app).post("/api/members").send(body);
    expect(result.status).toBe(201); expect(result.body.emailQueued).toBe(false);
    expect(d.admitSubscriber).not.toHaveBeenCalled();
  });
  it("does not call the provider for a stored decline even if the request asks for email", async () => {
    const { app, dependencies: d } = fixture();
    d.recordChoice.mockResolvedValue({ consented: false, copyVersion: FAMILY_MARKETING_VERSION, recordedAt: new Date() });
    expect((await request(app).post("/api/members").send(body)).body.emailQueued).toBe(false);
    expect(d.admitSubscriber).not.toHaveBeenCalled();
  });
  it("does not replay a welcome for an already subscribed provider contact", async () => {
    const { app, dependencies: d } = fixture(); d.admitSubscriber.mockResolvedValue({ success: true, created: false });
    expect((await request(app).post("/api/members").send(body)).body.emailQueued).toBe(false);
    expect(d.storage.updateWelcomeEmailStatus).not.toHaveBeenCalled();
  });
  it("keeps the on-screen brick when capacity or a prior provider opt-out holds admission", async () => {
    const { app, dependencies: d } = fixture();
    d.admitSubscriber.mockResolvedValue({ success: false, created: false, error: "Marketing enrolment held" });
    const result = await request(app).post("/api/members").send(body);
    expect(result.status).toBe(201); expect(result.body).toMatchObject({ name: "Séna", emailQueued: false, emailSent: false });
    expect(d.storage.updateMailchimpStatus).not.toHaveBeenCalled();
  });
  it("returning lookup never retries a welcome, creates or enrols a member, or writes consent", async () => {
    const { app, dependencies: d } = fixture(); d.storage.findMemberByEmail.mockResolvedValue(member);
    const result = await request(app).post("/api/members/check-email").send({ email: body.email });
    expect(result.status).toBe(200); expect(result.body).toMatchObject({ exists: true, emailQueued: false, emailSent: false, member: { name: "Séna" } });
    expect(d.storage.createMember).not.toHaveBeenCalled(); expect(d.admitSubscriber).not.toHaveBeenCalled();
    expect(d.recordChoice).not.toHaveBeenCalled(); expect(d.storage.updateWelcomeEmailStatus).not.toHaveBeenCalled();
  });
  it("a repeated create POST returns the existing brick without replacing choice or replaying email", async () => {
    const { app, dependencies: d } = fixture(); d.storage.findMemberByEmail.mockResolvedValue(member);
    const result = await request(app).post("/api/members").send({ ...body, name: "Other" });
    expect(result.status).toBe(200); expect(result.body).toMatchObject({ name: "Séna", emailQueued: false });
    expect(d.storage.createMember).not.toHaveBeenCalled(); expect(d.recordChoice).not.toHaveBeenCalled(); expect(d.admitSubscriber).not.toHaveBeenCalled();
  });

  it.each([true, false])("serializes concurrent normalized-email POSTs and preserves the first consent %s", async firstConsent => {
    const { app, dependencies: d } = fixture();
    let saved: FamilyMember | null = null;
    let entered = 0, firstLockReleased = false;
    let creationStarted!: () => void, releaseCreation!: () => void, secondLockRequested!: () => void;
    const started = new Promise<void>(resolve => { creationStarted = resolve; });
    const allowCreation = new Promise<void>(resolve => { releaseCreation = resolve; });
    const secondRequested = new Promise<void>(resolve => { secondLockRequested = resolve; });
    let chain = Promise.resolve();
    d.withMemberEmailLock.mockImplementation(async <T>(email: string, work: (members: FamilySignupStore) => Promise<T>): Promise<T> => {
      expect(email).toBe("fixture@example.invalid");
      if (++entered === 2) secondLockRequested();
      const ordinal = entered;
      const result = chain.then(async () => {
        try { return await work(d.storage); }
        finally { if (ordinal === 1) firstLockReleased = true; }
      });
      chain = result.then(() => {}, () => {});
      return result;
    });
    d.storage.findMemberByEmail.mockImplementation(async () => saved);
    d.storage.createMember.mockImplementation(async () => {
      creationStarted(); await allowCreation;
      saved = member;
      return member;
    });
    d.admitSubscriber.mockImplementation(async () => {
      expect(firstLockReleased).toBe(true);
      return { success: true, created: true };
    });
    const first = request(app).post("/api/members").send({ ...body, marketingConsent: firstConsent }).then(result => result);
    await started;
    const second = request(app).post("/api/members").send({ ...body, email: "fixture@example.invalid", marketingConsent: !firstConsent }).then(result => result);
    await secondRequested;
    releaseCreation();
    const results = await Promise.all([first, second]);
    expect(results.map(result => result.status)).toEqual([201, 200]);
    expect(results[0].body.emailQueued).toBe(firstConsent);
    expect(results[1].body.emailQueued).toBe(false);
    expect(d.storage.createMember).toHaveBeenCalledOnce();
    expect(d.recordChoice).toHaveBeenCalledOnce();
    expect(d.recordChoice.mock.calls[0][1].marketingConsent).toBe(firstConsent);
    expect(d.admitSubscriber).toHaveBeenCalledTimes(firstConsent ? 1 : 0);
  });
  it("fails closed before creation when the signup email lock is unavailable", async () => {
    const { app, dependencies: d } = fixture();
    d.withMemberEmailLock.mockRejectedValue(new Error("fixture lock unavailable"));
    expect((await request(app).post("/api/members").send(body)).status).toBe(500);
    expect(d.storage.createMember).not.toHaveBeenCalled();
    expect(d.recordChoice).not.toHaveBeenCalled();
    expect(d.admitSubscriber).not.toHaveBeenCalled();
  });
  it("rejects unknown affirmative copy before creating a brick or contacting Mailchimp", async () => {
    const { app, dependencies: d } = fixture();
    expect((await request(app).post("/api/members").send({ ...body, marketingConsentVersion: "unknown" })).status).toBe(400);
    expect(d.storage.createMember).not.toHaveBeenCalled(); expect(d.admitSubscriber).not.toHaveBeenCalled();
  });
});
