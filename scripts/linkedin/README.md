# LinkedIn OAuth helper scripts

## get-token.sh

Exchanges a one-time **authorization code** (from the redirect URL after you click Allow) for an **access token** you use with the OpenClaw LinkedIn plugin.

**Full step-by-step deployment** (create app, add products, build URL, get code, run script, paste token, launch gateway, example prompts): see [LinkedIn Post (docs)](https://docs.openclaw.ai/tools/linkedin).

---

### 1. Get an authorization code

1. In the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps), create an app and add both products: **Share on LinkedIn** and **Sign in with LinkedIn using OpenID Connect**.
2. In the app **Auth** tab, set **Authorized redirect URLs** to `http://localhost:8080/callback`.
3. Build the authorization URL (replace `YOUR_CLIENT_ID` with your app’s Client ID from the Auth tab):

   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback&scope=w_member_social%20openid%20profile&state=openclaw1
   ```

4. Open that URL in your browser → sign in → click **Allow**.
5. The browser will redirect to `http://localhost:8080/callback?code=...&state=openclaw1` (the page may not load). Copy the **code** value from the address bar (everything after `code=` and before `&`).

### 2. Run the script

```bash
export LINKEDIN_CLIENT_ID='your_client_id'
export LINKEDIN_CLIENT_SECRET='your_primary_client_secret'
export LINKEDIN_OAUTH_CODE='code_from_redirect_url'

./scripts/linkedin/get-token.sh
```

- **LINKEDIN_CLIENT_ID** — From your app’s Auth tab.
- **LINKEDIN_CLIENT_SECRET** — From your app’s Auth tab (Primary Client Secret). Keep secret.
- **LINKEDIN_OAUTH_CODE** — The string you copied in step 1 (the value of `code=` in the redirect URL).

Optional: `LINKEDIN_REDIRECT_URI` (default: `http://localhost:8080/callback`).

### 3. Use the access token

The script prints JSON with `access_token`, `token_type`, `expires_in`, `scope`, and optionally `id_token`. **Copy only the `access_token` value** (the long string).

Put it in the auth profile on the machine where the gateway runs:

**File:** `~/.openclaw/agents/main/agent/auth-profiles.json`

```json
{
  "version": 1,
  "profiles": {
    "linkedin:default": {
      "type": "token",
      "provider": "linkedin",
      "token": "PASTE_ACCESS_TOKEN_HERE"
    }
  }
}
```

Then enable the LinkedIn plugin in config and start the gateway. See [LinkedIn Post (docs)](https://docs.openclaw.ai/tools/linkedin) for the full deployment guide and example prompts.

Codes are one-time use; get a new code (step 1) if the script returns an error.
