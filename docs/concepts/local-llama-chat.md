# Local Llama for chat and LinkedIn agents

Use **Ollama** (local Llama) as the default model for **chat, conversation, and light tasks** (e.g. drafting LinkedIn posts). That way you avoid ChatGPT API rate limits for non‑coding use; reserve the API for coding or when you need a stronger model.

## Create your `.env` file (required)

OpenClaw does **not** ship with a `.env` file. You must create one by copying the example, then set the variables you need.

**Where to create it:**

- **From the OpenClaw repo (local dev):** copy to `.env` in the repo root.
- **For the installed daemon (launchd/systemd):** copy to `~/.openclaw/.env`.

**How to create it:**

```bash
# If you're in the openclaw repo:
cp .env.example .env

# Or for the daemon config directory:
mkdir -p ~/.openclaw
cp .env.example ~/.openclaw/.env
```

**What to set when using local Llama only:**

After copying `.env.example` to `.env`, edit `.env` and set at least:

| Variable | Required for local Llama? | What to set |
|----------|---------------------------|-------------|
| `OLLAMA_API_KEY` | **Yes** | Any non-empty value (e.g. `ollama-local`). OpenClaw uses it only to register the Ollama provider; it is not sent to the local server. |
| `OPENCLAW_GATEWAY_TOKEN` | Only if you run the gateway (e.g. for channels) | A long random token, e.g. `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | Only if you use an OpenAI fallback model in config | Your OpenAI API key. |

For **chat and LinkedIn agents with only local Llama**, uncomment and set in your `.env`:

```env
OLLAMA_API_KEY=ollama-local
```

Leave other provider keys commented out unless you use them. You can add or uncomment more variables later (e.g. gateway token, OpenAI key for fallback).

## 1. Install and run Ollama

- Install [Ollama](https://ollama.com) and pull a chat model, e.g.:

  ```bash
  ollama pull llama3.3
  ```

- Keep the Ollama server running (it usually runs in the background after install).

## 2. Register Ollama in OpenClaw

OpenClaw requires a non-empty `OLLAMA_API_KEY` in your `.env` so the `ollama` provider is registered (the key is not sent to Ollama; the local server has no auth).

In the `.env` file you created (repo root or `~/.openclaw/.env`), ensure you have:

```env
OLLAMA_API_KEY=ollama-local
```

Any non-empty value works (e.g. `ollama` or `local`).

## 3. Set Ollama as default for agents

In your OpenClaw config (`~/.openclaw/openclaw.json` or path in `OPENCLAW_CONFIG_PATH`), set the **primary model** to your local model:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/llama3.3"
      }
    }
  }
}
```

Use the same name you used with `ollama pull` (e.g. `llama3.3`, `llama3.2`, `mistral`, etc.).

You can also set it via CLI (creates or updates config under `~/.openclaw/openclaw.json`):

```bash
openclaw config set agents.defaults.model.primary "ollama/llama3.3"
```

Replace `llama3.3` with the model you pulled (e.g. `llama3.2`, `llama`).

After this, **all agent runs** (CLI, channels, skills) use local Llama by default. You can still override the model per run or use fallbacks to OpenAI when needed.

## 4. Deploy the gateway and send an agent task (local Mac)

Once Ollama is running and you have pulled a model (e.g. `ollama pull llama3.3`), do the following so the **gateway** runs and you can **send the agent a task** using local Llama (no OpenAI cost).

### 4a. One-time setup

1. **Create `.env`** (if you haven’t already):
   - From the OpenClaw **repo root**: `cp .env.example .env` then edit `.env` and set:
     ```env
     OLLAMA_API_KEY=ollama-local
     ```
   - Optional (for gateway auth): `OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)` and add that line to `.env`.

2. **Ensure OpenClaw config and state exist.** Either run the wizard once, or create the config directory:
   ```bash
   mkdir -p ~/.openclaw
   ```
   If you use the **repo** for dev, OpenClaw will still use `~/.openclaw` for config by default unless you set `OPENCLAW_CONFIG_PATH` and `OPENCLAW_STATE_DIR` in `.env`.

3. **Set the default model to local Llama** (same name as in `ollama pull`):
   ```bash
   openclaw config set agents.defaults.model.primary "ollama/llama3.3"
   ```
   (Use `pnpm openclaw config set ...` if you run from repo source.)

4. **Optional:** Set gateway to local mode (recommended for single-machine use):
   ```bash
   openclaw config set gateway.mode local
   ```

### 4b. Install and run from repo (development on your Mac)

From the OpenClaw repo root (Node ≥22, pnpm preferred):

```bash
cd /path/to/openclaw
pnpm install
pnpm ui:build   # first time only
pnpm build
```

Then **run the gateway** (foreground, so you see logs):

```bash
pnpm openclaw gateway run --bind loopback --port 18789 --verbose
```

Or use the dev watcher (auto-reload on changes):

```bash
pnpm gateway:watch
```

In **another terminal** (same machine), send the agent a task (it will use local Llama):

```bash
cd /path/to/openclaw
pnpm openclaw agent --message "Draft a short LinkedIn post about sustainable software practices"
```

You can use any prompt; the agent uses the default model (`ollama/llama3.3`), so no OpenAI API is called.

### 4c. Run gateway in the background (optional)

To run the gateway in the background and free the terminal:

```bash
# macOS/Linux (from repo):
nohup pnpm openclaw gateway run --bind loopback --port 18789 --force > /tmp/openclaw-gateway.log 2>&1 &

# Or if openclaw is installed globally:
nohup openclaw gateway run --bind loopback --port 18789 --force > /tmp/openclaw-gateway.log 2>&1 &
```

Then send a task from any terminal:

```bash
openclaw agent --message "Your task here"
# or: pnpm openclaw agent --message "Your task here"
```

### 4d. Global install (alternative)

If you prefer not to run from source:

```bash
npm install -g openclaw@latest
# or: pnpm add -g openclaw@latest

# One-time onboarding (creates ~/.openclaw, config, etc.):
openclaw onboard

# Set local Llama as default:
openclaw config set agents.defaults.model.primary "ollama/llama3.3"

# Run gateway (foreground):
openclaw gateway run --bind loopback --port 18789 --verbose

# In another terminal, send a task:
openclaw agent --message "Draft a short LinkedIn post about ..."
```

For the daemon (launchd on macOS), put `.env` in `~/.openclaw/.env` and use `openclaw onboard --install-daemon` so the gateway runs as a service.

## 5. Troubleshooting: gateway token mismatch and Ollama not registered

If you see **"gateway token mismatch (set gateway.remote.token to match gateway.auth.token)"** or **"Ollama requires authentication... Set OLLAMA_API_KEY"**:

**Option A – Disable gateway auth for local loopback (simplest)**

Only do this if the gateway is bound to loopback (`--bind loopback`) and you are not exposing it to the network:

```bash
pnpm openclaw config set gateway.auth.mode none
```

Then **restart the gateway** so it picks up the change. The CLI will connect without a token.

**Option B – Use a shared token**

1. Generate a token and put it where both gateway and CLI see it:
   ```bash
   echo 'OPENCLAW_GATEWAY_TOKEN='$(openssl rand -hex 32) >> ~/.openclaw/.env
   echo 'OLLAMA_API_KEY=ollama-local' >> ~/.openclaw/.env
   ```
2. Read the token (first line of `~/.openclaw/.env` after the `=`), then set the config so the CLI sends the same token:
   ```bash
   # Replace YOUR_TOKEN with the value you copied from ~/.openclaw/.env
   pnpm openclaw config set gateway.remote.token "YOUR_TOKEN"
   ```
3. Restart the gateway (so it reads `OPENCLAW_GATEWAY_TOKEN` from `~/.openclaw/.env`).

**Ollama not registered**

The gateway (and embedded CLI) only register the Ollama provider when they see a non-empty API key—from env **or** from config. If you already set `OLLAMA_API_KEY=ollama-local` in `.env` and the gateway still says "Set OLLAMA_API_KEY", the **gateway process** often does not see that env (e.g. when started via pnpm or another launcher that doesn’t pass env through).

**Option C – Set the key in config (most reliable)**

Put the key in OpenClaw config so the gateway does not depend on process env:

```bash
pnpm openclaw config set models.providers.ollama.apiKey '"ollama-local"'
```

Then **restart the gateway**. No `.env` or `export` is required for the gateway to register Ollama.

**Option D – Env in `.env` or shell**

Ensure `OLLAMA_API_KEY` is set for the process that runs the model (the gateway when you use it, or the CLI when it falls back to embedded). Add to **`~/.openclaw/.env`**:

```env
OLLAMA_API_KEY=ollama-local
```

Then restart the gateway. If the gateway was started with `export OLLAMA_API_KEY=ollama-local && pnpm openclaw gateway run` and it still fails, try the **inline** form in the same shell so the variable is definitely in the process env:

```bash
OLLAMA_API_KEY=ollama-local pnpm openclaw gateway run --bind loopback --port 18789 --verbose
```

If you run the agent from the **repo** and use the repo `.env`, add the same line there so the CLI sees it when it falls back to embedded.

## 6. Using agents for LinkedIn posts

- **CLI:** Run the agent with a chat-style prompt, e.g.  
  `openclaw agent --message "Draft a short LinkedIn post about ..."`
- **Prose / content pipeline:** The repo includes an example that produces a LinkedIn post from a “social-strategist” session:  
  `extensions/open-prose/skills/prose/examples/34-content-pipeline.prose`  
  That pipeline uses the default model, so with the config above it will use local Llama.

No heavy coding backbone is required; a normal chat model (e.g. Llama 3.3) is enough for understanding conversation and drafting posts.

## Optional: use OpenAI only for coding

To keep using ChatGPT for coding or complex tasks:

- Set **fallbacks** in config so if Ollama fails or you explicitly request another model, OpenClaw can use OpenAI, or  
- Use a different model (e.g. via `--model` or a skill-specific model) when you want the API.

Example with fallback:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/llama3.3",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

Ensure `OPENAI_API_KEY` is set so the fallback can be used when needed.
