/**
 * Retired Family direct-email transport. The Mailchimp audience/journey owns
 * optional welcome and follow-up delivery. Keep legacy exports fail-closed so
 * an older caller cannot silently resume the cancelled Resend service.
 */
export async function sendWelcomeEmail(
  _toEmail: string,
  _title: string,
  _name: string,
  _brickImageBase64?: string,
): Promise<{ success: false; error: string }> {
  return { success: false, error: "Direct Family welcome delivery is retired; use the optional Mailchimp signup journey." };
}

export async function sendFamilyMessage(_to: string, _subject: string, _text: string): Promise<never> {
  throw new Error("Direct Family messages are unavailable. Compose approved emails in Mailchimp.");
}
