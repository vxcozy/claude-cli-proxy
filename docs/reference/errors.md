# Error codes

The proxy detects error conditions from the Claude CLI's stderr output and maps them to Anthropic-compatible error responses.

## Authentication errors

**Type:** `authentication_error`

The Claude CLI is not logged in or the session has expired.

**Fix:** Run `claude` in your terminal and use `/login` to re-authenticate.

**Detected patterns:** "not logged in", "please run /login", "authentication required", "unauthorized", "auth token expired", "invalid api key", "invalid auth"

## Rate limit errors

**Type:** `rate_limit_error`

You've hit your Claude Max usage limit.

**Fix:** Wait for the limit to reset, or check your usage at claude.ai/settings.

**Detected patterns:** "rate limit", "too many requests", "usage limit", "quota exceeded", "try again later", "you have exceeded", "limit reached"

## Spawn errors

**Type:** `api_error`

The `claude` binary could not be found or failed to start.

**Fix:** Ensure `claude` is installed and available in your `PATH`. Run `which claude` to verify.

## Exit code errors

**Type:** `api_error`

The Claude CLI subprocess exited with a non-zero code that didn't match auth or rate-limit patterns.

The error message includes the exit code and the first 300 characters of stderr for debugging.

## Request validation errors

**Type:** `invalid_request_error`

The request body is not valid JSON or is missing the required `messages` array.
