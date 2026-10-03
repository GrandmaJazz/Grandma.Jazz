import fs from "node:fs";
import path from "node:path";

// Load .env (same minimal parser as ecosystem.config.cjs) and point the app
// at the TEST database before any application module is imported.
const envFile = path.resolve(import.meta.dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required to run the events test suite");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.EVENTS_EMAIL_MODE = "capture";
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret";

// never attempt live APNs connections from tests
process.env.EVENTS_DISABLE_APNS_PUSH = "1";
