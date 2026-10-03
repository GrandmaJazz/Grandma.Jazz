# Credential Setup — Grandma Jazz Events

Never commit secrets. The .com events runtime is at
`/home/grandmajazz/com-migration-20260929T075653Z/app`; its environment is
in the app's mode-600 `.env` file.

## Already configured in production
- `DATABASE_URL` — local Postgres
- `RESEND_API_KEY` — transactional email (verified domain mail.grandmajazz.com)
- `SESSION_SECRET`, `ADMIN_TOKEN`, `MAILCHIMP_*`
- `EVENTS_TOKEN_SECRET`, `EVENTS_EMAIL_MODE=resend`, `EVENTS_UPLOADS_DIR` (added at 2026-07-10 deploy)

## Apple Wallet — enabled on .com
The signing certificate, key, WWDR certificate, pass assets and push web service
are configured on the .com VPS. The certificate was checked for current validity
on 2026-10-03. The following is historical renewal information:
- Private key: `/etc/grandmajazz/wallet/apple/pass-signing-key.pem` (root-only; never leaves the server)
- CSR: `/etc/grandmajazz/wallet/apple/grandmajazz-events.csr` (copy at `/home/Bradfran/grandmajazz-events.csr`)
- Apple WWDR G4 intermediate: `/etc/grandmajazz/wallet/apple/wwdr-g4.pem` (valid to 2030-12-10)
- Brand pass assets: `server/events/wallet/apple-assets/` (icon/logo, brick style)
- Adapter verified with a self-signed fixture chain (tests/apple-wallet.test.ts)

Owner steps for a future certificate renewal (Apple Developer account required):
1. developer.apple.com → Account → **Certificates, Identifiers & Profiles → Identifiers**
   → “+” → **Pass Type IDs** → description `Grandma Jazz Events`,
   identifier `pass.store.grandmajazz.events` → Register.
2. **Certificates** → “+” → under Services choose **Pass Type ID Certificate** →
   select the identifier from step 1 → upload the CSR file
   (`/home/Bradfran/grandmajazz-events.csr`) → Continue → **Download** `pass.cer`.
3. Put `pass.cer` on the VPS (e.g. `/home/Bradfran/pass.cer`) and tell Claude — or convert yourself:
   `sudo openssl x509 -inform DER -in pass.cer -out /etc/grandmajazz/wallet/apple/pass-signing-cert.pem`
4. Note your **Team ID** (Account → Membership details, 10 characters).
5. Env to add: `APPLE_WALLET_ENABLED=true`, `APPLE_PASS_TYPE_ID=pass.store.grandmajazz.events`,
   `APPLE_TEAM_ID=<team id>`, cert/key/wwdr paths per `.env.example` → restart.
6. Renewal: the pass certificate expires yearly. Repeat steps 2–3 with the SAME CSR/key,
   swap the cert PEM, restart. Set a calendar reminder.

## Google Wallet — demo tested, publishing request submitted
On 2026-10-03, issuer `3388000000023197875` was created in the Google Pay &
Wallet Console; the correct Google Wallet API (`walletobjects.googleapis.com`)
was enabled in Cloud project `gmail-connection-416106`; service account
`gj-wallet@gmail-connection-416106.iam.gserviceaccount.com` was granted
Developer access to the issuer. Its JSON key is installed with mode 600 at
`/home/grandmajazz/.config/grandmajazz/wallet/google-service-account.json`.
The .com `.env` has the issuer ID, key path and origin, but
`GOOGLE_WALLET_ENABLED=false` deliberately keeps public Google Wallet buttons
hidden while the issuer remains in demo mode. A real Quiz Session class and a
synthetic demo object were created through the REST API; the class appears in
the issuer console, and signed save-URL generation passed.

The pass template uses the owner-supplied outlined mark as a wide logo, a
square GJ mark required by Google, a black background, event date/venue,
attendee/reference fields, live status and a QR code. The two logos are served
publicly from `/events/assets/wallet-grandma-jazz{,-square}.png`.

On 2026-10-03, the owner saved a separate Grandma Jazz Organization payments
profile (`0880-5099-7460`) and the issuer console marked the business profile
complete. A publishing-access request describing event admission passes,
dynamic updates, cancellation and attendance check-in was submitted. The
console shows 3/3 onboarding steps complete but still says demo mode; Google
expects to email its decision in 2–3 business days.

To go live: wait for Google's publishing approval, then set
`GOOGLE_WALLET_ENABLED=true` in the .com `.env` and restart
`grandmajazz-com-platform`. Verify a real ticket save, event update and
notification on an Android device before promoting the button broadly.

For key rotation, create a new JSON key, install it mode 600, restart the app,
then delete the old key in Cloud Console.
