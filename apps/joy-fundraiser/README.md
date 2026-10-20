# Together for Joy fundraiser

Canonical public address: https://www.grandmajazz.com/fundraiser/

Recovered on 20 October 2026 from the working legacy `.store` production release. `server.mjs` is the editable Node 24 service. The accompanying private transfer snapshot preserves the actual deployed `dist-vps` frontend, images, QR payment instructions and video. Original editable frontend sources have not yet been located. Binary media are preserved in that owner-held snapshot rather than this code recovery directory. Do not replace the working bundle with a fresh scaffold. `legacy-import.json` records original public-file hashes. `index.html` adds the `.com` canonical URL and the small `handover-layout.css` overlay, which prevents the progress amount from overflowing narrow columns. Copy these to `dist-vps/index.html` and `dist-vps/handover-layout-20261021.css` after restoring the verified media snapshot. Restore its listed media from the verified snapshot before building an independent deployment.

The service uses Node's built-in SQLite module. Run with Node 24. Configure HOST, PORT, DATA_DIR, TRUST_PROXY and PUBLIC_ORIGIN. Production DATA_DIR must be persistent and contain the existing donations.sqlite database, receipts directory and fundraiser-summary.json. They are private operational data and must never be committed.

The current `.com` origin routes /fundraiser/ to the separate `joy-fundraiser-com` container on 127.0.0.1:3188 (internal port 3187), using the existing persistent /opt/joy-fundraiser/data directory. The old container is retained for rollback until acceptance. Allow only the two .com origins and the legacy .store origins while old receipt forms remain open. Do not weaken the request-origin or file-validation checks.

Preserve the opening total of 30,773 THB and existing included-public-total offsets. Later donations are added by /fundraiser/api/progress. Never copy an old total over current data or count historical donations twice. Progress currently polls every 15 seconds and on focus.

Domain handover does not retire the development VPS. Moving this service to owned hosting still requires a fresh consistent SQLite/receipts/settings backup, persistent storage, private transfer and a VPS-off acceptance check. Paid resources need the owner's cost decision.
