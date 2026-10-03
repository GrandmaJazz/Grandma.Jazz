# Codex VPS Patch — Center brick PNG text + (optional) install Galvji font

Copy everything below the line into Codex on the **grandmajazz.com** VPS.
This is a fast in-place patch: pull from GitHub, rebuild, reload PM2, verify.
No DNS, NGINX, certbot, or DB changes.

---

You are patching the live Grandma Jazz app at `grandmajazz.com`.
Do the steps in order. Stop on the first failure with `PATCH FAILED <step>`.

## Hard rules

- **Domain:** `grandmajazz.com` only.
- **DO NOT** touch `saint-tv.com` or `sainttv.win`.
- **DO NOT** modify NGINX, certbot, DNS, or the database.

## Inputs

```
APP_USER  = grandma
APP_DIR   = /home/grandma/app
APP_NAME  = grandmajazz       # the PM2 process name
BRANCH    = main
# Optional: a light sans-serif TTF you want to use for the brick text.
# Leave empty to skip the font install — the app will fall back to system
# sans-serif (still works, only typeface differs).
FONT_URL  =                   # e.g. https://example.com/Galvji-Light.ttf
```

## What this patch does

1. Pulls commit `Fix brick PNG: vertically center text block` from GitHub.
   The brick PNG (used for the email attachment AND the user's downloaded
   tile) was rendering text in the upper third of the tile with a big black
   void below. The fix vertically centers the two-line block.
2. (Optional) Installs a custom font at `server/fonts/Galvji-Light.ttf` so
   the typeface matches the website. Without it, the renderer uses the
   system default — the centering fix still applies either way.
3. Reinstalls deps in case the lockfile changed, type-checks, builds,
   reloads PM2, and verifies the rendered PNG.

## Steps

### 1. Pull latest main

```bash
sudo -iu ${APP_USER} bash -lc "
  set -e
  cd ${APP_DIR}
  git fetch origin
  git reset --hard origin/${BRANCH}
  git log -1 --oneline
"
```

The most recent commit message must contain
`Fix brick PNG: vertically center text block`.

### 2. (Optional) Install brick font

Skip this whole step if `FONT_URL` is empty. The brick still renders
correctly without it, just in DejaVu/Liberation sans-serif.

```bash
if [ -n "${FONT_URL}" ]; then
  sudo -iu ${APP_USER} bash -lc "
    set -e
    mkdir -p ${APP_DIR}/server/fonts
    curl -fsSL -o ${APP_DIR}/server/fonts/Galvji-Light.ttf '${FONT_URL}'
    ls -la ${APP_DIR}/server/fonts/Galvji-Light.ttf
    file ${APP_DIR}/server/fonts/Galvji-Light.ttf | grep -i 'TrueType\|OpenType' \
      || { echo 'Downloaded file is not a TTF/OTF'; exit 1; }
  "
fi
```

If you'd rather copy a font file from your laptop:

```bash
# Run this from your local machine, NOT from the VPS:
#   scp ~/path/to/Galvji-Light.ttf grandma@<vps-ip>:/home/grandma/app/server/fonts/
```

Apple's Galvji is bundled with macOS at
`/System/Library/Fonts/Supplemental/Galvji.ttc` (note: `.ttc` collection,
not `.ttf` — node-canvas handles `.ttc` fine, but rename it to
`Galvji-Light.ttf` if you want auto-detection, or set
`GRANDMA_FONT_PATH=/home/grandma/app/server/fonts/Galvji.ttc` in `.env`).

### 3. Install + type-check + build

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

If `npm ci` fails on the `canvas` package, the native libs are missing —
install them once and retry:

```bash
apt-get install -y \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  libpixman-1-dev pkg-config
```

### 4. Reload PM2

```bash
sudo -iu ${APP_USER} bash -lc "
  set -e
  cd ${APP_DIR}
  pm2 reload ${APP_NAME} --update-env
  sleep 2
  pm2 status ${APP_NAME}
"
```

### 5. Verify

```bash
# Health
curl -fsS https://grandmajazz.com/api/healthz | grep -q '"status":"ok"' \
  || { echo 'health check failed'; exit 1; }

# Render a brick PNG and confirm dimensions
curl -fsS -o /tmp/brick.png \
  "https://grandmajazz.com/api/brick.png?title=Grandpa&name=Brsd"
file /tmp/brick.png | grep -q 'PNG image data, 3040 x 1040' \
  || { echo 'brick PNG dimensions wrong'; exit 1; }

# Pixel-sanity check: with text vertically centered, the top 15% of the
# tile must be mostly black (no glyphs). Use ImageMagick if available;
# otherwise just eyeball /tmp/brick.png by scp'ing it back to your laptop.
if command -v identify >/dev/null 2>&1; then
  TOP_MEAN=$(convert /tmp/brick.png -crop 3040x150+0+30 -colorspace Gray \
    -format "%[fx:mean]" info:)
  echo "top-strip mean luminance = ${TOP_MEAN}  (expect < 0.15)"
  awk -v m="${TOP_MEAN}" 'BEGIN{ exit !(m < 0.15) }' \
    || { echo 'WARN: top of tile is bright — text may not be centered'; }
fi

# Confirm the brick endpoint logs show the renderer ran (look for the
# font line on first hit since process start)
sudo -iu ${APP_USER} pm2 logs ${APP_NAME} --lines 40 --nostream \
  | grep -E 'BrickImage|brick\.png' || true

echo 'PATCH OK'
```

If you want to eyeball the rendered tile from your laptop:

```bash
# Run from your laptop, not the VPS:
scp grandma@<vps-ip>:/tmp/brick.png ~/Desktop/brick.png && open ~/Desktop/brick.png
```

### 6. (Optional) Send a real test email

```bash
# Trigger a real welcome email by joining as a test member from the live site:
#   1. Open https://grandmajazz.com in a private window
#   2. Join with title=Grandpa name=Brsd email=<your test address>
#   3. Confirm: (a) subject "Welcome to the Family, Grandpa Brsd!"
#               (b) attachment Brsd-Grandpa-grandma-jazz.png
#               (c) attachment text is vertically centered
#               (d) website "save your brick" button downloads the same PNG
```

## Output

When complete, print:

```
PATCHED
Commit:     <SHA from `git log -1 --oneline`>
Brick URL:  https://grandmajazz.com/api/brick.png?title=Grandpa&name=Brsd
Dims:       3040 x 1040 PNG (verified)
Font:       <Galvji-Light.ttf installed | system sans-serif fallback>
PM2:        pm2 status ${APP_NAME}
```

If anything failed, print `PATCH FAILED <step number>` and the captured
error output.
