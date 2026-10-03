# Verification Log — Grandma Jazz Events

Format: command → observed result. Only actually-executed checks are recorded.

## Phase 0 baseline (2026-07-10)

- `git clone /var/www/grandmajazz /home/Bradfran/grandmajazz-events` → OK; drift patch
  (9 modified files) + untracked `client/src/pages/admin.tsx` committed on `events-platform`.
- `npm ci` → 598 packages, OK.
- `npm run check` (tsc) → PASS.
- `BASE_PATH=/ npm run build` → PASS (vite ✓; dist/index.cjs 1.0mb).
- Existing test suite: NONE at baseline.
- Live site: `curl -sI https://grandmajazz.com/` → 200; `/api/healthz` → ok;
  `/events` → 200 SPA fallback (client-side 404).
- Prod DB `grandmajazz`: only `public.family_members`.

## Phases 1–7 implementation verification (2026-07-10, dev environment)

### Migrations
- `npm run db:migrate` from clean `grandmajazz_dev` AND clean `grandmajazz_test`
  → "[migrate] all migrations applied"; 12 `ev_*` tables + partial unique indexes +
  composite tenancy FKs + CHECK constraints created.

### Automated tests — `npm test` (vitest + supertest against grandmajazz_test)
**Result: 6 files, 50 tests, 50 passed, 0 failed** (24s). Coverage:
- unit: slug rules/reserved list, sanitizer (script/onclick/javascript: stripped),
  token determinism + hashing, ticket-reference alphabet, email/phone normalization,
  Bangkok+DST timezone conversion round-trips, ICS validity (escaping, CRLF folding,
  75-octet lines, UID stability, METHOD:CANCEL), Google Calendar link.
- registration: visitor registration + ticket issuance; idempotent retry returns the
  SAME ticket (1 registration, 1 confirmation email row); duplicate email → 409;
  **capacity race: 8 concurrent for 3 places → exactly 3 successes** (DB recount = 3);
  drafts unregisterable AND invisible (404); closed window → 403; honeypot → 400;
  terms/age enforcement; cancel invalidates ticket + frees capacity; restore blocked
  when full (409); resend responses identical for existing/nonexistent emails.
- check-in: valid scan checks in once; second scan → already_checked_in with original
  time; **two concurrent scans → exactly one checked_in**; wrong_event, unknown_ticket,
  cancelled_ticket, cancelled-event rejection; manual reference entry; staff cannot
  reverse (403), manager reversal → re-check-in works; door-staff search shape is
  minimal (name/reference/status only — no email/phone/notes).
- tenancy: cross-tenant read/mutate/export/notify/check-in/reverse all 404 (not 403 —
  no existence disclosure); guessed UUIDs 404; anonymous → 401 everywhere.
- roles: checkin_staff blocked from attendees/CSV/dashboard/mutations/team/settings
  but allowed check-in; event_manager blocked from team/settings; platform endpoints
  reject non-admins.
- auth: wrong-password and unknown-account responses identical; login rate limiting
  fires; password change invalidates other sessions, keeps current; forgot-password
  non-enumerating; reset token single-use; weak passwords rejected; cross-origin
  cookie mutation → 403 (CSRF).
- surfaces: QR/ticket JSON contains no PII and no DB ids; ticket responses
  no-store/noindex/no-referrer; ICS endpoint valid; wallet flags false + endpoints 503
  when unconfigured (no fake passes); PHP upload and MIME-disguised non-image rejected;
  real PNG re-encoded to randomized .webp; traversal on /events/uploads → 4xx.

### Manual end-to-end (dev server 127.0.0.1:3013, then production build on :3014)
- `npm run events:create-admin -- bradfran@me.com` → creates platform admin, attaches
  business_owner on seeded Grandma Jazz tenant, prints single-use password link
  (verified single-use: second consume → 400).
- Full journey: login → create venue → create event (script tag in description
  STRIPPED by sanitizer) → draft 404 publicly → publish → public JSON shows
  open/limited/full states with remaining counts → register → ticket token+reference →
  QR SVG served → calendar.ics has DTSTART 20260801T120000Z (= 19:00 Asia/Bangkok ✓) →
  scan → checked_in → rescan → already_checked_in → cancel registration → attendee's
  ticket page shows cancelled → capacity freed → cancellation email captured in outbox
  (status=sent in capture mode).
- Production build smoke (`node dist/index.cjs`, NODE_ENV=production):
  wall page unchanged (1 og:title, its own meta); `/events/{slug}` HTML has exactly
  one injected OG set + JSON-LD Event + canonical; replit og:image removed on events
  pages only; ticket/manage HTML no-store + noindex (+ no-referrer on tickets);
  legacy `/api/healthz` + `/api/members` unaffected; unknown slug → 404.

### Bugs found and fixed during verification
1. **Pool-client leak in outbox worker** (break skipped release → server-wide hang
   after ~10 idle ticks). Fixed with try/finally; verified: server healthy after
   multiple ticks and duplicate scans respond instantly.
2. **ON CONFLICT could not infer partial dedupe index** (42P10; confirmation emails
   failed to enqueue). Index made non-partial (Postgres treats NULLs as distinct);
   verified via outbox rows + idempotency test.
3. Slug regex allowed 1-char slugs (message said 2–80) — tightened.
4. sanitize-html stripped the injected rel="noopener" (attr not allowlisted) — fixed.

## Not yet verified / remaining
- Real-browser E2E (camera scanner on a phone, keyboard walkthrough, 320px/375px
  visual check) — scanner logic implemented with BarcodeDetector + jsQR fallback;
  needs a device pass at deploy time.
- Apple/Google Wallet live issuance — IMPLEMENTED; EXTERNAL CREDENTIALS REQUIRED.
- Real Resend delivery for events templates (prod key exists; dev ran capture mode).
- Production deployment + smoke tests (Phase 9 — awaiting explicit go).

## Phase 9 — Production deployment (2026-07-10 ~06:38–06:45 UTC)
- Backup: pg_dump -Fc grandmajazz → /root/backups/grandmajazz-pre-events-20260710-063759.dump;
  data/.env tarball alongside.
- Drift preserved: branch `pre-events-backup` commit 33edd77 in /var/www/grandmajazz.
- Deployed: `events-platform` @ 1f522bd checked out; npm ci (727 pkgs); migrations →
  "[migrate] all migrations applied", 12 ev_ tables, family_members = 517 rows intact.
- Env: EVENTS_TOKEN_SECRET (generated in root shell, never displayed), EVENTS_EMAIL_MODE=resend,
  EVENTS_UPLOADS_DIR, wallet flags false; ecosystem.config.cjs forwards them.
- dist swapped out-of-place (dist.old kept for rollback); pm2 startOrRestart --update-env →
  online, single process on :3012; watchdog stopped during window, re-enabled after.
- Startup log: "[events] seeded Grandma Jazz tenant", "outbox worker started (mode=resend)",
  "module mounted at /events". Error log clean.
- Production smoke tests (all against https://grandmajazz.com): homepage 200 (0.09s),
  /admin 200, /api/healthz ok, /api/members 200, /api/brick.png 200,
  /events/api/v1/health ok, /events 200, /events/manage/login 200,
  /events/api/v1/events → {"events":[]}, ticket pages no-store + no-referrer.
- Prod admin created: bradfran@me.com (platform_admin + business_owner of Grandma Jazz),
  one-time password link issued (2h validity).

## Apple Wallet enablement (2026-07-10 ~07:15 UTC)
- Portal cert installed: subject "Pass Type ID: pass.store.grandmajazz.events",
  team PG9RLC7V6N, notAfter 2027-08-09 (RENEWAL REMINDER). Modulus matches the
  server-generated key; `openssl verify -partial_chain -CAfile wwdr-g4.pem` → OK.
- ecosystem forwards APPLE_PASS_KEY_PATH/PASSPHRASE; prod .env updated;
  APPLE_WALLET_ENABLED=true; dist swapped (b2c0644); pm2 restarted; watchdog cycled;
  homepage/health all green after restart.
- Live signing check with PRODUCTION credentials: generated 17,148-byte .pkpass
  (icon/logo assets + pass.json + manifest.json + signature);
  `openssl smime -verify ... -CAfile wwdr-g4.pem` → "Verification successful".
- Sample pass delivered to Bradfran for on-device confirmation.
- Status: Apple Wallet IMPLEMENTED AND VERIFIED (server-side crypto); on-device
  add-to-wallet pending Bradfran's tap. Google Wallet: awaiting issuer approval.

## Live-updating passes + broadcasts (2026-07-10)
- New: Apple pass-update web service (register/list/fetch/unregister/log) with
  ApplePass HMAC auth, APNs pushes over HTTP/2 using the pass certificate,
  dynamic strip artwork (IN N DAYS → TONIGHT → HAPPENING NOW → CHECKED IN /
  CANCELLED / THANK YOU), broadcast message field with changeMessage
  (lock-screen notification), hourly countdown refresh worker, Google addMessage.
- Migration 0002 (additive): ev_pass_registrations + pass_message/pass_countdown_tag
  on events + pass_updated_at on tickets. Applied clean on dev+test.
- Tests: 8 new (59 total, all passing) — countdown labels across day/tz boundaries,
  registration auth (401 wrong token / 201 / 200 idempotent), passesUpdatedSince
  (200/204/404), signed pass fetch with Last-Modified + 304, broadcast preview →
  confirm bumps pass_updated_at and renders message field with changeMessage "%@" +
  strip.png in the bundle, check-in flips pass to CHECKED IN, cross-tenant
  broadcast → 404, unregister → 404 on next list.
- Production deploy of pass updates (~08:20 UTC): migration 0002 applied, dist swapped,
  pm2 restarted (one ~5s 502 gap during boot, then healthy; single boot banner, error
  log empty). Live pass generated with PRODUCTION certs: 60,619 bytes, contains
  strip@1x/2x/3x, webServiceURL=https://grandmajazz.com/events/api/v1/wallet/apple,
  header countdown "IN 12 DAYS", message field with changeMessage; signature verified
  against WWDR G4. Demo pass delivered to Bradfran.
- REAL-DEVICE VERIFICATION (2026-07-10 08:31–08:35 UTC): Bradfran's iPhone added a
  real ticket pass (Quiz Session, GJ-8PDX-4A3W) → device registered (201) → strip
  layout collision spotted on-device (primary field renders over strip) → fixed
  (text-free tinted motif, label-less primary), deployed 3b408d0 → APNs push
  accepted (1 pushed) → device fetched changed-list + re-downloaded pass within
  seconds (nginx log, passd/1.0). Full update loop VERIFIED end to end.

## Rich text + event images (2026-07-10)
- Description editor: toolbar (bold/italic/H2/H3/lists/links/inline images/clear)
  over contentEditable; server sanitizer remains the gatekeeper and now allows
  <img> ONLY for our own re-encoded uploads (/events/uploads/<32hex>.webp) —
  external/traversal srcs stripped (unit test).
- Gallery: upload (cap 12, sharp re-encode), remove (file unlinked once
  unreferenced by hero/gallery/description), renders on the public page.
- Inline description images: upload endpoint + editor insertion; round-trip test
  proves local img kept, evil.example img stripped. Cross-tenant upload → 404.
- Tests: 63/63 passing.
