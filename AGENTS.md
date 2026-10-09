# Grandma Jazz project instructions

Read `docs/CODEX-HANDOFF-2026-10-09.md` before continuing this project, and `docs/OWNERSHIP-HANDOFF.md` before changing hosting. Preserve the existing Grandma Jazz website, shop, music, customer data, and design while integrating the platform features.

- Inspect the branch, latest remote commit, and local diff before editing or publishing. Preserve unfinished work in older checkouts. Continue from the repaired release; do not overwrite it with a stale checkout or migration snapshot.
- Keep `./shared/**/*.{ts,tsx}` in the root Tailwind content configuration. Keep regular header styles scoped to `gj-header-bar`, and mobile menu styles scoped to `gj-menu-panel` / `gj-menu-controls`.
- Preserve Next.js client navigation and the existing music, cart, and authentication callbacks. Verify music image URLs in both Next Image configuration and `src/utils/fileHelper.ts`.
- Keep the Express `/garments/api/:path*` rewrite ahead of the Garments HTML rewrite. Build the main platform, original Family Wall bundle, and backend together.
- For relevant UI changes, check production builds and actual browser behavior at 320, 390, 1050, and 1440 pixels: menu opening/closing, logo alignment, music covers and selection, login, cart, and navigation. A successful build alone does not verify these interactions.
- Run database tests against a disposable test database. Fixtures can delete data. Keep customer email delivery deferred as requested; do not send test messages to customers. Google Wallet is paused in the latest repair scope.
- Keep secrets, signing certificates, customer exports, database backups, and private release evidence out of Git.
- A new Linux platform deployment must bind to `0.0.0.0:3000`, run with PM2, and support NGINX + Cloudflare. The current development VPS service is a separate existing deployment on port 3014; do not disturb Saint TV or other services.
- Production still depends on the development VPS. Complete and verify the Grandma Jazz-owned hosting migration before shutting it down.
