# Redaction system

Scans the codebase for content that **looks like** tokens, API keys, or secrets (e.g. long alphanumeric strings, env assignments like `CLIENT_SECRET='...'`, JSON `"token": "..."`). Use it to catch accidental commits of credentials.

**Run:**

- `openclaw redaction scan` — scan the full repo (src, scripts, extensions, docs; excludes node_modules, dist, .git, etc.).
- `openclaw redaction scan --changed` — scan only changed files (git diff + staged).
- `openclaw redaction scan --json` — output findings as JSON.

**Output:** For each finding you get **file path**, **line number**, **category** (e.g. `env_assignment`, `json_token_field`, `bearer_token`), and a **masked snippet** (e.g. `AQTxYz...BZAw`) so you can locate the spot without printing the full secret.

Categories include: `env_assignment`, `json_token_field`, `bearer_token`, `long_base64_like`, `client_secret_like`, `known_token_prefix`, `oauth_code_like`.
