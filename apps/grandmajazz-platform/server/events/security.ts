import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { eventsConfig } from "./config";

function scrypt(password: string, salt: string, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// ------------------------------------------------------------------ passwords
// scrypt via node:crypto — no native dependency. Format: scrypt$N$salt$hash
const SCRYPT_N = 16384;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: SCRYPT_N, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const [, nStr, salt, hex] = parts;
  const derived = await scrypt(password, salt, 64, { N: parseInt(nStr, 10), maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(hex, "hex");
  return expected.length === derived.length && timingSafeEqual(derived, expected);
}

// -------------------------------------------------------------------- tokens
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Random one-time token (invites, password resets). Returns raw + hash. */
export function generateOneTimeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

/**
 * Deterministic opaque ticket token: HMAC(tokenSecret, ticketId).
 * Unguessable without the server secret, and reproducible so idempotent
 * registration retries and email resends can re-issue the same link while
 * the DB stores only the SHA-256 of the token.
 */
export function ticketToken(ticketId: string): string {
  return createHmac("sha256", eventsConfig.tokenSecret).update(`ticket:${ticketId}`).digest("base64url");
}

export function ticketTokenHash(ticketId: string): string {
  return sha256(ticketToken(ticketId));
}

/**
 * Apple Wallet web-service authenticationToken for a pass. Deterministic HMAC
 * (domain-separated from the ticket token) so nothing extra is stored; the
 * device echoes it back as `Authorization: ApplePass <token>`.
 */
export function passAuthToken(ticketId: string): string {
  return createHmac("sha256", eventsConfig.tokenSecret).update(`passauth:${ticketId}`).digest("base64url");
}

/** Human-readable support reference, e.g. GJ-7K4M-P2X9. Not a credential. */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
export function generateTicketReference(): string {
  const pick = () => REF_ALPHABET[randomBytes(1)[0] % REF_ALPHABET.length];
  const block = () => pick() + pick() + pick() + pick();
  return `GJ-${block()}-${block()}`;
}

// -------------------------------------------------------------- rate limiting
// In-memory token buckets (single PM2 fork process — see ecosystem.config.cjs),
// same pattern as the existing /api/brick.png guard in server/routes.ts.
type Bucket = { tokens: number; ts: number };
const buckets = new Map<string, Bucket>();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  buckets.forEach((b, k) => { if (b.ts < cutoff) buckets.delete(k); });
}, 5 * 60 * 1000).unref?.();

export function clientIp(req: Request): string {
  return (String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.ip || "unknown";
}

export function rateLimit(name: string, burst: number, refillPerSec: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${clientIp(req)}`;
    const now = Date.now();
    const b = buckets.get(key) ?? { tokens: burst, ts: now };
    b.tokens = Math.min(burst, b.tokens + ((now - b.ts) / 1000) * refillPerSec);
    b.ts = now;
    if (b.tokens < 1) {
      buckets.set(key, b);
      res.set("Retry-After", String(Math.ceil(1 / refillPerSec)));
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }
    b.tokens -= 1;
    buckets.set(key, b);
    next();
  };
}

/** Test hook: reset all rate-limit buckets. */
export function resetRateLimits() {
  buckets.clear();
}

// ------------------------------------------------------------ CSRF protection
/**
 * Cookie-authenticated mutations must come from our own origin. SameSite=Lax
 * already blocks cross-site cookie sends for POST; this adds an explicit
 * Origin check as defence in depth (and covers older browsers).
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // non-browser clients (no cookies sent cross-site anyway)
  const allowed = new Set([
    eventsConfig.publicUrl,
    `https://${req.headers.host}`,
    `http://${req.headers.host}`,
  ]);
  if (!allowed.has(origin)) {
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }
  next();
}

// ------------------------------------------------------------- normalization
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s().-]/g, "");
  if (!/^\+?\d{6,15}$/.test(cleaned)) return null; // lenient: don't reject legit international numbers
  return cleaned;
}
