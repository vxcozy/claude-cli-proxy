# API endpoints

The proxy speaks two protocols — use whichever your IDE supports.

## POST /v1/messages (Anthropic format)

Anthropic Messages API-compatible endpoint. Accepts the same request format as `api.anthropic.com/v1/messages`.

### Request

```
POST /v1/messages
Content-Type: application/json
x-api-key: <any non-empty string>
```

#### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Message[]` | yes | Array of conversation messages |
| `model` | `string` | no | Model name passed to `claude --model`. Defaults to `claude-opus-4-7` in response metadata |
| `system` | `string` | no | System prompt passed via `--system-prompt` |
| `stream` | `boolean` | no | Enable SSE streaming. Default: `false` |
| `max_tokens` | `number` | no | Accepted but not enforced (CLI manages its own limits) |

#### Message format

```json
{
  "role": "user",
  "content": "Hello"
}
```

`content` can be a string or an array of content blocks:

```json
{
  "role": "user",
  "content": [{"type": "text", "text": "Hello"}]
}
```

### Non-streaming response

```json
{
  "id": "msg_1234567890",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hi there!"}],
  "model": "claude-opus-4-7",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {"input_tokens": 0, "output_tokens": 0}
}
```

Note: `usage` fields are always `0` — the proxy does not have access to token counts from the CLI.

### Streaming response

When `stream: true`, the response is `text/event-stream` (SSE) with these events in order:

1. `message_start` — message metadata
2. `content_block_start` — starts content block at index 0
3. `ping` — keepalive
4. `content_block_delta` (repeated) — text chunks as `{"type": "text_delta", "text": "..."}`
5. `content_block_stop` — ends content block
6. `message_delta` — final metadata with `stop_reason`
7. `message_stop` — stream complete

### Error responses

Errors use the Anthropic error format:

```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "Claude CLI is not authenticated. Run 'claude' in your terminal and use /login to sign in."
  }
}
```

| `error.type` | HTTP status | Meaning |
|--------------|-------------|---------|
| `authentication_error` | 401 | Claude CLI not logged in |
| `rate_limit_error` | 429 | Usage limit reached |
| `api_error` | 500 | Subprocess failed |
| `invalid_request_error` | 400 | Malformed request body |

In streaming mode, errors are sent as an `error` SSE event before the stream ends.

## POST /v1/chat/completions (OpenAI format)

OpenAI Chat Completions API-compatible endpoint. Use this with Zed, or any tool that supports an OpenAI-compatible provider.

### Request

```
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <any non-empty string>
```

#### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Message[]` | yes | Array of conversation messages (must include at least one non-system message) |
| `model` | `string` | no | Model name. Defaults to `claude-opus-4-7` |
| `stream` | `boolean` | no | Enable SSE streaming. Default: `false` |
| `max_tokens` | `number` | no | Accepted but not enforced |
| `temperature` | `number` | no | Accepted but not enforced |

#### Message format

```json
{"role": "system", "content": "You are helpful."}
{"role": "user", "content": "Hello"}
{"role": "assistant", "content": "Hi there!"}
```

`system` messages are extracted and passed as the Claude CLI `--system-prompt`. Multiple system messages are concatenated.

### Non-streaming response

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "claude-opus-4-7",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hi there!"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
}
```

### Streaming response

When `stream: true`, the response is `text/event-stream` (SSE):

1. Initial chunk with `delta: {"role": "assistant"}`
2. Content chunks with `delta: {"content": "..."}`  (repeated)
3. Final chunk with `delta: {}` and `finish_reason: "stop"`
4. `data: [DONE]` terminator

Each chunk follows the shape:

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion.chunk",
  "created": 1234567890,
  "model": "claude-opus-4-7",
  "choices": [{"index": 0, "delta": {"content": "text"}, "finish_reason": null}]
}
```

### Error responses

Errors use the OpenAI error format:

```json
{
  "error": {
    "message": "Claude CLI is not authenticated.",
    "type": "server_error"
  }
}
```

HTTP status codes are the same as the Anthropic endpoint (401, 429, 500, 400).

## GET /v1/models

Lists available models. Useful for IDEs that query the model list on startup.

### Response

```json
{
  "object": "list",
  "data": [
    {"id": "claude-opus-4-7", "object": "model", "created": 0, "owned_by": "anthropic"},
    {"id": "claude-sonnet-4-6", "object": "model", "created": 0, "owned_by": "anthropic"},
    {"id": "claude-haiku-4-5", "object": "model", "created": 0, "owned_by": "anthropic"}
  ]
}
```

## GET /health

Health check endpoint.

### Response

```json
{"ok": true, "proxy": "local-llm-proxy"}
```

## CORS

All endpoints return permissive CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, anthropic-version
```

`OPTIONS` requests return `204 No Content`.
