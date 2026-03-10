#!/usr/bin/env bash
# Exchange a LinkedIn OAuth authorization code for an access token.
# Edit the three values below, then run: ./get-token.sh (or ./scripts/linkedin/get-token.sh if copied there).
# Add the returned access_token to OpenClaw auth profile or LINKEDIN_ACCESS_TOKEN.
# To post organic content: LINKEDIN_ACCESS_TOKEN=... node scripts/linkedin/post-organic.mjs "Your text" [--draft]

set -euo pipefail

# --- Fill in (from app Auth tab + code from redirect URL after Allow) ---
LINKEDIN_CLIENT_ID='...'
LINKEDIN_CLIENT_SECRET='...'
LINKEDIN_OAUTH_CODE='...'
# -----------------------------------------------------------------------

REDIRECT_URI="${LINKEDIN_REDIRECT_URI:-http://localhost:8080/callback}"

if [[ -z "${LINKEDIN_CLIENT_ID:-}" ]]; then
  echo "Error: LINKEDIN_CLIENT_ID is not set" >&2
  exit 1
fi
if [[ -z "${LINKEDIN_CLIENT_SECRET:-}" ]]; then
  echo "Error: LINKEDIN_CLIENT_SECRET is not set" >&2
  exit 1
fi
if [[ -z "${LINKEDIN_OAUTH_CODE:-}" ]]; then
  echo "Error: LINKEDIN_OAUTH_CODE is not set (paste the code= value from the URL after Allow)" >&2
  exit 1
fi

echo "Exchanging code for token (redirect_uri=$REDIRECT_URI)..." >&2
# Use --data-urlencode so client_secret and code are not mangled by the shell (e.g. trailing = or special chars).
curl -sS -X POST 'https://www.linkedin.com/oauth/v2/accessToken' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${LINKEDIN_OAUTH_CODE}" \
  --data-urlencode "redirect_uri=${REDIRECT_URI}" \
  --data-urlencode "client_id=${LINKEDIN_CLIENT_ID}" \
  --data-urlencode "client_secret=${LINKEDIN_CLIENT_SECRET}"
  