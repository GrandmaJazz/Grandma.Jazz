# Codex Deployment Prompt — Grandma Jazz on a Linux VPS (PM2 + NGINX + Cloudflare)

Copy everything below the line into Codex on the VPS. Replace the placeholder values in the **Inputs** block first, then send. Codex must execute the steps in order and stop on the first failure.

---

You are deploying the Node.js app at `<GITHUB_REPO_URL>` to a fresh **Ubuntu 22.04+** VPS. Do the entire deployment in one pass. Do not skip steps. Do not ask follow-up questions. If a step fails, print the failing command and the error, then stop with `DEPLOY FAILED` and the step number.

## Hard Rules

- **Primary domain:** `grandmajazz.com`
- **WWW alias:** `www.grandmajazz.com`
- **Mount path:** `/` (root)
- **DO NOT** deploy this app on `saint-tv.com`.
- **DO NOT** deploy this app on `sainttv.win`.
- Do not configure any NGINX `server_name`, certbot domain, or proxy_pass route that attaches Grandma Jazz to either of those domains. They are mentioned **only** as a forbidden-deploy rule.

## Inputs (fill these in before running)

```
GITHUB_REPO_URL     = https://github.com/bradfran-hub/grandmajazz.git
BRANCH              = main
DOMAIN              = grandmajazz.com
WWW_DOMAIN          = www.grandmajazz.com
PUBLIC_URL          = https://grandmajazz.com
BASE_PATH           = /
APP_USER            = grandma
APP_DIR             = /home/grandma/app
APP_PORT            = 3000

# Source database (the Neon DB currently in use — needed for the data copy)
SOURCE_DATABASE_URL = postgres://...neon.tech/...?sslmode=require

# Target database — pick ONE of the two modes below

# MODE A (recommended, zero-copy): keep using the same Neon database
TARGET_MODE         = neon
TARGET_DATABASE_URL = ${SOURCE_DATABASE_URL}

# MODE B (self-host on VPS): provision local Postgres and copy data 1:1
# TARGET_MODE        = local
# LOCAL_PG_USER      = grandma
# LOCAL_PG_PASS      = <strong-password>
# LOCAL_PG_DB        = grandmajazz
# TARGET_DATABASE_URL = postgres://${LOCAL_PG_USER}:${LOCAL_PG_PASS}@127.0.0.1:5432/${LOCAL_PG_DB}

# Third-party API keys (copy from current Replit secrets)
RESEND_API_KEY            = re_...
MAILCHIMP_API_KEY         =                     # optional — leave blank to skip Mailchimp
MAILCHIMP_SERVER_PREFIX   =                     # optional
MAILCHIMP_AUDIENCE_ID     =                     # optional
```

## Hard Requirements

- App reachable at `https://grandmajazz.com/` (and `https://www.grandmajazz.com/` redirects to it).
- `https://grandmajazz.com/api/healthz` returns `{"status":"ok"}`.
- `https://grandmajazz.com/api/members` returns the **same row count** as the source database.
- `https://saint-tv.com/grandma-jazz/` returns **404** (this app is not attached there).
- `https://sainttv.win/grandma-jazz/` returns **404** (this app is not attached there).
- App runs under **PM2** with autostart on reboot, app name `grandmajazz`.
- App binds to `0.0.0.0:3000` and reads `PORT` / `HOST` from env.
- NGINX in front, TLS via certbot for both `grandmajazz.com` and `www.grandmajazz.com`.
- `X-Robots-Tag: noindex, nofollow, noarchive` injected by NGINX.
- No secrets committed to git. No sitemap generated.

## Steps

### 1. System prep (as root)

```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl git nginx ufw certbot python3-certbot-nginx postgresql-client build-essential

# Native libs required by the `canvas` npm package (server-side brick PNG renderer).
# Without these, `npm ci` will FAIL while building canvas from source.
apt-get install -y \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  libpixman-1-dev pkg-config

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v && npm -v   # must be >= v20
npm i -g pm2

id -u ${APP_USER} >/dev/null 2>&1 || adduser --disabled-password --gecos "" ${APP_USER}

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 2. Clone repo (as APP_USER)

```bash
sudo -iu ${APP_USER} bash -lc "
  set -e
  mkdir -p \$(dirname ${APP_DIR})
  if [ -d ${APP_DIR}/.git ]; then
    cd ${APP_DIR} && git fetch --all && git reset --hard origin/${BRANCH}
  else
    git clone --branch ${BRANCH} ${GITHUB_REPO_URL} ${APP_DIR}
  fi
"
```

### 3. Database setup

**If `TARGET_MODE = neon`:** the Neon DB is already populated; nothing to copy.

**If `TARGET_MODE = local`:** provision Postgres on the VPS and copy data 1:1 from Neon.

```bash
apt-get install -y postgresql
systemctl enable --now postgresql

sudo -u postgres psql <<SQL
CREATE ROLE ${LOCAL_PG_USER} LOGIN PASSWORD '${LOCAL_PG_PASS}';
CREATE DATABASE ${LOCAL_PG_DB} OWNER ${LOCAL_PG_USER};
SQL

# Dump from Neon — schema + data, exact copy
pg_dump "${SOURCE_DATABASE_URL}" \
  --no-owner --no-privileges --no-acl \
  --format=custom --file=/tmp/grandmajazz.dump

pg_restore \
  --no-owner --no-acl --clean --if-exists \
  --dbname="${TARGET_DATABASE_URL}" \
  /tmp/grandmajazz.dump

rm -f /tmp/grandmajazz.dump
```

**Verify the copy** (run for both modes):

```bash
SRC_COUNT=$(psql "${SOURCE_DATABASE_URL}" -tAc "SELECT COUNT(*) FROM family_members" | tr -d '[:space:]')
DST_COUNT=$(psql "${TARGET_DATABASE_URL}" -tAc "SELECT COUNT(*) FROM family_members" | tr -d '[:space:]')
echo "source=${SRC_COUNT} target=${DST_COUNT}"
[ "${SRC_COUNT}" = "${DST_COUNT}" ] || { echo "ROW COUNT MISMATCH"; exit 1; }
```

### 3.5 Brick font (optional but recommended)

The server renders the brick PNG that ships as the welcome-email attachment and
as the user's downloadable tile (`GET /api/brick.png?title=…&name=…`). It looks
for a font in this order:

1. Path in env var `GRANDMA_FONT_PATH`
2. `${APP_DIR}/server/fonts/Galvji-Light.ttf`
3. `${APP_DIR}/server/fonts/brick-light.ttf`

If none is present, it falls back to the system `sans-serif` (still works,
typeface differs).

```bash
sudo -iu ${APP_USER} bash -lc "
  mkdir -p ${APP_DIR}/server/fonts
  # Copy your Galvji-Light.ttf (or any light sans-serif renamed to it) here.
  # Apple's Galvji is NOT freely redistributable — copy from your own Mac:
  #   scp /System/Library/Fonts/Supplemental/Galvji.ttc user@vps:${APP_DIR}/server/fonts/
  # Or use a free substitute (Inter Light works well):
  #   curl -fsSL -o ${APP_DIR}/server/fonts/Galvji-Light.ttf <YOUR_FONT_URL>
  ls -la ${APP_DIR}/server/fonts/
"
```

### 4. Environment file

```bash
sudo -iu ${APP_USER} bash -lc "
  cat > ${APP_DIR}/.env <<EOF
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0
BASE_PATH=${BASE_PATH}
PUBLIC_URL=${PUBLIC_URL}
DATABASE_URL=${TARGET_DATABASE_URL}
RESEND_API_KEY=${RESEND_API_KEY}
MAILCHIMP_API_KEY=${MAILCHIMP_API_KEY}
MAILCHIMP_SERVER_PREFIX=${MAILCHIMP_SERVER_PREFIX}
MAILCHIMP_AUDIENCE_ID=${MAILCHIMP_AUDIENCE_ID}
EOF
  chmod 600 ${APP_DIR}/.env
"
```

### 5. Install + type-check + build

```bash
sudo -iu ${APP_USER} bash -lc "
  set -e
  cd ${APP_DIR}
  set -a; . ./.env; set +a
  npm ci
  npm run check
  npm run build
  test -f dist/index.cjs
  test -f dist/public/index.html
"
```

### 6. PM2

```bash
sudo -iu ${APP_USER} bash -lc "
  set -e
  cd ${APP_DIR}
  set -a; . ./.env; set +a
  pm2 delete grandmajazz 2>/dev/null || true
  pm2 start ecosystem.config.cjs --update-env
  pm2 save
"

# Configure PM2 to start at boot for APP_USER
env PATH=$PATH:/usr/bin pm2 startup systemd -u ${APP_USER} --hp /home/${APP_USER} | tail -1 | bash

sleep 3
sudo -iu ${APP_USER} pm2 status
curl -fsS http://127.0.0.1:${APP_PORT}/api/healthz   # must print {"status":"ok"}
```

### 7. NGINX + TLS

```bash
cat > /etc/nginx/sites-available/grandmajazz <<'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/grandmajazz /etc/nginx/sites-enabled/grandmajazz
rm -f /etc/nginx/sites-enabled/default

# Issue/install certs for both domains; certbot will rewrite the ssl_certificate lines
certbot --nginx \
  -d grandmajazz.com -d www.grandmajazz.com \
  --non-interactive --agree-tos -m admin@grandmajazz.com --redirect

nginx -t && systemctl reload nginx
```

If using Cloudflare in front, set the Cloudflare SSL mode to **Full (strict)** after certbot succeeds.

### 8. Final verification (ALL must pass)

```bash
curl -fsS "https://grandmajazz.com/api/healthz" | grep -q '"status":"ok"'

COUNT=$(curl -fsS "https://grandmajazz.com/api/members" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')
echo "members returned by API: ${COUNT}"
[ "${COUNT}" = "${DST_COUNT}" ] || { echo "API row count != DB row count"; exit 1; }

# Brick PNG endpoint (server-side renderer, used for both email attachment + downloads)
curl -fsS -o /tmp/brick-test.png "https://grandmajazz.com/api/brick.png?title=Uncle&name=Bob"
file /tmp/brick-test.png | grep -q "PNG image data, 3040 x 1040" \
  || { echo "BRICK PNG render failed (expected 3040x1040 PNG)"; exit 1; }
rm -f /tmp/brick-test.png

# Negative checks — must NOT serve this app on saint-* domains
SAINT_A=$(curl -s -o /dev/null -w '%{http_code}' "https://saint-tv.com/grandma-jazz/" || true)
SAINT_B=$(curl -s -o /dev/null -w '%{http_code}' "https://sainttv.win/grandma-jazz/" || true)
echo "saint-tv.com/grandma-jazz/ -> ${SAINT_A}"
echo "sainttv.win/grandma-jazz/  -> ${SAINT_B}"
[ "${SAINT_A}" = "404" ] || echo "WARN: saint-tv.com returned ${SAINT_A} (expected 404)"
[ "${SAINT_B}" = "404" ] || echo "WARN: sainttv.win returned ${SAINT_B} (expected 404)"

sudo -iu ${APP_USER} pm2 status grandmajazz | grep -q online

echo "DEPLOYMENT OK"
```

## Output

When complete, print:

```
DEPLOYED
URL:         https://grandmajazz.com/
WWW:         https://www.grandmajazz.com/  (redirects to apex)
Health:      https://grandmajazz.com/api/healthz
Members API: https://grandmajazz.com/api/members
PM2:         pm2 status grandmajazz
Logs:        pm2 logs grandmajazz
DB mode:     ${TARGET_MODE}
DB rows:     ${DST_COUNT}
Saint check: saint-tv.com=${SAINT_A}, sainttv.win=${SAINT_B} (expected 404 each)
```

If any step failed, print `DEPLOY FAILED` followed by the failing step number and the captured error.

---

## Reference — what the server now owns

This deploy ships with **server-side brick PNG rendering** (was previously
client-side via `html2canvas`). Implications:

- The browser no longer needs to render or upload anything before submitting
  a member; the `POST /api/members` body is just `{title, name, email}`.
- The server (`server/brickImage.ts`) renders a 3040×1040 PNG using
  `node-canvas` and:
    1. Attaches it to the welcome email (Resend), filename
       `<Name>-<Title>-grandma-jazz.png`.
    2. Serves it on demand at `GET /api/brick.png?title=…&name=…` with
       `Content-Disposition: attachment` so the user can download/print it.
- The welcome email template (HTML, dark theme, "Welcome to the Family",
  "Thanks Grandma" 10% discount steps, signed Grandma Jazz) lives in
  `server/email.ts` — edit it there, redeploy with `npm run build && pm2
  reload grandmajazz`.

### Welcome email — exact subject + body

- **From:** `Grandma Jazz <family@mail.grandmajazz.com>`
- **To:** the new member
- **CC:** `grandma@grandmajazz.com`
- **Subject:** `Welcome to the Family, ${title} ${name}!`
- **Attachment:** `${name}-${title}-grandma-jazz.png` (the rendered brick)
- **Body (text equivalent of the HTML template):**

  ```
  Welcome to the Family

  [ ${title} ]
  [ ${name}  ]   ← rendered as a white-bordered tile in HTML

  Hello there my dearest, ${name}.
  I'm so glad you pressed those buttons and joined the Grandma Jazz family.
  As we grow together, I'll be sure to keep you updated on a number of
  things, not too many emails though, promise.

  To claim your 10% discount, follow these steps:
    ① Walk up to the Budtender.
    ② Say the phrase - "Thanks Grandma".
    ③ Wink with one eye.

  You can do it now or a little bit later, up to you, my dear.
  Easy peasy.
  ```

The full HTML (black background, Galvji font, white-on-black tile) is in
`server/email.ts`. Resend handles delivery; `RESEND_API_KEY` must be set and
the sender domain `mail.grandmajazz.com` must be verified in your Resend
dashboard (DNS records: SPF, DKIM, MX).

### Resend domain verification (one-time)

In the Resend dashboard:

1. Add domain `mail.grandmajazz.com`.
2. Resend will give you 3 DNS records (SPF TXT, DKIM CNAME, MX). Add them in
   Cloudflare DNS for the `mail` subdomain (no proxy — DNS only / grey cloud).
3. Wait for "Verified" status. Until then, `sendWelcomeEmail` will fail with
   "domain not verified".

If you want to test before verification, temporarily change `senderEmail` in
`server/email.ts` to `'Grandma Jazz <onboarding@resend.dev>'` (Resend's
test sender, only delivers to your own account email).
