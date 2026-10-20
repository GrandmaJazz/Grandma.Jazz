import { describe, expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({ client: vi.fn(), send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { constructor() { transport.client(); } emails = { send: transport.send }; } }));
import { sendFamilyMessage, sendWelcomeEmail } from "../server/email";

describe("retired Family direct transport", () => {
  it("cannot send a welcome even if an old caller and Resend credential remain", async () => {
    vi.stubEnv("RESEND_API_KEY", "fixture-only");
    try {
      expect((await sendWelcomeEmail("fixture@example.invalid", "Cousin", "Séna", "fixture")).success).toBe(false);
      expect(transport.client).not.toHaveBeenCalled();
      expect(transport.send).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it("does not turn an admin one-off message into a marketing enrolment or direct email", async () => {
    await expect(sendFamilyMessage("fixture@example.invalid", "Hello", "Hello")).rejects.toThrow("Mailchimp");
    expect(transport.send).not.toHaveBeenCalled();
  });
});
