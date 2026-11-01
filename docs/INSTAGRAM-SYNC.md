# Instagram gallery integration

The homepage phone uses the existing same-origin `/instagram/?embed=1` gallery.
The 656-post archive and assets remain on the existing VPS. No other service is
moved. Reels remain still covers linking to their original Instagram posts.

## Components

- Vercel Node route: `/api/internal/instagram-sync`. Requires the exact
  `Authorization: Bearer <CRON_SECRET>` header before doing any work.
- `?mode=status` returns private durable diagnostics; `?mode=probe` launches
  bundled Linux Chromium and reads the public gallery without Instagram login.
  Probe success is **not** a successful Instagram sync.
- VPS service: `grandmajazz-instagram-sync`, bound only to `127.0.0.1:5021`.
  Nginx exposes `/instagram-sync-internal/` on the existing HTTPS origin.
  Requests require the separate `INSTAGRAM_PUBLISHER_SECRET`.
- Private durable state: `/var/lib/grandmajazz-instagram-sync`, owned by Bradfran,
  mode 0700. Worker session and publisher secret never enter public directories.
- Publisher source: `infra/instagram-sync/publisher.py`; service unit alongside it.
  It writes only the two existing gallery directories and its private state.

The worker scans rendered post anchors with overlapping viewport sections, stops
on a verified overlap of three non-pinned archived posts, and deduplicates by
shortcode. Existing canonical collaborative-post URLs and full captions survive.
Up to 24 new images are copied per run, oldest observed backlog first. Any spare
capacity refreshes up to six observed existing covers. Missing rows or overlap,
login expiry, restrictions, and challenges abort without a manifest commit.
Profile stats/avatar/highlights/biography are currently preserved; no inferred
updates or removal reconciliation are performed.

Images require expected HTTPS CDN hosts, pinned public IPv4 resolution, no
redirects, supported MIME/signatures and a 4 MB limit. Uploaded filenames are
derived server-side from content hashes. Images are written to both source and
live archives and checked publicly before manifest commit. The publisher checks
every referenced asset, retains the previous manifest, and atomically replaces
the live manifest. If interrupted before updating the source archive, the next
authenticated publisher request repairs the source from that committed live copy.
Neither publisher nor worker deletes archived posts/assets.

An expiring private lease serializes invocations and fences late commits. The
worker uses a 235-second work deadline within its 300-second function duration.
State records last attempt, last successful check/publication/new post, observed
post count, failure category and consecutive failure count. No alert messages are
sent until the owner chooses a delivery channel.

## Complete worker authentication

Only use a dedicated worker account legitimately entitled to see this profile.
Do not export an everyday browser profile or bypass verification/access controls.

1. From this repository, run `node scripts/instagram-worker-login.mjs` in an
   interactive local terminal. Sign in normally in the isolated Chrome window,
   navigate to the profile, verify its grid, then follow the terminal prompt.
2. Transfer the resulting private session without printing it:

   ```sh
   scp -i ~/.ssh/grandmajazz_ed25519 ~/.codex/private/grandmajazz-instagram-sync/worker-session.json grandmajazz@185.111.159.228:/tmp/instagram-worker-session.json
   ssh -i ~/.ssh/grandmajazz_ed25519 grandmajazz@185.111.159.228 'sudo -n install -o Bradfran -g Bradfran -m 600 /tmp/instagram-worker-session.json /var/lib/grandmajazz-instagram-sync/worker-session.json && rm /tmp/instagram-worker-session.json'
   ```

3. Make an authenticated manual route invocation from a private script that reads
   `~/.codex/private/grandmajazz-instagram-sync/cron-secret`. Never put secrets in
   URLs, command arguments, frontend code, screenshots or logs. Inspect status.
4. Run again and verify deduplication and the existing archive. Verify actual
   age-restricted profile access from the Vercel environment; a local login alone
   does not establish this. Stop for owner attention on challenges or expiry.

## Scheduling gate

No cron is configured yet. Before enabling it, verify the actual Vercel plan,
successful authenticated production sync and repeat-run safety. Current Vercel
documentation allows at most daily cron on Hobby; two-hour execution requires
Pro or Enterprise. Do not upgrade or purchase anything without spending approval.
Once these gates pass, merge (never replace existing entries) this cron into the
project's existing configuration:

```json
{ "crons": [{ "path": "/api/internal/instagram-sync", "schedule": "0 */2 * * *" }] }
```

Record a genuine subsequent scheduled invocation before calling the schedule
verified. Physical-phone link/app behavior and touch scrolling need a physical
device; responsive desktop checks do not establish them.

## Validation and rollback

Run `npm test`, `npx tsc --noEmit`, and
`python3 infra/instagram-sync/test_publisher.py`. Publisher tests use temporary
directories, never the live archive. Tests exercise unauthorized access,
concurrency/expiry fencing, absent authentication, empty/partial scans, missing
images, invalid uploads/paths, repeat deduplication and interrupted publication.

Publisher manifests are retained under the private `backups/` directory. Stop
the sync service before restoring a verified backup to both manifest locations.
Keep image files. The gallery static service requires no restart.

References: https://vercel.com/docs/cron-jobs/usage-and-pricing and
https://vercel.com/docs/functions/limitations . Verify current plan settings.
