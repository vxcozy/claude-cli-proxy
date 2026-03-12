# Architecture

claude-cli-proxy is a thin translation layer between the Anthropic Messages API format and the Claude CLI's stdin/stdout interface.

## Request flow

```
IDE sends POST /v1/messages
        │
        ▼
   HTTP server (Node.js built-in http module)
        │
        ├─ parse JSON body
        ├─ extract messages[], system prompt, model
        │
        ▼
   Prompt builder (prompt.ts)
        │
        ├─ single message: pass text directly
        ├─ multi-turn: serialize as <conversation_history> block
        │
        ▼
   Subprocess bridge (claude.ts)
        │
        ├─ spawn: claude --print --dangerously-skip-permissions [--model X] [--system-prompt Y] <prompt>
        ├─ pipe stdout chunks as async generator
        ├─ collect stderr for error detection
        │
        ▼
   Response translator (server.ts)
        │
        ├─ streaming: wrap chunks as SSE content_block_delta events
        ├─ non-streaming: collect all chunks, return JSON
        │
        ▼
   IDE receives Anthropic-format response
```

## Key design decisions

**Zero runtime dependencies.** The proxy uses only Node.js built-ins (`http`, `child_process`). This keeps the install fast, the attack surface small, and avoids dependency churn.

**One subprocess per request.** Each API request spawns a fresh `claude` process. There is no persistent session or connection pooling. This is simple and stateless but means each request has subprocess startup overhead (typically <1s).

**Prompt serialization for multi-turn.** The Claude CLI accepts a single prompt string, not a messages array. For multi-turn conversations, the proxy serializes the full message history into a `<conversation_history>` tagged block, matching the pattern used by ch4p's subprocess engine.

**Async generator for streaming.** The subprocess bridge yields stdout chunks as an async generator. The server layer consumes this generator and wraps each chunk as an SSE event. This keeps memory usage constant regardless of response length.

## File map

| File | Responsibility |
|------|----------------|
| `src/index.ts` | CLI entry point — parse port, start server |
| `src/server.ts` | HTTP server, request routing, SSE formatting |
| `src/claude.ts` | Subprocess lifecycle, error detection, abort handling |
| `src/prompt.ts` | Message array serialization |
| `src/types.ts` | Anthropic request/response type definitions |
