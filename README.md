# warp-claude-proxy

A local Anthropic-compatible API proxy that delegates to the `claude` CLI. Use your Claude Max subscription in Warp and other AI-aware IDEs without a separate API key.

## How it works

```
IDE  →  POST http://127.0.0.1:9099/v1/messages
                     ↓
          parse messages[] + system prompt
                     ↓
     spawn: claude --print --dangerously-skip-permissions
                     ↓
     stream stdout → Anthropic SSE events
                     ↓
                IDE receives response
```

The proxy never touches your OAuth token directly — it just delegates to the official `claude` CLI, which manages its own auth. All requests stay on `127.0.0.1`.

## Requirements

- Node.js 20+
- [`claude` CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude /login`)

## Install

```bash
npm install -g warp-claude-proxy
# or run directly:
npx warp-claude-proxy
```

Or from source:

```bash
git clone https://github.com/you/warp-claude-proxy
cd warp-claude-proxy
npm install
npm run build
npm start
```

## Usage

```bash
# Start on default port 9099
warp-claude-proxy

# Start on a custom port
warp-claude-proxy 3456
```

## Configuring Warp

In Warp's AI settings, set a custom provider with:

- **Base URL**: `http://127.0.0.1:9099`
- **API key**: any non-empty string (the proxy ignores it)
- **Model**: any Claude model name (e.g. `claude-opus-4-6`)

> Check Warp's docs for the exact setting location — it may be under *Settings → AI → Custom provider* or similar.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/messages` | Anthropic Messages API (streaming and non-streaming) |
| `GET`  | `/health`       | Health check — returns `{"ok":true}` |

## Notes on `--dangerously-skip-permissions`

The proxy passes this flag so the CLI never blocks waiting for a TTY permission prompt (there is no TTY — it's a background process). Claude's native tools (Bash, file read/write) remain available and are governed by your normal Claude Max permissions.

If you want to disable Claude's built-in tools entirely (safer, just chat), set the `CLAUDE_NO_TOOLS` env var before starting:

```bash
CLAUDE_NO_TOOLS=1 warp-claude-proxy
```

This adds `--tools ""` to the CLI invocation.
