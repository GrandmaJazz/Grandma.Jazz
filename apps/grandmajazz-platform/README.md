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

## Move production into Grandma Jazz's Render account

The repository root `render.yaml` defines a separate platform service, managed PostgreSQL database and persistent uploads disk. It uses the Dockerfile in this directory and PM2 Runtime on port 3000. Provision these resources in the Grandma Jazz Render workspace; this Blueprint creates paid resources, so review the displayed service, database and disk charges before applying it.

Keep the existing Vercel website and Render shop API. Build the platform with the entire repository as the Docker context; the shared site components live outside this directory.

1. Restore the private platform database snapshot into the new PostgreSQL instance. Restore the uploads archive into `/app/uploads`. Compare Family members, event bookings, tickets, Apple device registrations, Garments editions and asset files against the source before cutover.
2. Set `EVENTS_TOKEN_SECRET` to its existing private value so current ticket links stay valid. `SESSION_SECRET` can be new. Set `EXISTING_API_URL` to the existing Grandma Jazz shop API. Import the Family admin key as a Render secret file named `family-admin-key`.
3. Import the Apple signing certificate, signing key and WWDR certificate as secret files, preserving the existing Pass Type ID and team. Set the corresponding `APPLE_*_PATH` variables to those files under `/etc/secrets`. Import the Google service account key similarly. Credentials and customer backups belong outside Git.
4. Initially keep email sending and APNs pushes disabled. Verify public and admin pages, uploads, booking, calendars, scanning and signed passes against the restored data. Enable the production sender and Apple updates after reviewing queued messages. Enable public Google Wallet only after issuer publishing approval.
5. Pause platform writes briefly, transfer the final database and uploads delta, and set Vercel's `EVENTS_PLATFORM_ORIGIN` to the new Render service URL. Redeploy the website and verify every proxied route. Replace the development VPS fallback in `next.config.js` as part of this coordinated cutover.
6. Maintain an independent bridge for previously issued passes or QR links that still use `.store`, or complete their reissue before retiring that origin. Preserve serials, ticket secrets and the Apple signing identity.
7. Verify the website with connections to the development VPS blocked. Family signup and welcome messages, Events booking and calendar/wallet downloads, scanning, Garments reading/editing and settings must all work. Source publishing or a successful Vercel deployment alone does not satisfy this check.

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
