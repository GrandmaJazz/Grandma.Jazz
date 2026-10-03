import path from "node:path";

/**
 * Events module configuration. All values come from the environment; features
 * whose credentials are absent default to disabled rather than pretending to work.
 */

function bool(v: string | undefined, def = false): boolean {
  if (v === undefined || v === "") return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const isProd = process.env.NODE_ENV === "production";

export const eventsConfig = {
  isProd,
  /** Route prefix for the whole events module (page routes, APIs, assets). */
  base: "/events",
  publicUrl: (process.env.PUBLIC_URL || (isProd ? "https://www.grandmajazz.com" : "http://127.0.0.1:3013")).replace(/\/+$/, ""),
  sessionSecret: process.env.SESSION_SECRET || "",
  /** HMAC secret for ticket tokens; falls back to SESSION_SECRET. */
  tokenSecret: process.env.EVENTS_TOKEN_SECRET || process.env.SESSION_SECRET || "",
  defaultTimezone: process.env.EVENTS_DEFAULT_TIMEZONE || "Asia/Bangkok",
  uploadsDir: process.env.EVENTS_UPLOADS_DIR || path.join(process.cwd(), "uploads", "events"),
  maxUploadBytes: parseInt(process.env.EVENTS_MAX_UPLOAD_BYTES || String(8 * 1024 * 1024), 10),
  /** "resend" (real sends), "capture" (store only; dev/test), "disabled" */
  emailMode: (process.env.EVENTS_EMAIL_MODE ||
    (process.env.RESEND_API_KEY ? "resend" : "capture")) as "resend" | "capture" | "disabled",
  emailFrom: process.env.EVENTS_EMAIL_FROM || "Grandma Jazz <family@mail.grandmajazz.com>",
  outboxIntervalMs: parseInt(process.env.EVENTS_OUTBOX_INTERVAL_MS || "15000", 10),
  // wallet config is read lazily so feature flags/credentials can be
  // exercised in tests (and toggled by env) without import-order coupling
  get appleWallet() {
    return {
      enabled: bool(process.env.APPLE_WALLET_ENABLED),
      passTypeId: process.env.APPLE_PASS_TYPE_ID || "",
      teamId: process.env.APPLE_TEAM_ID || "",
      /** PEM signing certificate (from the Apple portal, converted from .cer) */
      certPath: process.env.APPLE_PASS_CERT_PATH || "",
      /** PEM private key generated alongside the CSR; never leaves the server */
      keyPath: process.env.APPLE_PASS_KEY_PATH || "",
      keyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || "",
      wwdrPath: process.env.APPLE_WWDR_CERT_PATH || "",
      assetDir: process.env.APPLE_WALLET_ASSET_DIR || "server/events/wallet/apple-assets",
    };
  },
  get googleWallet() {
    return {
      enabled: bool(process.env.GOOGLE_WALLET_ENABLED),
      issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || "",
      saKeyPath: process.env.GOOGLE_WALLET_SA_KEY_PATH || "",
      origin: process.env.GOOGLE_WALLET_ORIGIN || process.env.PUBLIC_URL || "https://www.grandmajazz.com",
    };
  },
};

export function appleWalletConfigured(): boolean {
  const a = eventsConfig.appleWallet;
  return a.enabled && !!(a.passTypeId && a.teamId && a.certPath && a.keyPath && a.wwdrPath);
}

export function googleWalletConfigured(): boolean {
  const g = eventsConfig.googleWallet;
  return g.enabled && !!(g.issuerId && g.saKeyPath);
}

export function assertEventsConfig() {
  if (!eventsConfig.sessionSecret) {
    throw new Error("[events] SESSION_SECRET is required");
  }
  if (isProd && eventsConfig.tokenSecret === eventsConfig.sessionSecret && !process.env.EVENTS_TOKEN_SECRET) {
    console.warn("[events] EVENTS_TOKEN_SECRET not set; falling back to SESSION_SECRET (rotating the session secret would invalidate ticket links)");
  }
}
