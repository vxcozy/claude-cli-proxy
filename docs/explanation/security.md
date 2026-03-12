# Security model

## What the proxy accesses

- **stdout/stderr** of the `claude` subprocess — text output only
- **Localhost network** — binds to `127.0.0.1`, never exposed externally

## What the proxy does NOT access

- **OAuth tokens** — the CLI manages its own authentication; the proxy never reads, stores, or transmits tokens
- **Filesystem** — the proxy itself reads no files (Claude's built-in tools may, when enabled)
- **Remote APIs** — no outbound requests; the `claude` subprocess handles all communication with Anthropic's servers

## API key handling

The proxy accepts an `x-api-key` header (or `Authorization: Bearer`) because IDE clients require one. The value is completely ignored — the proxy discards it. No API key is stored or logged.

## Network binding

The server binds exclusively to `127.0.0.1`. It is not reachable from other machines on the network. If you need remote access (not recommended), you would need to add a reverse proxy in front.

## `--dangerously-skip-permissions`

This flag is required because the proxy runs headlessly with no TTY. Without it, the CLI would block on permission prompts that nobody can answer.

When this flag is set, Claude's built-in tools (Bash, file read/write) execute without asking for confirmation. To mitigate this:

- Run the proxy in a sandboxed environment or under a restricted user account
- Use `CLAUDE_NO_TOOLS=1` to disable all built-in tools if you only need chat

## Subprocess isolation

Each request spawns an independent `claude` process. There is no shared state between requests. The `CLAUDECODE` and `CLAUDE_CODE_SESSION` environment variables are stripped to prevent nested-session conflicts.

Subprocesses are killed on client disconnect (abort signal) and on timeout. File descriptors (stdin/stdout/stderr) are explicitly destroyed after each request to prevent FD exhaustion under load.
