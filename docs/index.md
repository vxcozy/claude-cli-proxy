# claude-cli-proxy docs

A local Anthropic-compatible API proxy that delegates to the `claude` CLI.

## Tutorials

Step-by-step lessons to get started.

- [Getting started](tutorials/getting-started.md) — install, authenticate, and run your first request

## How-to guides

Solve specific problems.

- [Configure your IDE](how-to/configure-ide.md) — point Continue.dev, Cursor, Zed, or other IDEs at the proxy
- [Run as a background service](how-to/background-service.md) — keep the proxy running with launchd or systemd
- [Disable built-in tools](how-to/disable-tools.md) — run in pure chat mode

## Reference

Technical details and specifications.

- [API endpoints](reference/api.md) — request/response format for `/v1/messages` and `/health`
- [CLI options](reference/cli.md) — command-line arguments and environment variables
- [Error codes](reference/errors.md) — error types and what they mean

## Explanation

Background and design decisions.

- [Architecture](explanation/architecture.md) — how the subprocess bridge works
- [Why a proxy?](explanation/why-a-proxy.md) — the problem this solves and alternatives considered
- [Security model](explanation/security.md) — what the proxy does and does not access
