import { describe, expect, it, vi } from "vitest";
import { admitFamilySubscriber, contactAdmissionLimit, type AdmissionDependencies } from "../server/mailchimpAdmission";

function fixture(overrides: Partial<AdmissionDependencies> = {}): AdmissionDependencies {
  return {
    withLock: async work => work(),
    findMember: vi.fn(async () => null),
    countBillableContacts: vi.fn(async () => 494),
    createMember: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("Family marketing cost protection", () => {
  it("admits the final available place, then holds the next simultaneous signup", async () => {
    let used = 494, chain = Promise.resolve();
    const dependencies = fixture({
      withLock: work => {
        const result = chain.then(work);
        chain = result.then(() => {}, () => {});
        return result;
      },
      countBillableContacts: async () => used,
      createMember: vi.fn(async () => { used++; }),
    });
    const results = await Promise.all([admitFamilySubscriber(495, dependencies), admitFamilySubscriber(495, dependencies)]);
    expect(results.map(result => result.success)).toEqual([true, false]);
    expect(results.map(result => result.created)).toEqual([true, false]);
    expect(used).toBe(495);
    expect(dependencies.createMember).toHaveBeenCalledTimes(1);
  });

  it.each(["archived", "unsubscribed", "cleaned", "pending", "transactional"])("never changes a %s contact or spends a new place", async status => {
    const dependencies = fixture({ findMember: async () => ({ status }) });
    expect((await admitFamilySubscriber(495, dependencies)).success).toBe(false);
    expect(dependencies.countBillableContacts).not.toHaveBeenCalled();
    expect(dependencies.createMember).not.toHaveBeenCalled();
  });

  it("recognises an already enrolled family subscriber without replaying tags or creating a contact", async () => {
    const dependencies = fixture({ findMember: async () => ({ status: "subscribed", tags: [{ name: "family-member" }] }) });
    expect(await admitFamilySubscriber(0, dependencies)).toEqual({ success: true, created: false });
    expect(dependencies.createMember).not.toHaveBeenCalled();
    expect(dependencies.countBillableContacts).not.toHaveBeenCalled();
  });

  it("holds an existing subscriber without the family tag for review", async () => {
    const dependencies = fixture({ findMember: async () => ({ status: "subscribed", tags: [] }) });
    expect((await admitFamilySubscriber(495, dependencies)).success).toBe(false);
    expect(dependencies.createMember).not.toHaveBeenCalled();
  });

  it.each([495, 500, 512])("holds new enrolment at %i contacts", async count => {
    const dependencies = fixture({ countBillableContacts: async () => count });
    expect((await admitFamilySubscriber(495, dependencies)).success).toBe(false);
    expect(dependencies.createMember).not.toHaveBeenCalled();
  });

  it.each([NaN, -1, Infinity, 2.5])("holds enrolment when the provider count is invalid (%s)", async count => {
    const dependencies = fixture({ countBillableContacts: async () => count });
    expect((await admitFamilySubscriber(495, dependencies)).success).toBe(false);
    expect(dependencies.createMember).not.toHaveBeenCalled();
  });

  it("holds enrolment if the capacity lock or provider is unavailable", async () => {
    for (const dependency of ["withLock", "findMember", "countBillableContacts", "createMember"] as const) {
      const dependencies = fixture({ [dependency]: async () => { throw new Error("private provider details"); } });
      const result = await admitFamilySubscriber(495, dependencies);
      expect(result.success).toBe(false);
      expect(result.error).not.toContain("private");
    }
  });

  it("rejects invalid or unsafe configured limits", () => {
    expect(contactAdmissionLimit()).toBe(495);
    expect(contactAdmissionLimit("0")).toBe(0);
    expect(contactAdmissionLimit("475")).toBe(475);
    for (const value of ["500", "496", "-1", "abc", "", "4.5", "Infinity"]) {
      expect(contactAdmissionLimit(value)).toBeNull();
    }
  });
});
