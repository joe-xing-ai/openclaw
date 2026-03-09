#!/usr/bin/env bash
# Call OpenAI chat completions with the same key the OpenClaw gateway uses, to see the raw API error.
# Loads the key from OpenClaw's auth store: ~/.openclaw/agents/main/agent/auth-profiles.json
# Usage: bash scripts/test-openai-direct.sh   (or set OPENAI_API_KEY to override)
set -e
KEY="${OPENAI_API_KEY:-}"
if [[ -z "$KEY" ]]; then
  AUTH_FILE="${OPENCLAW_AGENT_DIR:-$HOME/.openclaw/agents/main/agent}/auth-profiles.json"
  if [[ ! -f "$AUTH_FILE" ]]; then
    echo "OpenClaw auth store not found: $AUTH_FILE"
    echo "Set OPENAI_API_KEY=sk-... or run onboarding so the gateway has an OpenAI profile."
    exit 1
  fi
  KEY=$(node -e "
    const fs = require('fs');
    const path = process.env.OPENCLAW_AUTH_FILE || '$AUTH_FILE';
    const j = JSON.parse(fs.readFileSync(path, 'utf8'));
    const profiles = j.profiles || {};
    for (const [id, p] of Object.entries(profiles)) {
      if (p && p.type === 'api_key' && p.provider === 'openai' && p.key) {
        console.log(p.key);
        process.exit(0);
      }
    }
    process.exit(1);
  ")
  if [[ -z "$KEY" ]]; then
    echo "No OpenAI api_key found in $AUTH_FILE (profiles may use keyRef or no openai profile)."
    echo "Set OPENAI_API_KEY=sk-... to test with your key."
    exit 1
  fi
  echo "Loaded OpenAI key from OpenClaw auth store: $AUTH_FILE"
fi
echo "Using key prefix: ${KEY:0:12}..."
RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.2","messages":[{"role":"user","content":"Hi"}],"max_tokens":50}')
HTTP=$(echo "$RESP" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
BODY=$(echo "$RESP" | sed '/HTTP_STATUS:/d')
echo "HTTP status: $HTTP"
echo "Response body:"
echo "$BODY" | head -50
