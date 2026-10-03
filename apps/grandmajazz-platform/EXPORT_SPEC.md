# EXPORT_SPEC.md — Grandma Jazz Family Wall

Authoritative deployment spec. Anything that contradicts this file is wrong.

## Production Target

| Item | Value |
| --- | --- |
| Primary domain | **https://grandmajazz.com** |
| WWW alias | **https://www.grandmajazz.com** |
| Production mount | `/` (root) |
| Default `BASE_PATH` | `/` |
| Public URL | `https://grandmajazz.com` |

### Negative deployment rule (hard)

- **Do not deploy this app on `saint-tv.com`.**
- **Do not deploy this app on `sainttv.win`.**
- Do not configure any NGINX `server_name`, Cloudflare hostname, certbot domain, env var, or proxy_pass route that attaches the Grandma Jazz family wall to either domain. They are listed here only as a forbidden-deploy rule.

## Runtime

| Item | Value |
| --- | --- |
| Node | **20.x** (LTS) |
| Package manager | **npm** (lockfile: `package-lock.json` is committed) |
| Process manager | **PM2** (app name: `grandmajazz`) |
| HTTP framework | Express |
| Bundler | Vite (client) + esbuild (server) |
| Database driver | `@neondatabase/serverless` (HTTPS to any Neon-compatible Postgres) |

The app **must** bind:
- `HOST` from env, default `0.0.0.0` — never localhost-only.
- `PORT` from env, default `3000`.

## Commands

| Step | Command |
| --- | --- |
| Install | `npm ci` |
| Type-check | `npm run check` |
| Build | `npm run build` |
| Production start (foreground) | `npm run start` |
| Production start (PM2) | `pm2 start ecosystem.config.cjs --update-env` |
| DB schema push | `npm run db:push` |

`npm run dev` is for local development only. **Never** use it in production.

## Required Environment Variables

All values come from `.env` next to the built app (see `.env.example`).

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | — | Must be `production` in deploy |
| `PORT` | no | `3000` | App listens here |
| `HOST` | no | `0.0.0.0` | Bind address; never `localhost` |
| `BASE_PATH` | no | `/` | URL prefix the app is mounted at; build-time + runtime |
| `PUBLIC_URL` | recommended | — | Public URL used for absolute OG image URLs (`https://grandmajazz.com`) |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `RESEND_API_KEY` | yes | — | Welcome email sending |
| `MAILCHIMP_API_KEY` | no | — | If missing, Mailchimp is skipped (no crash) |
| `MAILCHIMP_SERVER_PREFIX` | no | — | e.g. `us21` |
| `MAILCHIMP_AUDIENCE_ID` | no | — | Mailchimp list id |

## Health Check

```
GET https://grandmajazz.com/api/healthz   →  200 {"status":"ok"}
```

Verification endpoint:
```
GET https://grandmajazz.com/api/members   →  200 [...]
```

## BASE_PATH Mounting (Optional)

Production uses `BASE_PATH=/`. The app **also** supports subpath mounts (e.g. `/something/`) without code changes:

- `BASE_PATH` is normalized to start and end with `/`.
- **Frontend** (Vite): the value is passed as `base`, so all assets, routes, images, internal links, and `fetch()` calls automatically resolve under that prefix via `import.meta.env.BASE_URL`.
- **Backend** (Express): the API router and SPA fallback are mounted under `BASE_PATH`.
- Build-time and runtime `BASE_PATH` must match — rebuild if you change it.

## Database

- Single Postgres database. Schema lives in `shared/schema.ts` (table `family_members`).
- Driver is `@neondatabase/serverless`; works with any Neon-compatible Postgres URL.
- **No filesystem uploads.** Brick images are generated client-side (canvas) and forwarded to Resend as base64 attachments. No upload directory is required. Express body limit is **50 MB**.
- To self-host on the VPS, dump+restore with `pg_dump` / `pg_restore` (see `CODEX_DEPLOY_PROMPT.md`).

## SEO / Privacy

- Every HTML response includes `<meta name="robots" content="noindex,nofollow,noarchive">`.
- The app honors any upstream `X-Robots-Tag` header set by NGINX/Cloudflare; nothing in the app overrides it.
- **No `sitemap.xml` is generated or served. Do not add one.**

## NGINX (production)

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name grandmajazz.com www.grandmajazz.com;
  return 301 https://grandmajazz.com$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name grandmajazz.com www.grandmajazz.com;

  # TLS certs (managed by certbot)
  ssl_certificate     /etc/letsencrypt/live/grandmajazz.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/grandmajazz.com/privkey.pem;

  client_max_body_size 50M;

  add_header X-Robots-Tag "noindex, nofollow, noarchive" always;

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

## Cloudflare Compatibility

- Cloudflare in front is supported with no app changes. After certbot succeeds, set Cloudflare SSL mode to **Full (strict)**.
- The app reads `X-Forwarded-Proto` from the proxy chain; no extra config needed.
- Brick image uploads are base64 in the JSON body (≤ 50 MB), so no Cloudflare WebSocket or chunked-upload tweaks are required.

## What NOT to commit

- `node_modules/`
- `dist/`
- `.env` (real secrets) — only `.env.example` is committed
- Anything matched by `.gitignore`

Always commit: `package-lock.json`, `.env.example`, `ecosystem.config.cjs`, `EXPORT_SPEC.md`, `CODEX_DEPLOY_PROMPT.md`, and all source.
