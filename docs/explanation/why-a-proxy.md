# Why a proxy?

## The problem

Claude Max is a consumer subscription that includes Claude Code (the CLI). Many AI-aware IDEs can connect to custom Anthropic API endpoints, but they expect the standard Anthropic Messages API format — they can't spawn a local CLI subprocess directly.

Meanwhile, the Anthropic API is a separate product with its own billing. If you already pay for Claude Max, you'd need to pay again for API access just to use Claude in your IDE.

## The solution

local-llm-proxy bridges the gap. It speaks the Anthropic Messages API on one side and delegates to the official `claude` CLI on the other. The IDE thinks it's talking to an API, but the actual inference runs through your Max subscription.

## Alternatives considered

**Extract the OAuth token and call the API directly.** This violates the Consumer Terms of Service (Section 3.7 prohibits automated access except through the official CLI or API keys). Tools that did this had accounts suspended in January 2026.

**Use a headless browser to interact with claude.ai.** Fragile, slow, and likely violates ToS as well. Not a real option.

**Just buy API access.** Valid, but if you already have Max with generous limits, paying separately for API credits to use the same model in your IDE is redundant.

**Wait for native IDE integrations.** Some IDEs don't yet support custom base URLs (e.g. Warp's BYOK feature hardcodes requests to `api.anthropic.com`). The proxy is ready for when they add that support.

## Why this approach is ToS-compliant

The proxy spawns the official `claude` binary as a subprocess. It never extracts, stores, or forwards OAuth tokens. From Anthropic's servers' perspective, the traffic is identical to a user running `claude --print` in a terminal — which is an explicitly supported use case, including automated/headless invocation.
