# claude-cli-proxy

A local Anthropic-compatible API proxy that delegates to the `claude` CLI. Use your Claude Max subscription in any AI-aware IDE that supports custom API endpoints — no separate API key required.

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

The proxy never touches your OAuth token directly — it delegates to the official `claude` CLI, which manages its own auth. All requests stay on `127.0.0.1`.

## Requirements

- Node.js 20+
- [`claude` CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude /login`)

## Install

```bash
npm install -g claude-cli-proxy
# or run directly:
npx claude-cli-proxy
```

Or from source:

```bash
git clone https://github.com/vxcozy/claude-cli-proxy
cd claude-cli-proxy
npm install
npm run build
npm start
```

## Usage

```bash
# Start on default port 9099
claude-cli-proxy

# Start on a custom port
claude-cli-proxy 3456
```

## IDE configuration

Point your IDE's custom Anthropic provider at the proxy:

- **Base URL**: `http://127.0.0.1:9099`
- **API key**: any non-empty string (the proxy ignores it)
- **Model**: any Claude model name (e.g. `claude-opus-4-6`)

Works with any tool that supports `ANTHROPIC_BASE_URL` or a custom Anthropic endpoint — Continue.dev, Cursor, Zed, and others.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/messages` | Anthropic Messages API (streaming and non-streaming) |
| `GET`  | `/health`       | Health check — returns `{"ok":true}` |

## Notes on `--dangerously-skip-permissions`

The proxy passes this flag so the CLI never blocks waiting for a TTY permission prompt (there is no TTY — it's a background process). Claude's native tools (Bash, file read/write) remain available and are governed by your normal Claude Max permissions.

To disable Claude's built-in tools entirely (pure chat mode):

```bash
CLAUDE_NO_TOOLS=1 claude-cli-proxy
```
