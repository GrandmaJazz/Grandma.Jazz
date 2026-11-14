#!/usr/bin/env bash
# Installed on the VPS as the forced command for the CI deployment key.
set -Eeuo pipefail
umask 022

app=/home/grandmajazz/com-migration-20260929T075653Z/app
public="$app/dist/public"
origin=http://127.0.0.1:3014
service=grandmajazz-com-platform

exec 9>"$app/../events-garments-deploy.lock"
flock -n 9
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

# Accept only the frontend bundle. Build output from previous releases stays
# available so active sessions can finish loading their old hashed chunks.
python3 - "$stage" 3<&0 <<'PYTHON'
import os
from pathlib import PurePosixPath
import re
import shutil
import sys
import tarfile

with os.fdopen(3, "rb") as stream, tarfile.open(fileobj=stream, mode="r|gz") as archive:
    total = 0
    seen = set()
    for member in archive:
        if member.isdir():
            continue
        name = str(PurePosixPath(member.name))
        allowed = name == "index.html" or re.fullmatch(
            r"assets/[a-zA-Z0-9_.-]+\.(?:js|css|png|svg|webp|jpg|gif|woff2?|ttf)", name
        )
        if not member.isfile() or not allowed or name in seen:
            sys.exit(f"Unexpected archive member: {member.name!r}")
        total += member.size
        if total > 50 * 1024 * 1024:
            sys.exit("Frontend bundle exceeds 50 MiB")
        seen.add(name)
        destination = os.path.join(sys.argv[1], name)
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        with archive.extractfile(member) as source, open(destination, "xb") as target:
            shutil.copyfileobj(source, target)
    if "index.html" not in seen:
        sys.exit("Frontend entry page is required")
PYTHON

entry=$(grep -oE '/assets/index-[A-Za-z0-9_-]+[.]js' "$stage/index.html")
test -s "$stage$entry"

pm2 jlist | node -e '
const processes = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const [name, cwd] = process.argv.slice(1);
if (processes.filter(p => p.name === name && p.pm2_env.pm_cwd === cwd && p.pm2_env.status === "online").length !== 1) {
  console.error("Expected one online Grandma Jazz production process");
  process.exit(1);
}
' "$service" "$app"
curl -fsS --max-time 8 "$origin/api/healthz" >/dev/null

replace_file() {
  local temp
  temp=$(mktemp "${2}.XXXXXXXX") || return
  install -m 644 "$1" "$temp" && mv -f "$temp" "$2"
}

shopt -s nullglob
for file in "$stage"/assets/*; do
  relative=${file#"$stage/"}
  if [[ -e "$public/$relative" ]]; then
    cmp "$file" "$public/$relative"
  else
    replace_file "$file" "$public/$relative"
  fi
done

wait_for_health() {
  for attempt in {1..20}; do
    if curl -fsS --max-time 3 "$origin/api/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  printf 'Platform health did not recover.\n' >&2
  return 1
}

verify() {
  local html route
  for route in '/events/?embedded=1' '/garments/?embedded=1'; do
    html=$(curl -fsSL --max-time 15 "$origin$route") || return
    grep -Fq "$entry" <<< "$html" || return
  done
  curl -fsSL --max-time 15 "$origin/family-wall/" >/dev/null || return
  curl -fsSL --max-time 15 "$origin/events/api/health" >/dev/null
}

if cmp -s "$stage/index.html" "$public/index.html" &&
   verify; then
  printf 'Release already active and verified.\n'
  exit 0
fi

backup=$(mktemp -d "$app/../platform-frontend-rollback.XXXXXXXX")
cp -p "$public/index.html" "$backup/"
rollback() {
  trap - ERR
  printf 'Release check failed. Restoring the entry page from %s\n' "$backup" >&2
  replace_file "$backup/index.html" "$public/index.html" &&
    pm2 restart "$service" >/dev/null && wait_for_health ||
    printf 'Rollback needs attention on the VPS.\n' >&2
  exit 1
}
trap rollback ERR
replace_file "$stage/index.html" "$public/index.html"
# Events caches its template in memory.
pm2 restart "$service" >/dev/null
wait_for_health
verify
trap - ERR
printf 'Verified the Events and Garments release and Family Wall availability. Rollback files: %s\n' "$backup"
