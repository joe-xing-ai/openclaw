---
title: "LinkedIn Post"
summary: "Draft and publish LinkedIn posts via agent tools (optional plugin)"
description: "Use the optional LinkedIn plugin to let agents draft or publish posts to your LinkedIn account. Requires a LinkedIn access token (auth profile or env)."
read_when:
  - You want agents to post or draft LinkedIn content
  - You need linkedin_post and linkedin_status tools
---

# LinkedIn Post

The `linkedin` plugin adds two agent tools:

- **linkedin_post** — Create a post (draft or publish). Parameters: `text`, optional `draft` (boolean), optional `visibility` (`PUBLIC` | `CONNECTIONS` | `PRIVATE`).
- **linkedin_status** — Check LinkedIn auth and current user info.

## Enable the plugin

In your OpenClaw config (e.g. `~/.openclaw/config.json` or `openclaw.json`):

```json
{
  "plugins": {
    "entries": {
      "linkedin": {
        "enabled": true
      }
    }
  }
}
```

---

## Full deployment guide (step-by-step)

Follow these steps once to create a LinkedIn app, get an access token, and connect OpenClaw to your LinkedIn account.

### Step 1: Create a LinkedIn app

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. Sign in with the LinkedIn account you want to post from.
3. Click **Create app**.
4. Fill in:
   - **App name** — e.g. "OpenClaw" or any name you like.
   - **LinkedIn Page** — Select your personal profile (or create a placeholder; posting is under your member account, not a company page).
   - **Privacy policy URL** and **App logo** — Use placeholders if needed (e.g. your site or `https://openclaw.ai`).
5. Create the app and accept the terms.

### Step 2: Add the two required products

Your app must have **two products** so OpenClaw can identify you and post on your behalf.

1. In your app, open the **Products** tab.
2. Click **Add product** and add:
   - **Share on LinkedIn** — Grants the `w_member_social` scope (create posts).
   - **Sign in with LinkedIn using OpenID Connect** — Grants `openid` and `profile` (identify the member; required for status and for the Posts API).
3. Save. Both products should appear under your app.

### Step 3: Set the redirect URL

1. In your app, open the **Auth** tab.
2. Under **OAuth 2.0 settings**, find **Authorized redirect URLs**.
3. Add: `http://localhost:8080/callback`
4. Save. You will use this exact URL when building the authorization link.

### Step 4: Compose the authorization URL

You need a URL that sends the user to LinkedIn to approve your app. Build it as follows.

**Formula:**

- Base: `https://www.linkedin.com/oauth/v2/authorization`
- Query parameters (URL-encoded):
  - `response_type=code`
  - `client_id=YOUR_CLIENT_ID` (from the Auth tab)
  - `redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback` (encoded `http://localhost:8080/callback`)
  - `scope=w_member_social%20openid%20profile` (spaces encoded as `%20`)
  - `state=openclaw1` (optional; helps prevent CSRF)

**Example** (replace `YOUR_CLIENT_ID` with your app’s Client ID from the Auth tab):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback&scope=w_member_social%20openid%20profile&state=openclaw1
```

If your redirect URL is different, encode it the same way (e.g. `http%3A%2F%2Flocalhost%2F...`).

### Step 5: Log in and approve the app

1. Paste the full authorization URL (with your real `client_id`) into your browser and open it.
2. Sign in to LinkedIn if prompted.
3. Review the permissions and click **Allow**.
4. The browser will redirect to a URL that looks like:
   ```
   http://localhost:8080/callback?code=AQT...long_string...&state=openclaw1
   ```
   The page may not load (connection refused is normal); you only need the URL from the address bar.

### Step 6: Extract the code from the URL

From the redirect URL in the address bar:

- Copy **everything between `code=` and `&`** (or to the end of the URL if there is no `&`).
- That is your one-time **authorization code**. Do not share it; use it immediately in the next step.

Example: if the URL is  
`http://localhost:8080/callback?code=AQTxYz123...&state=openclaw1`  
then the code is `AQTxYz123...` (the whole string after `code=` and before `&state=`).

### Step 7: Exchange the code for an access token (get-token.sh)

Use the OpenClaw script to exchange the code for an **access token**.

1. Open a terminal and go to the OpenClaw repo (or where `scripts/linkedin/get-token.sh` lives).
2. Set three variables (replace with your values from the LinkedIn app **Auth** tab and the code from Step 6):

   ```bash
   export LINKEDIN_CLIENT_ID='your_client_id'
   export LINKEDIN_CLIENT_SECRET='your_primary_client_secret'
   export LINKEDIN_OAUTH_CODE='paste_the_code_from_step_6_here'
   ```

   - **LINKEDIN_CLIENT_ID** — Auth tab → Client ID.
   - **LINKEDIN_CLIENT_SECRET** — Auth tab → Primary Client Secret (keep secret).
   - **LINKEDIN_OAUTH_CODE** — The string you copied in Step 6.

3. Run the script:

   ```bash
   ./scripts/linkedin/get-token.sh
   ```

4. The script prints JSON. You will see `access_token`, `token_type`, `expires_in`, `scope`, and possibly `id_token`. **Use only the `access_token` value** for OpenClaw (the long string; copy it without quotes).

If the script returns an error (e.g. "authorization code not found" or "expired"), get a **new** code (repeat Step 5 and 6) and run the script again; each code is one-time use.

### Step 8: Put the token in the auth profile JSON file

OpenClaw reads the LinkedIn token from the **auth profile store** on the machine where the **gateway** runs.

1. On that machine, open (or create) the file:
   ```
   ~/.openclaw/agents/main/agent/auth-profiles.json
   ```
2. Ensure the file is valid JSON and contains a `profiles` object with a LinkedIn profile. Example:

   ```json
   {
     "version": 1,
     "profiles": {
       "linkedin:default": {
         "type": "token",
         "provider": "linkedin",
         "token": "PASTE_ONLY_THE_ACCESS_TOKEN_STRING_HERE"
       }
     }
   }
   ```

3. **Paste only the `access_token` value** from Step 7 into the `"token"` field (the long string; no extra quotes, spaces, or other fields like `id_token` or `expires_in`).
4. Save the file.

If you use a different agent id than `main`, use that agent’s directory instead:  
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.

**Alternative:** Set the environment variable `LINKEDIN_ACCESS_TOKEN` to the access token on the process that runs the gateway (e.g. in your shell or systemd unit). The auth profile is recommended so the token is stored per agent.

### Step 9: Enable the plugin and launch the gateway

1. In your OpenClaw config (e.g. `~/.openclaw/config.json`), ensure the LinkedIn plugin is enabled (see **Enable the plugin** above).
2. Start the gateway on the same machine where you placed the auth profile:

   ```bash
   pnpm openclaw gateway run --bind loopback --port 18789
   ```

   (Or your usual gateway command; adjust bind/port as needed.)

3. In the OpenClaw control UI or chat, ask the agent to **check LinkedIn status** (e.g. “Use the linkedin_status tool to check LinkedIn”). You should see your name and that you are authenticated.

---

## Example prompts for posting

After deployment, you can ask the agent to post or draft in natural language. The agent will use the **linkedin_post** tool. Examples:

**Publish a short post:**

```
Use the linkedin_post tool to publish a post (draft: false) with this text: "Testing OpenClaw LinkedIn integration — this post was created via the API."
```

**Save a post as draft (review before publishing on LinkedIn):**

```
Use the linkedin_post tool to create a draft post (draft: true) with this text: "AI is what gives robots the ability to sense, decide, and adapt. Without it, they're just fixed programs."
```

**Publish with specific visibility:**

```
Post this on LinkedIn as PUBLIC: "Excited to share our latest update. More soon!"
```

**Check that you’re connected:**

```
Use the linkedin_status tool to check LinkedIn authentication.
```

**Tips:**

- **Draft first:** Use `draft: true` to save a post without publishing; you can then open LinkedIn, find the draft, edit if needed, and publish from the LinkedIn UI.
- **Publish directly:** Use `draft: false` (or omit `draft`) to publish immediately to your feed.
- LinkedIn does not provide an API to delete posts; delete posts manually from your LinkedIn profile (three dots on the post → Delete).

---

## Quick reference

| What                              | Where                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create app                        | [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) → Create app                                                                                                                           |
| Required products                 | Share on LinkedIn + Sign in with LinkedIn using OpenID Connect                                                                                                                                               |
| Redirect URL                      | `http://localhost:8080/callback` (in app Auth tab)                                                                                                                                                           |
| Auth URL (replace YOUR_CLIENT_ID) | `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback&scope=w_member_social%20openid%20profile&state=openclaw1` |
| Code                              | From redirect URL: the value of `code=` (until `&` or end of URL)                                                                                                                                            |
| Script                            | `./scripts/linkedin/get-token.sh` (set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_OAUTH_CODE`)                                                                                                |
| Token to copy                     | Only the **access_token** value from the script’s JSON output                                                                                                                                                |
| Auth profile file                 | `~/.openclaw/agents/main/agent/auth-profiles.json` (on the machine where the gateway runs)                                                                                                                   |
| Profile JSON                      | `"linkedin:default": { "type": "token", "provider": "linkedin", "token": "<access_token>" }`                                                                                                                 |

## Security

- Keep the access token and client secret secret; do not commit them to version control.
- Prefer auth profiles (or secret refs) over environment variables when multiple agents or processes share the machine.
- LinkedIn’s API terms and partner programs may restrict certain use cases; ensure your usage complies with their policies.
