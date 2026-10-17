import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const email = vi.hoisted(() => ({ send: vi.fn(async () => ({ data: { id: "fixture" }, error: null })) }));
vi.mock("resend", () => ({ Resend: class { emails = email; } }));
vi.mock("../server/brickImage", () => ({ renderEmailBrickPng: () => Buffer.from("fixture"), brickFilename: () => "fixture.png" }));
import { sendWelcomeEmail } from "../server/email";

describe("chosen family identity in the personal welcome", () => {
  beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "fixture-only"); email.send.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());
  it("addresses the member by their complete chosen title and name", async () => {
    expect((await sendWelcomeEmail("fixture@example.invalid", "Cousin", "Séna")).success).toBe(true);
    expect(email.send.mock.calls[0][0].html).toContain("My dear, Cousin Séna,");
    expect(email.send.mock.calls[0][0].html).toContain('alt="Cousin Séna"');
  });
  it("renders chosen names as text and encodes the tile URL", async () => {
    await sendWelcomeEmail("fixture@example.invalid", "Cousin", '<img src=x onerror="bad"> & Joy');
    const html = email.send.mock.calls[0][0].html;
    expect(html).toContain("My dear, Cousin &lt;img src=x onerror=&quot;bad&quot;&gt; &amp; Joy,");
    expect(html).not.toContain('<img src=x onerror="bad">');
    expect(html).toContain("name=%3Cimg+src%3Dx+onerror%3D%22bad%22%3E+%26+Joy");
  });
});
