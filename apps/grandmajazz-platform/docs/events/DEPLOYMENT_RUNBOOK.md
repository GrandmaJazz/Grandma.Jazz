# Deployment Runbook — Grandma Jazz Events (grandmajazz.com)

> STATUS: DRAFT until Phase 9. Production deploy requires an explicit "go" from Bradfran.

## Facts (verified 2026-07-10)
- Repo/build location (prod): `/var/www/grandmajazz` (root-owned)
- Dev workspace: `/home/Bradfran/grandmajazz-events`, branch `events-platform`
- Runtime: Node v20.20.2, npm 10.8.2
- Install: `npm ci`
- Build: `npm run build` (**destroys `dist/` first — build in a staging copy, never in-place while PM2 is serving**)
- Type check: `npm run check`
- Tests: `npm test` (vitest; added by this project)
- Migrations: `npm run db:migrate` (added by this project; drizzle SQL migrations in `migrations/`)
- Env file: `/var/www/grandmajazz/.env` (root, 600)
- Process manager: PM2 **as root** (`pm2-root.service`), app `grandmajazz`, `ecosystem.config.cjs`, port 3012
- Web server: nginx `/etc/nginx/sites-enabled/grandmajazz.com` → proxy_pass 127.0.0.1:3012 (no change needed for /events)
- Watchdog: `grandmajazz-watchdog.service` (30s interval, repairs after 2 failures) — consider `systemctl stop` during deploy window, restart after
- Logs: `sudo pm2 logs grandmajazz` / `/root/.pm2/logs/grandmajazz-*.log`
- Health: `GET /api/healthz` (legacy) and `GET /events/api/health` (events module)

## Backup (before any prod migration)
```bash
sudo -u postgres pg_dump -Fc grandmajazz > /root/backups/grandmajazz-$(date +%Y%m%d-%H%M%S).dump
sudo tar czf /root/backups/grandmajazz-uploads-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www/grandmajazz data uploads 2>/dev/null || true
```
Restore: `sudo -u postgres pg_restore -d grandmajazz --clean --if-exists <dump>`

## Deploy procedure (Phase 9, after explicit go)
1. Backup (above).
2. `sudo git -C /var/www/grandmajazz add -A && sudo git -C /var/www/grandmajazz commit -m "snapshot pre-events drift"` (preserve live tree)
3. `sudo git -C /var/www/grandmajazz fetch /home/Bradfran/grandmajazz-events events-platform && sudo git -C /var/www/grandmajazz merge --ff-only FETCH_HEAD` (or checkout branch)
4. Append new env vars to `/var/www/grandmajazz/.env` (see CREDENTIAL_SETUP.md / .env.example)
5. Build **out-of-place**: build in dev workspace at same commit, then
   `sudo rsync -a --delete /home/Bradfran/grandmajazz-events/dist/ /var/www/grandmajazz/dist.new/` then swap:
   `sudo mv /var/www/grandmajazz/dist /var/www/grandmajazz/dist.old && sudo mv /var/www/grandmajazz/dist.new /var/www/grandmajazz/dist`
   (downtime ≈ 0; PM2 keeps serving old inode until restart)
6. `sudo npm ci --prefix /var/www/grandmajazz` (new deps: qrcode, sanitize-html, sharp, multer, passkit-generator, google-auth-library)
7. Migrate: `cd /var/www/grandmajazz && sudo -E npm run db:migrate` (additive only)
8. `sudo pm2 restart grandmajazz --update-env`
9. Smoke tests (below). 10. Watch logs 5 min.

## Smoke tests (run against production after deploy)
```bash
curl -s https://grandmajazz.com/api/healthz              # legacy health {"status":"ok"}
curl -sI https://grandmajazz.com/ | head -3              # existing wall site 200
curl -s https://grandmajazz.com/api/members | head -c 80 # legacy API works
curl -s https://grandmajazz.com/events/api/health        # events health
curl -sI https://grandmajazz.com/events | head -3        # public listing 200
curl -sI https://grandmajazz.com/events/manage/login     # organizer login 200
# + browser: register on a test event, open ticket, scan QR
sudo pm2 logs grandmajazz --lines 50 --nostream
```

## Rollback
```bash
sudo mv /var/www/grandmajazz/dist /var/www/grandmajazz/dist.failed
sudo mv /var/www/grandmajazz/dist.old /var/www/grandmajazz/dist
sudo git -C /var/www/grandmajazz reset --hard <pre-deploy-snapshot-commit>  # working tree only, after dist swap
sudo pm2 restart grandmajazz --update-env
```
Migrations are additive; rollback does NOT drop new tables (old code ignores them).
Full DB rollback (only if data corruption): pg_restore from the pre-deploy dump.
