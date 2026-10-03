# Architectural Decisions — Grandma Jazz Events

## D1. Integrate as a module inside the existing Express+Vite app (2026-07-10)
**Evidence:** nginx proxies the entire grandmajazz.com domain to one Express process
(port 3012) which serves both `/api/*` and the SPA fallback. `/events` currently returns
the SPA index.html (client-side NotFound). The app already supports `BASE_PATH` in both
server (`server/index.ts`) and Vite (`import.meta.env.BASE_URL`, wouter base).
**Decision:** No sibling process, no nginx change. Add an `/events` section to the same
app: Express routers `server/events/*` mounted before the SPA fallback, and client pages
under the existing wouter router. Smallest architecture satisfying same-VPS/same-origin.

## D2. Keep app mounted at domain root; `/events` is a route prefix, not BASE_PATH
BASE_PATH stays `/` in production (that is what is deployed). All events URLs are
literal `/events/...` routes. Server route registration uses a single `EVENTS_BASE`
constant so the module stays relocatable.

## D3. Database: same Postgres server, same `grandmajazz` database, new tables (2026-07-10)
**Evidence:** local PostgreSQL 16, prod db `grandmajazz` has a single `family_members`
table. Drizzle ORM already in use with node-postgres Pool.
**Decision:** Additive tables prefixed by domain (businesses, users, business_memberships,
venues, events, registrations, tickets, check_ins, email_outbox, audit_log, session store,
invitations/password resets). Versioned SQL migrations via drizzle-kit generate + a
migration runner script (baseline repo used only `drizzle-kit push`; migrations dir is new
but uses the drizzle.config.ts already present).

## D4. Auth: express-session + connect-pg-simple, scrypt password hashing
express-session and connect-pg-simple are already dependencies (unused but present, and
in the esbuild bundle allowlist). Session cookie scoped to Path=/events, HttpOnly, Secure,
SameSite=Lax. Passwords: Node built-in crypto.scrypt (no new native dependency; argon2
would add a native build). One-time tokens (invites, resets, ticket tokens) stored as
SHA-256 hashes.

## D5. Public event page metadata via server-side HTML injection
The site is a Vite SPA; Open Graph/Twitter metadata requires server-rendered head tags.
The server intercepts GET /events and /events/{slug} page requests, loads the built
index.html template, injects title/meta/canonical/JSON-LD for published events, and serves
it. All other behaviour remains SPA. NOTE: nginx sets `X-Robots-Tag: noindex` site-wide
(pre-existing, deliberate); link-preview crawlers ignore robots, so OG sharing still works.
Sitemap omitted deliberately — consistent with the existing noindex site policy.

## D6. Brand system extracted from existing site (2026-07-10)
Pure black background (#000), white text, font 'Galvji' (Google Fonts + local
server/fonts/Galvji-Light.ttf), light weights (300), wide letter-spacing
(`tracking-extra-wide` = 0.1em), sharp shadcn radius 0 but brand tiles use
`border-2 border-white/90 rounded-[10px]` ("brick" style), uppercase micro-labels
(text-xs tracking-wider), hover inversion (hover:bg-white hover:text-black),
framer-motion for transitions. The two-line right-aligned "Grandma / Jazz" bordered
brick is the logo treatment. Events UI reuses exactly these tokens/classes.
No cream/terracotta, no purple, no dashboard kit.

## D7. Email: reuse Resend + add DB outbox worker
Resend client already in production with verified domain mail.grandmajazz.com.
New `email_outbox` table; an in-process interval worker (same PM2 process, no new
service) claims due rows with FOR UPDATE SKIP LOCKED, bounded retries with backoff.
`EMAIL_MODE=capture` in dev/test stores rendered emails without sending.

## D8. Tickets and QR
Ticket public token: 32 random bytes base64url, stored as SHA-256 hash only.
QR encodes `${PUBLIC_URL}/events/t/{token}` — no PII, no DB ids. Human ticket
reference: `GJ-XXXX-XXXX` (unambiguous alphabet) for support/manual entry, not a
credential. Check-in atomicity: single-statement conditional UPDATE on tickets +
INSERT check_ins in one transaction.

## D9. New dependencies (minimum set)
- `qrcode` (QR SVG/PNG generation, server) — mature, no native deps
- `passkit-generator` (Apple Wallet PKPass signing) — the standard maintained lib
- `google-auth-library` (Google Wallet REST + signed JWT save links)
- `jsdom`? NO. Rich text handled with a strict server-side sanitizer (`sanitize-html`).
- `vitest` + `supertest` (dev) — test runner integrating with existing Vite toolchain
- `multer` (uploads; already in esbuild allowlist)
- `sharp` (image validation/re-encode/resize; well-maintained, prebuilt binaries)
Rejected: Redis/queues (DB outbox suffices), Playwright at launch (supertest+vitest
integration coverage first; browser E2E documented as manual checklist), passport
(express-session direct is smaller).

## D10. Deployment gate
Operator's global rule overrides the spec's autonomous Phase 9: production deploy,
PM2 restart, or nginx change happens only after presenting the change summary and
receiving an explicit "go".

## D11. Existing site preservation tactics
- Events API mounted under /events/api/v1 (never collides with legacy /api/*)
- SPA fallback still serves the wall app for all non-events routes
- No changes to legacy tables or routes; family_members untouched
- Dev builds happen only in /home/Bradfran/grandmajazz-events
