# Handoff to Ac's Codex — 9 October 2026

## Continue from the repaired release

The owner asked you to preserve the site and avoid repeating the menu and music regressions. Inspect the current source and live behavior before changing them. Integrate the Family Wall, events, Garments, and settings naturally into the existing site. Preserve the existing shop, music, payments, authentication, cart, content, and customer data.

The latest published application repair is `f5d18e1165b1afbf32b86677dc439ddf1f7fbd17` on `GrandmaJazz/Grandma.Jazz` → `main`. This handoff is a subsequent documentation change. The repaired Mac worktree is:

`/Users/accorreya/.codex/worktrees/repair-com-migration/Grandma.Jazz`

The older `/Users/accorreya/Grandma.Jazz` checkout contains unfinished work. Preserve it; do not push its stale version over main. Fetch the latest branch, review local changes, and merge useful work deliberately.

## Fixes that must be preserved

| Area | What was fixed / what to retain |
| --- | --- |
| Header and footer | Shared components in `shared/site/`, with `src/components/SiteNavigationLink.tsx` preserving Next.js navigation and the main site's music, login, and cart callbacks. |
| Menu layout | Root `tailwind.config.ts` must scan `./shared/**/*.{ts,tsx}`. Missing generated classes shrank the phone menu. `shared/site/chromeStyles.ts` now scopes regular header alignment to `gj-header-bar`; applying it to the mobile panel covered the close button. Keep `gj-menu-panel` and the three-column `gj-menu-controls`. Desktop uses gaps without duplicated margins. |
| Music covers | The hosting image optimizer exhausted its allowance. `next.config.js` disables optimization, and `src/utils/fileHelper.ts` returns source image URLs. Both paths must agree; the helper previously continued requesting broken `/_next/image` URLs. Re-enable optimization only after fixing hosting limits and checking every image path. |
| Garments | Keep `/garments/api/:path*` routed to Express before the general HTML rewrite. The old routing returned 405 for saves. Preserve canonical `.com` origin handling and CSRF behavior. |
| Platform styles | `src/app/api/platform-page/[...path]/route.ts` preserves original hashed stylesheet URLs. A cache suffix duplicated preloads. Removed inaccessible remote font references were contributing to a blank Garments page. |
| Original Family Wall | `/family/` embeds `/family-wall/`. Its separate Vite entry retains the original brick experience, Roboto font, frame SVG, and original PNG rendering. Keep `vite.family.config.ts` and the additional build in the platform `script/build.ts`; the root PostCSS configuration must not leak into that build. |
| Family data | Reconciliation preserved existing records and added one missing member. The `.com` database held 577 Family members after repair. Do not overwrite it with the earlier 576-member migration snapshot; later activity may have increased it further. |
| Weekly quiz | The backend maintains four upcoming Saturday 16:20 Bangkok events, preserving existing dates and their status. Keep `server/events/recurringEvents.ts` and its worker. |
| Apple passes | Preserve working signing credentials, pass identifiers, serial numbers, authentication tokens, registered devices, and update URLs. Public pass download/update and conditional 304 responses were checked. Real iPhone push/update acceptance remains unfinished. |

## Verification already completed

- Website and platform TypeScript checks and production builds passed, including the original Family Wall bundle.
- Two routing tests and 51 isolated platform tests passed. Additional isolated Garments management save/reload checks passed.
- Live browser checks on the Mac passed for main, Garments, and events menus at 320, 390, 1050, and 1440 pixels, including logo placement, close-button clicks, and horizontal overflow.
- Live music covers loaded; selection, client navigation retaining state, login modal, and cart opening worked.
- Family Wall assets and a 5000 × 1630 brick PNG worked. Family, Garments, events, and product pages had one shared header and footer.

For changes affecting these areas, repeat the relevant browser interactions against the actual deployment. Database test fixtures must use an isolated database, never production. VPS-origin browser requests sometimes encounter Vercel's security checkpoint; distinguish that from an application failure.

Private repair evidence and original pending-work backups are on the Mac under:

`/Users/accorreya/GrandmaJazz-Repair-Backups/20261009-resume/`

Do not commit private evidence, backups, credentials, or customer records.

## What still needs to be completed

### 1. Move the platform to Grandma Jazz-owned hosting

**The website is on Grandma Jazz's Vercel account, but the platform still runs on the owner's development VPS. The VPS cannot be switched off yet.**

The existing shop backend is separate, in `GrandmaJazz/Grandma.Jazz.Backend`, hosted on Render. Preserve that integration. The current platform is managed by the `grandmajazz` user's PM2 as `grandmajazz-com-platform`, on port 3014. Do not disturb other VPS services.

Use `docs/OWNERSHIP-HANDOFF.md`, root `render.yaml`, and the platform Dockerfile for the owned deployment. The new Linux service must run production builds with PM2 on `0.0.0.0:3000`, with PostgreSQL and persistent uploads, and work behind NGINX + Cloudflare where used.

Take a fresh database and uploads snapshot and a final delta during a coordinated write pause. Transfer secrets privately. Preserve `EVENTS_TOKEN_SECRET`, the Family admin key, Apple signing material, device registrations, tickets, Garments assets, Family data, settings, and scheduled jobs. Old snapshots are preparation material, not today's production state.

The blueprint starts wallet pushes and email disabled for migration. Restore the current Apple configuration and enable Apple Wallet/APNs only after controlled validation. Configure the owned origin in `EVENTS_PLATFORM_ORIGIN`, verify it, and then remove the development VPS fallback.

Move legacy `.store` ticket and Apple update endpoints to an owned bridge, or perform a controlled pass reissue. Already-issued passes retain their original update URLs. Inventory all remaining VPS dependencies, including the fundraiser below. Verify the existing shop/payments and all platform features with VPS traffic blocked before declaring the migration complete.

### 2. Finish Apple Wallet checks on a real iPhone

Install a test pass, register the device, change an event, and verify the APNs notification and updated pass arrive. Check cancellation and messaging through settings. Confirm legacy passes continue to update after the hosting change. Existing API/tests do not establish real-device delivery.

Google Wallet was explicitly excluded from the latest repair scope. Keep its source and configuration, but do not call it complete or enable it without the owner resuming that work.

### 3. Complete email setup when the owner resumes it

The owner said emails can be done afterward and asked to be reminded. Provider/DNS verification and real delivery remain pending; event email delivery is disabled. Configure the owner's provider and DNS, audit queued jobs and recipients, and test controlled delivery before enabling customer emails. Preserve customer and mailing-list data. Do not replay old pending messages blindly.

### 4. Preserve and move the separate fundraiser

`grandmajazz.store/fundraiser/` is a separate VPS application; it is not included in this website repository. Its opening total is **30,773 THB**, including the previously listed public donations, with a **60,000 THB** goal and live progress. Breakdown: personal accounts 8,800; Thai bank 7,173; Stripe 10,800; Monzo £90 counted as 4,000 THB using the owner's requested conversion. New donations must increase the total without counting existing donations twice.

Its settings are persisted at `/opt/joy-fundraiser/data/fundraiser-summary.json`. Progress polls every 15 seconds and on focus. The current progress change was applied to the compiled frontend; port it into the actual frontend source before rebuilding. Instructions/backups are in `/opt/joy-fundraiser/changes/20261007-total/README.txt` and `/opt/joy-fundraiser/changes/20261007-goal/README.txt`. Preserve its database, receipts, settings, assets, and source when retiring the VPS.

### 5. Finish production handover

Verify owner-controlled repository and hosting access, backups and restore, persistent storage, logs, and certificate renewal. Check Family moderation/export, Garments create/upload/save/publish, recurring events, registration/check-in, pass updates, and settings after cutover. Record what actually passed and any remaining failures. Preserve the site throughout; do not report ownership independence until the VPS-off acceptance check passes.
