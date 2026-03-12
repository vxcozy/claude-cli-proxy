# CLI options

## Usage

```
claude-cli-proxy [port]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `port` | `9099` | Port to listen on. Must be 1-65535 |

The server always binds to `127.0.0.1` (localhost only).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_NO_TOOLS` | unset | Set to `1` to disable Claude's built-in tools (adds `--tools ""` to CLI invocation) |

## Claude CLI flags used

The proxy spawns `claude` with these flags:

| Flag | Purpose |
|------|---------|
| `--print` | Output response as plain text to stdout (no interactive TUI) |
| `--dangerously-skip-permissions` | Skip TTY permission prompts (required for headless use) |
| `--model <model>` | Passed through from the request's `model` field (if provided) |
| `--system-prompt <prompt>` | Passed through from the request's `system` field (if provided) |
| `--tools ""` | Only added when `CLAUDE_NO_TOOLS=1` is set |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Clean shutdown |
| 1 | Port already in use or invalid port argument |
