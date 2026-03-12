# Configure your IDE

How to point an AI-aware IDE at claude-cli-proxy.

## General setup

Any IDE that lets you set a custom Anthropic base URL will work. You need three values:

| Setting | Value |
|---------|-------|
| Base URL | `http://127.0.0.1:9099` |
| API key | any non-empty string (the proxy ignores it) |
| Model | any Claude model name (e.g. `claude-opus-4-6`) |

## Continue.dev (VS Code / JetBrains)

In your `~/.continue/config.json`:

```json
{
  "models": [
    {
      "title": "Claude (local proxy)",
      "provider": "anthropic",
      "model": "claude-opus-4-6",
      "apiBase": "http://127.0.0.1:9099",
      "apiKey": "local"
    }
  ]
}
```

## Cursor

In Cursor's settings, navigate to *Models* and add a custom model:

- Provider: Anthropic
- Base URL: `http://127.0.0.1:9099`
- API Key: `local`

## Zed

In your Zed settings (`~/.config/zed/settings.json`):

```json
{
  "language_models": {
    "anthropic": {
      "api_url": "http://127.0.0.1:9099",
      "api_key": "local"
    }
  }
}
```

## Environment variable

Some tools read `ANTHROPIC_BASE_URL` from the environment:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:9099
export ANTHROPIC_API_KEY=local
```

## Verifying the connection

After configuring, send a test message through your IDE's AI chat. If the proxy is running, you should see a response. Check the proxy's terminal output for any errors if the connection fails.
