# Configure your IDE

How to point an AI-aware IDE at local-llm-proxy.

The proxy speaks two protocols:
- **OpenAI format** (`/v1/chat/completions`) — for Zed and tools with "OpenAI-compatible" settings
- **Anthropic format** (`/v1/messages`) — for Continue.dev, Cursor, and tools with custom Anthropic endpoints

## Zed

Zed uses the OpenAI-compatible endpoint. In Settings > AI > General > Configure Providers > OpenAI Compatible API:

| Setting | Value |
|---------|-------|
| API URL | `http://127.0.0.1:9099/v1` |
| API Key | any non-empty string (e.g. `x`) |
| Model | `claude-opus-4-7` |

Or in `~/.config/zed/settings.json`:

```json
{
  "language_models": {
    "openai": {
      "api_url": "http://127.0.0.1:9099/v1",
      "available_models": [
        {"name": "claude-opus-4-7", "display_name": "Claude Opus", "max_tokens": 16384}
      ]
    }
  }
}
```

Note: this is for Zed's **Agent/Chat** panel, not Edit Predictions (which needs sub-100ms latency and isn't suited for a CLI subprocess proxy).

## Continue.dev (VS Code / JetBrains)

Uses the Anthropic endpoint. In your `~/.continue/config.json`:

```json
{
  "models": [
    {
      "title": "Claude (local proxy)",
      "provider": "anthropic",
      "model": "claude-opus-4-7",
      "apiBase": "http://127.0.0.1:9099",
      "apiKey": "local"
    }
  ]
}
```

## Cursor

Uses the Anthropic endpoint. In Cursor's settings, navigate to *Models* and add a custom model:

- Provider: Anthropic
- Base URL: `http://127.0.0.1:9099`
- API Key: `local`

## Generic (OpenAI-compatible)

Any tool that supports a custom OpenAI endpoint:

| Setting | Value |
|---------|-------|
| Base URL | `http://127.0.0.1:9099/v1` |
| API Key | any non-empty string |
| Model | `claude-opus-4-7` |

## Generic (Anthropic-compatible)

Some tools read `ANTHROPIC_BASE_URL` from the environment:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:9099
export ANTHROPIC_API_KEY=local
```

## Verifying the connection

After configuring, send a test message through your IDE's AI chat. If the proxy is running, you should see a response. Check the proxy's terminal output for any errors if the connection fails.
