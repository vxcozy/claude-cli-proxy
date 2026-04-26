# Getting started

This tutorial walks you through installing local-llm-proxy, verifying it works, and sending your first request.

## Prerequisites

You need two things installed:

1. **Node.js 20+** — check with `node --version`
2. **Claude CLI** — check with `claude --version`

If the Claude CLI isn't authenticated yet, run `claude` in your terminal and use `/login` to sign in with your Claude Max account.

## Install the proxy

```bash
npm install -g local-llm-proxy
```

Or if you prefer not to install globally:

```bash
npx local-llm-proxy
```

## Start the proxy

```bash
local-llm-proxy
```

You should see:

```
local-llm-proxy  →  http://127.0.0.1:9099

Endpoints:
  Anthropic  POST /v1/messages          (Continue.dev, Cursor)
  OpenAI     POST /v1/chat/completions  (Zed, generic OpenAI clients)
  Models     GET  /v1/models
  Health     GET  /health
```

## Verify it's running

In a separate terminal:

```bash
curl http://127.0.0.1:9099/health
```

Expected output:

```json
{"ok":true,"proxy":"local-llm-proxy"}
```

## Send your first request (Anthropic format)

```bash
curl -X POST http://127.0.0.1:9099/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: any-string" \
  -d '{
    "model": "claude-opus-4-7",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

You should get back a JSON response with Claude's reply in `content[0].text`.

## Send your first request (OpenAI format)

```bash
curl -X POST http://127.0.0.1:9099/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer any-string" \
  -d '{
    "model": "claude-opus-4-7",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

You should get back a JSON response with Claude's reply in `choices[0].message.content`.

## Next steps

- [Configure your IDE](../how-to/configure-ide.md) to use the proxy
- [Run as a background service](../how-to/background-service.md) so it starts automatically
