#!/usr/bin/env bash
# prepare-apple-certs.sh
# One-time helper: turns your exported Pass Type ID .p12 into the base64 PEM
# env values the app needs, and fetches the Apple WWDR G4 intermediate cert.
#
# Usage:
#   bash scripts/prepare-apple-certs.sh /path/to/pass.p12 "p12-password"
#
# Output: writes apple-pass.env in the current directory with:
#   APPLE_PASS_SIGNER_CERT, APPLE_PASS_SIGNER_KEY, APPLE_WWDR
# Add those three to your Vercel project's Environment Variables.
#
# Requires: openssl, curl (both preinstalled on macOS).

set -euo pipefail

P12="${1:-}"
PW="${2:-}"

if [[ -z "$P12" || -z "$PW" ]]; then
  echo "Usage: bash scripts/prepare-apple-certs.sh /path/to/pass.p12 \"p12-password\""
  exit 1
fi
if [[ ! -f "$P12" ]]; then
  echo "File not found: $P12"
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Extracting signer certificate…"
# -legacy is needed on OpenSSL 3 for p12 files produced by Keychain.
LEGACY=""
if openssl pkcs12 -help 2>&1 | grep -q -- '-legacy'; then
  LEGACY="-legacy"
fi

openssl pkcs12 -in "$P12" -clcerts -nokeys -passin "pass:${PW}" $LEGACY 2>/dev/null \
  | openssl x509 > "$TMP/signerCert.pem"

echo "→ Extracting private key (decrypted)…"
openssl pkcs12 -in "$P12" -nocerts -nodes -passin "pass:${PW}" $LEGACY 2>/dev/null \
  | openssl pkey > "$TMP/signerKey.pem"

echo "→ Fetching Apple WWDR G4 intermediate certificate…"
curl -fsSL -o "$TMP/wwdr.cer" https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in "$TMP/wwdr.cer" -out "$TMP/wwdr.pem"

echo "→ Encoding to base64 and writing apple-pass.env…"
{
  echo "APPLE_PASS_SIGNER_CERT=$(openssl base64 -A -in "$TMP/signerCert.pem")"
  echo "APPLE_PASS_SIGNER_KEY=$(openssl base64 -A -in "$TMP/signerKey.pem")"
  echo "APPLE_WWDR=$(openssl base64 -A -in "$TMP/wwdr.pem")"
  echo "PASS_TYPE_IDENTIFIER=pass.store.grandmajazz.events"
  echo "APPLE_TEAM_ID=PG9RLC7V6N"
} > apple-pass.env

echo ""
echo "✅ Done. Wrote apple-pass.env"
echo "   Add these 5 variables to Vercel → Project → Settings → Environment Variables."
echo "   Keep apple-pass.env private and DO NOT commit it (already covered by .gitignore)."
