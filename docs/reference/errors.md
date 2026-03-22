# Error codes

The proxy detects error conditions from the Claude CLI's stderr output and maps them to API-compatible error responses. Both the Anthropic and OpenAI endpoints return the same HTTP status codes, but use their respective error formats.

## Anthropic error format (`/v1/messages`)

```json
{"type": "error", "error": {"type": "authentication_error", "message": "..."}}
```

## OpenAI error format (`/v1/chat/completions`)

```json
{"error": {"message": "...", "type": "server_error"}}
```

## Authentication errors

**Anthropic type:** `authentication_error` | **HTTP status:** 401

The Claude CLI is not logged in or the session has expired.

**Fix:** Run `claude` in your terminal and use `/login` to re-authenticate.

**Detected patterns:** "not logged in", "please run /login", "authentication required", "unauthorized", "auth token expired", "invalid api key", "invalid auth"

## Rate limit errors

**Anthropic type:** `rate_limit_error` | **HTTP status:** 429

You've hit your Claude Max usage limit.

**Fix:** Wait for the limit to reset, or check your usage at claude.ai/settings.

**Detected patterns:** "rate limit", "too many requests", "usage limit", "quota exceeded", "try again later", "you have exceeded", "limit reached"

## Spawn errors

**Anthropic type:** `api_error` | **HTTP status:** 500

The `claude` binary could not be found or failed to start.

**Fix:** Ensure `claude` is installed and available in your `PATH`. Run `which claude` to verify.

## Exit code errors

**Anthropic type:** `api_error` | **HTTP status:** 500

The Claude CLI subprocess exited with a non-zero code that didn't match auth or rate-limit patterns.

The error message includes the exit code and the first 300 characters of stderr for debugging.

## Request validation errors

**Anthropic type:** `invalid_request_error` | **HTTP status:** 400

The request body is not valid JSON or is missing the required `messages` array. On the OpenAI endpoint, at least one non-system message is also required.
