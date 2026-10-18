import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mailchimp from "@mailchimp/mailchimp_marketing";

const sql = vi.hoisted(() => ({ query: vi.fn(async () => ({})), release: vi.fn() }));
vi.mock("../server/db", () => ({ pool: { connect: vi.fn(async () => sql) } }));
import { addSubscriberToList } from "../server/mailchimp";

const permission = { consented: true, copyVersion: "family-updates-2026-10-19", recordedAt: "2026-10-19T00:00:00Z" };
const addConsentedSubscriber = (email: string, title: string, name: string) => addSubscriberToList(email, title, name, permission);

describe("Mailchimp SDK adapter without network or database access", () => {
  let request: ReturnType<typeof vi.spyOn>;
  let existing: null | { status: string; tags?: { name: string }[] };
  let counts: Record<string, number>;
  beforeEach(() => {
    vi.stubEnv("MAILCHIMP_API_KEY", "unit-test-us10");
    vi.stubEnv("MAILCHIMP_SERVER_PREFIX", "us10");
    vi.stubEnv("MAILCHIMP_AUDIENCE_ID", "fixture-list");
    vi.stubEnv("MAILCHIMP_CONTACT_CAP", "495");
    vi.stubEnv("MAILCHIMP_FAMILY_TILE_ENABLED", "false");
    existing = null;
    counts = { subscribed: 491, unsubscribed: 1, transactional: 1 };
    sql.query.mockClear(); sql.release.mockClear();
    // Exercise the installed SDK's field serialization; every HTTP call is
    // intercepted before transport, and unknown endpoints fail the test.
    request = vi.spyOn(mailchimp as any, "callApi").mockImplementation(async (...args: any[]) => {
      const [path, method, , query, , , body] = args;
      if (method === "GET" && path.endsWith("/{subscriber_hash}")) {
        if (!existing) throw Object.assign(new Error("Not found"), { status: 404 });
        return { data: existing };
      }
      if (path === "/lists" && method === "GET") {
        expect(query.fields).toBe("lists.id,total_items");
        return { data: { lists: [{ id: "fixture-list" }, { id: "other-list" }], total_items: 2 } };
      }
      if (path === "/lists/{list_id}/members" && method === "GET") {
        expect(query.fields).toBe("total_items");
        const list = args[2].list_id;
        return { data: { total_items: list === "fixture-list" ? counts[query.status] : 0 } };
      }
      if (path === "/lists/{list_id}/members" && method === "POST") return { data: { id: "created", ...body } };
      throw new Error("Unexpected API mutation or endpoint");
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("uses the chosen identity, correct existing merge tags and the shared capacity lock", async () => {
    expect(await addConsentedSubscriber(" Fixture@EXAMPLE.invalid ", "Cousin", "Séna <&>")).toEqual({ success: true });
    const creation = request.mock.calls.find(args => args[1] === "POST")!;
    expect(creation[6]).toEqual({ email_address: "fixture@example.invalid", status: "subscribed", merge_fields: {
      FNAME: "Séna <&>", MMERGE5: "Cousin Séna <&>", MMERGE6: "Cousin",
    }, tags: ["family-member", "wall-signup"] });
    expect(sql.query).toHaveBeenCalledWith("SELECT pg_advisory_xact_lock($1)", [714500495]);
    expect(sql.query).toHaveBeenCalledWith("COMMIT");
    expect(sql.release).toHaveBeenCalledOnce();
  });

  it("counts unsubscribed and non-subscribed contacts towards admission", async () => {
    counts = { subscribed: 493, unsubscribed: 1, transactional: 1 };
    expect((await addConsentedSubscriber("fixture@example.invalid", "Cousin", "Fixture")).success).toBe(false);
    expect(request.mock.calls.some(args => args[1] !== "GET")).toBe(false);
  });

  it("does not unarchive an archived contact or apply tags to it", async () => {
    existing = { status: "archived" };
    expect((await addConsentedSubscriber("fixture@example.invalid", "Cousin", "Fixture")).success).toBe(false);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]).toBe("GET");
  });

  it("leaves an enrolled family member unchanged and uses no new place", async () => {
    existing = { status: "subscribed", tags: [{ name: "family-member" }] };
    expect(await addConsentedSubscriber("fixture@example.invalid", "Cousin", "Fixture")).toEqual({ success: true });
    expect(request).toHaveBeenCalledOnce();
  });

  it("rolls back the lock transaction and holds enrolment if the provider is unavailable", async () => {
    request.mockRejectedValue(new Error("provider unavailable"));
    expect((await addConsentedSubscriber("fixture@example.invalid", "Cousin", "Fixture")).success).toBe(false);
    expect(sql.query).toHaveBeenCalledWith("ROLLBACK");
    expect(sql.release).toHaveBeenCalledOnce();
  });
  it("does not touch Mailchimp without recorded optional permission", async () => {
    expect((await addSubscriberToList("fixture@example.invalid", "Cousin", "Fixture")).success).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(sql.query).not.toHaveBeenCalled();
  });
  it("adds one completely encoded canonical tile URL only after its field is enabled", async () => {
    vi.stubEnv("MAILCHIMP_FAMILY_TILE_ENABLED", "true");
    await addConsentedSubscriber("fixture@example.invalid", "Cousin", "Séna & Joy");
    const body = request.mock.calls.find(args => args[1] === "POST")![6];
    const url = new URL(body.merge_fields.TILEURL);
    expect(url.searchParams.get("name")).toBe("Séna & Joy");
    expect(url.searchParams.get("artwork")).toBe("badge-v1");
  });

});
