# Grandma Jazz — Events, Wallet, Family and Garments

Interactive "join the family" wall for the Grandma Jazz cafe. React + Vite frontend, Express backend, PostgreSQL via Drizzle ORM, Resend for email, optional Mailchimp list integration. Designed to run behind NGINX + Cloudflare with PM2.

This backend is owned and versioned in `GrandmaJazz/Grandma.Jazz` alongside the website. Deploy from the complete repository: the public header and footer import `shared/site` and the site business details. The website is deployed separately from the backend.

Production hosting, PostgreSQL, uploads, DNS, Apple Developer, Google Wallet, Resend and Mailchimp must be held in Grandma Jazz controlled accounts. The current development VPS is a temporary development environment. Source inclusion does not transfer provider billing, customer data or wallet credentials automatically. Preserve the existing Apple signing identity and ticket HMAC secret when moving existing passes. Keep private backups and credentials outside Git.

For the full machine-readable deployment spec, see **`EXPORT_SPEC.md`**.
For a copy-paste one-shot VPS deploy script, see **`CODEX_DEPLOY_PROMPT.md`**.

## Production Target

- **Primary domain:** https://grandmajazz.com
- **WWW alias:** https://www.grandmajazz.com
- **Production `BASE_PATH`:** `/`
- **Do not deploy this app on `saint-tv.com`.**
- **Do not deploy this app on `sainttv.win`.**

## Quick Start (VPS)

```bash
git clone https://github.com/GrandmaJazz/Grandma.Jazz.git
cd Grandma.Jazz/apps/grandmajazz-platform
cp .env.example .env             # fill DATABASE_URL, RESEND_API_KEY, etc.
npm ci
npm run check
npm run build
pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 startup                      # follow the printed instruction once
```

The server listens on `process.env.PORT` (default **3000**) and binds to `process.env.HOST` (default `0.0.0.0`). Place NGINX in front and proxy to that port.

## Health Check

`GET https://grandmajazz.com/api/healthz` → `{"status":"ok"}`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev with HMR (NOT for production) |
| `npm run check` | TypeScript type-check |
| `npm run build` | Build client (Vite) and server (esbuild) |
| `npm run start` | Run built server (production) |
| `npm run db:push` | Push schema to database |

## NGINX (Production)

```nginx
server {
  listen 80;
  server_name grandmajazz.com www.grandmajazz.com;
  return 301 https://grandmajazz.com$request_uri;
}

server {
  listen 443 ssl http2;
  server_name grandmajazz.com www.grandmajazz.com;

  ssl_certificate     /etc/letsencrypt/live/grandmajazz.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/grandmajazz.com/privkey.pem;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Cloudflare in front is supported with no app changes — set Cloudflare SSL mode to **Full (strict)** after certbot succeeds.

## Database

Schema lives in `shared/schema.ts` (single `family_members` table). The connection driver is `@neondatabase/serverless` which speaks HTTPS to any Neon-compatible Postgres. To keep prod data in sync with the current Replit environment, point the same `DATABASE_URL` at the VPS. To self-host Postgres on the VPS, follow the dump/restore steps in `CODEX_DEPLOY_PROMPT.md`.

## Mailchimp

Mailchimp is **optional**. If `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`, or `MAILCHIMP_AUDIENCE_ID` are missing, the app skips Mailchimp without crashing (logged as a warning).

## File Storage

None. Brick images are generated in the browser, sent as base64 in the API request, and attached to the welcome email by Resend.

## Project Structure

```
client/        React + Vite frontend
server/        Express API
shared/        Drizzle schema shared between client and server
script/        Build script (vite + esbuild)
ecosystem.config.cjs   PM2 config
EXPORT_SPEC.md         Authoritative deploy spec
CODEX_DEPLOY_PROMPT.md One-shot VPS deploy script
dist/          Build output (created by `npm run build`)
  public/      Static frontend assets
  index.cjs    Bundled server
```

## What NOT to Commit

`node_modules/`, `dist/`, `.env`, anything in `.gitignore`. **Always** commit `package-lock.json`.
