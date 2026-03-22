# Disable built-in tools

How to run the proxy in pure chat mode, without Claude's file and shell tools.

## Why disable tools?

By default, `claude --print --dangerously-skip-permissions` gives Claude access to its built-in tools (Bash execution, file read/write, etc.). In a headless proxy context, you may prefer to disable these so Claude only generates text responses.

## Set the environment variable

```bash
CLAUDE_NO_TOOLS=1 local-llm-proxy
```

This adds `--tools ""` to the CLI invocation, which disables all built-in Claude Code tools.

## With a background service

### macOS (launchd)

Add to the `EnvironmentVariables` dict in your plist:

```xml
<key>CLAUDE_NO_TOOLS</key>
<string>1</string>
```

### Linux (systemd)

Add to the `[Service]` section:

```ini
Environment=CLAUDE_NO_TOOLS=1
```

Then reload and restart the service.
