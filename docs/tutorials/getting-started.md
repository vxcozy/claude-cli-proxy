# Getting started

This tutorial walks you through installing claude-cli-proxy, verifying it works, and sending your first request.

## Prerequisites

You need two things installed:

1. **Node.js 20+** — check with `node --version`
2. **Claude CLI** — check with `claude --version`

If the Claude CLI isn't authenticated yet, run `claude` in your terminal and use `/login` to sign in with your Claude Max account.

## Install the proxy

```bash
npm install -g claude-cli-proxy
```

Or if you prefer not to install globally:

```bash
npx claude-cli-proxy
```

## Start the proxy

```bash
claude-cli-proxy
```

You should see:

```
claude-cli-proxy  →  http://127.0.0.1:9099
Set ANTHROPIC_BASE_URL=http://127.0.0.1:9099 in your IDE
```

## Verify it's running

In a separate terminal:

```bash
curl http://127.0.0.1:9099/health
```

Expected output:

```json
{"ok":true,"proxy":"claude-cli-proxy"}
```

## Send your first request

```bash
curl -X POST http://127.0.0.1:9099/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: any-string" \
  -d '{
    "model": "claude-opus-4-6",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

You should get back a JSON response with Claude's reply in `content[0].text`.

## Next steps

- [Configure your IDE](../how-to/configure-ide.md) to use the proxy
- [Run as a background service](../how-to/background-service.md) so it starts automatically
