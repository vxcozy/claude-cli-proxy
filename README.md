# local-llm-proxy

A local API proxy that delegates to the `claude` CLI. Use your Claude Max subscription in any AI-aware IDE — no separate API key required.

Speaks both **Anthropic** (`/v1/messages`) and **OpenAI** (`/v1/chat/completions`) formats, so it works with virtually any IDE or tool that supports custom AI providers.

## How it works

```
IDE  →  POST http://127.0.0.1:9099/v1/chat/completions  (OpenAI format)
   or   POST http://127.0.0.1:9099/v1/messages           (Anthropic format)
                     ↓
          parse messages[] + system prompt
                     ↓
     spawn: claude --print --dangerously-skip-permissions
                     ↓
     stream stdout → SSE events (matching request format)
                     ↓
                IDE receives response
```

The proxy never touches your OAuth token directly — it delegates to the official `claude` CLI, which manages its own auth. All requests stay on `127.0.0.1`.

## Requirements

- Node.js 20+
- [`claude` CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude /login`)

## Install

```bash
npm install -g local-llm-proxy
# or run directly:
npx local-llm-proxy
```

Or from source:

```bash
git clone https://github.com/vxcozy/local-llm-proxy
cd local-llm-proxy
npm install
npm run build
npm start
```

## Usage

```bash
# Start on default port 9099
local-llm-proxy

# Start on a custom port
local-llm-proxy 3456
```

## IDE configuration

### Zed

Settings > AI > General > Configure Providers > OpenAI Compatible API:

- **API URL**: `http://127.0.0.1:9099/v1`
- **API Key**: any non-empty string (e.g. `x`)
- **Model**: `claude-opus-4-6` (or any model name)

### Continue.dev (VS Code / JetBrains)

In `~/.continue/config.json`:

```json
{
  "models": [{
    "provider": "anthropic",
    "model": "claude-opus-4-6",
    "apiBase": "http://127.0.0.1:9099",
    "apiKey": "x"
  }]
}
```

### Cursor

Settings > Models > Anthropic > Override Base URL: `http://127.0.0.1:9099`

### Generic (any tool with ANTHROPIC_BASE_URL)

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:9099
```

### Generic (any tool with OpenAI-compatible endpoint)

Point the base URL to `http://127.0.0.1:9099/v1` and use any non-empty API key.

## Endpoints

| Method | Path | Format | Description |
|--------|------|--------|-------------|
| `POST` | `/v1/messages` | Anthropic | Messages API (streaming + non-streaming) |
| `POST` | `/v1/chat/completions` | OpenAI | Chat Completions API (streaming + non-streaming) |
| `GET`  | `/v1/models` | OpenAI | Lists available models |
| `GET`  | `/health` | — | Health check — returns `{"ok":true}` |

## Notes on `--dangerously-skip-permissions`

The proxy passes this flag so the CLI never blocks waiting for a TTY permission prompt (there is no TTY — it's a background process). Claude's native tools (Bash, file read/write) remain available and are governed by your normal Claude Max permissions.

To disable Claude's built-in tools entirely (pure chat mode):

```bash
CLAUDE_NO_TOOLS=1 local-llm-proxy
```
