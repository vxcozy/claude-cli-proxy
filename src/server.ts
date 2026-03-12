import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { runClaude, ClaudeError } from './claude.js';
import { buildPrompt } from './prompt.js';
import type { AnthropicRequest, AnthropicErrorResponse } from './types.js';

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function sendSSE(res: ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// /v1/messages handler
// ---------------------------------------------------------------------------

async function handleMessages(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: string;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Failed to read request body' } } satisfies AnthropicErrorResponse));
    return;
  }

  let parsed: AnthropicRequest;
  try {
    parsed = JSON.parse(body) as AnthropicRequest;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Invalid JSON' } } satisfies AnthropicErrorResponse));
    return;
  }

  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: '"messages" must be a non-empty array' } } satisfies AnthropicErrorResponse));
    return;
  }

  const prompt = buildPrompt(parsed.messages);
  const streaming = parsed.stream ?? false;
  const msgId = `msg_${Date.now()}`;
  const model = parsed.model ?? 'claude-opus-4-6';

  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  if (streaming) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    sendSSE(res, 'message_start', {
      type: 'message_start',
      message: {
        id: msgId,
        type: 'message',
        role: 'assistant',
        content: [],
        model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    });
    sendSSE(res, 'content_block_start', {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    });
    sendSSE(res, 'ping', { type: 'ping' });

    try {
      for await (const chunk of runClaude(prompt, {
        systemPrompt: parsed.system,
        model: parsed.model,
        signal: abortController.signal,
      })) {
        sendSSE(res, 'content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: chunk },
        });
      }
    } catch (err) {
      const msg = err instanceof ClaudeError ? err.message : 'Internal server error';
      const kind = err instanceof ClaudeError ? err.kind : 'exit';
      const type = kind === 'auth' ? 'authentication_error'
        : kind === 'rate_limit' ? 'rate_limit_error'
        : 'api_error';
      sendSSE(res, 'error', { type: 'error', error: { type, message: msg } });
      res.end();
      return;
    }

    sendSSE(res, 'content_block_stop', { type: 'content_block_stop', index: 0 });
    sendSSE(res, 'message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 0 },
    });
    sendSSE(res, 'message_stop', { type: 'message_stop' });
    res.end();
    return;
  }

  // Non-streaming: collect full response then return.
  let fullText = '';
  try {
    for await (const chunk of runClaude(prompt, {
      systemPrompt: parsed.system,
      model: parsed.model,
      signal: abortController.signal,
    })) {
      fullText += chunk;
    }
  } catch (err) {
    const msg = err instanceof ClaudeError ? err.message : 'Internal server error';
    const kind = err instanceof ClaudeError ? err.kind : 'exit';
    const type = kind === 'auth' ? 'authentication_error'
      : kind === 'rate_limit' ? 'rate_limit_error'
      : 'api_error';
    res.writeHead(kind === 'auth' ? 401 : kind === 'rate_limit' ? 429 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type, message: msg } } satisfies AnthropicErrorResponse));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    id: msgId,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: fullText.trim() }],
    model,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  }));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function startServer(port: number): void {
  const server = createServer(async (req, res) => {
    // CORS for local IDE tooling
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/v1/messages') {
      await handleMessages(req, res);
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, proxy: 'claude-cli-proxy' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`claude-cli-proxy  →  http://127.0.0.1:${port}`);
    console.log(`Set ANTHROPIC_BASE_URL=http://127.0.0.1:${port} in your IDE`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try a different port: claude-cli-proxy <port>`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });
}
