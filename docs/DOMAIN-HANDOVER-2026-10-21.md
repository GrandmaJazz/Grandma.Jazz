# .store to .com service handover

The .com website is canonical. Preserve the existing shop backend, Family data, Mailchimp-only welcomes, events, Apple pass registrations, Garments and music. Brad's Resend service remains retired. Google Workspace MX/DKIM and Mailchimp's authenticated .com domain are already present; do not add a new sending service or replace these records.

## Domain routes

The main Next.js application forwards `/fundraiser/:path*` and `/instagram/:path*` through EVENTS_PLATFORM_ORIGIN. The origin NGINX routes these to the existing persistent fundraiser service and Instagram service. Fundraiser API paths bypass slash canonicalisation so receipt submissions and progress requests reach the original exact paths.

Legacy `.store` root/Family QR entry points keep their established `.com/family/` destination. Other public sections preserve their original paths and query strings on .com. Preserve the Apple web-service bridge for already-installed passes; those URLs are embedded in existing passes and must keep accepting their authenticated methods directly. Bridge old API requests to the current platform so cached legacy pages cannot create a second set of Family records.

The fundraiser's existing SQLite database, receipt directory and summary file remain the source of truth. A separate .com-compatible container shares the existing persistent data. Restrict accepted receipt-form origins to the apex/www .com and legacy .store addresses. The recovered public service source is under `apps/joy-fundraiser`; the complete media/runtime snapshot is in the private handover evidence, not Git.

## Data reconciliation and rollback

Read-only comparison found that existing legacy event, ticket, pass-registration and Garments edition IDs were already represented in .com. All 39 legacy upload files exist on .com; four files differ because current versions are newer, so they must not be overwritten. One genuine legacy-only Family record was copied additively, preserving its ID, join date and existing flags. No marketing permission, provider subscription or email was created. Pre-change records and fundraiser data were backed up privately.

Use the dated private release report and NGINX/container backups to roll back a route change. Never replace current customer data with an old full database snapshot.

## Separate dependencies

This domain handover does not complete owned-hosting migration. The platform, fundraiser and legacy compatibility bridge still depend on the development VPS. Follow OWNERSHIP-HANDOFF.md for fresh data/uploads transfer, paid hosting decisions, provider secrets, installed-pass preservation and a VPS-off acceptance check before retirement.

Guest quiz emails remain disabled. The booking confirmation already provides Apple Wallet and phone/Google calendar links. Host-only booking alerts and the Saturday 11:00 Bangkok roster use a separately authenticated .com mailbox; do not enable the deferred customer outbox or restore Resend.
