const fs = require("node:fs");
const path = require("node:path");

function loadDotenv(file) {
  if (!fs.existsSync(file)) return {};

  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const fileEnv = loadDotenv(path.join(__dirname, ".env"));
const env = { ...fileEnv, ...process.env };

// PM2 process file. Run with:
//   pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: "grandmajazz",
      script: "dist/index.cjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: env.PORT || "3000",
        HOST: env.HOST || "0.0.0.0",
        BASE_PATH: env.BASE_PATH || "/",
        PUBLIC_URL: env.PUBLIC_URL,
        DATABASE_URL: env.DATABASE_URL,
        RESEND_API_KEY: env.RESEND_API_KEY,
        MAILCHIMP_API_KEY: env.MAILCHIMP_API_KEY,
        MAILCHIMP_SERVER_PREFIX: env.MAILCHIMP_SERVER_PREFIX,
        MAILCHIMP_AUDIENCE_ID: env.MAILCHIMP_AUDIENCE_ID,
        SESSION_SECRET: env.SESSION_SECRET,
        GRANDMA_FONT_PATH: env.GRANDMA_FONT_PATH,
        // events platform
        EVENTS_TOKEN_SECRET: env.EVENTS_TOKEN_SECRET,
        EVENTS_EMAIL_MODE: env.EVENTS_EMAIL_MODE,
        EVENTS_EMAIL_FROM: env.EVENTS_EMAIL_FROM,
        EVENTS_OUTBOX_INTERVAL_MS: env.EVENTS_OUTBOX_INTERVAL_MS,
        EVENTS_UPLOADS_DIR: env.EVENTS_UPLOADS_DIR,
        EVENTS_MAX_UPLOAD_BYTES: env.EVENTS_MAX_UPLOAD_BYTES,
        EVENTS_DEFAULT_TIMEZONE: env.EVENTS_DEFAULT_TIMEZONE,
        APPLE_WALLET_ENABLED: env.APPLE_WALLET_ENABLED,
        APPLE_PASS_TYPE_ID: env.APPLE_PASS_TYPE_ID,
        APPLE_TEAM_ID: env.APPLE_TEAM_ID,
        APPLE_PASS_CERT_PATH: env.APPLE_PASS_CERT_PATH,
        APPLE_PASS_KEY_PATH: env.APPLE_PASS_KEY_PATH,
        APPLE_PASS_KEY_PASSPHRASE: env.APPLE_PASS_KEY_PASSPHRASE,
        APPLE_WWDR_CERT_PATH: env.APPLE_WWDR_CERT_PATH,
        APPLE_WALLET_ASSET_DIR: env.APPLE_WALLET_ASSET_DIR,
        GOOGLE_WALLET_ENABLED: env.GOOGLE_WALLET_ENABLED,
        GOOGLE_WALLET_ISSUER_ID: env.GOOGLE_WALLET_ISSUER_ID,
        GOOGLE_WALLET_SA_KEY_PATH: env.GOOGLE_WALLET_SA_KEY_PATH,
        GOOGLE_WALLET_ORIGIN: env.GOOGLE_WALLET_ORIGIN,
      },
    },
  ],
};
