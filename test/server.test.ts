import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { convertMessages } from '../src/server.js';

// ---------------------------------------------------------------------------
// convertMessages (unit)
// ---------------------------------------------------------------------------

describe('convertMessages', () => {
  it('extracts system messages', () => {
    const { system, anthropicMessages } = convertMessages([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]);
    assert.equal(system, 'You are helpful.');
    assert.equal(anthropicMessages.length, 1);
    assert.equal(anthropicMessages[0]?.role, 'user');
  });

  it('concatenates multiple system messages', () => {
    const { system } = convertMessages([
      { role: 'system', content: 'Rule 1' },
      { role: 'system', content: 'Rule 2' },
      { role: 'user', content: 'Hi' },
    ]);
    assert.equal(system, 'Rule 1\n\nRule 2');
  });

  it('returns undefined system when none present', () => {
    const { system, anthropicMessages } = convertMessages([
      { role: 'user', content: 'Hi' },
    ]);
    assert.equal(system, undefined);
    assert.equal(anthropicMessages.length, 1);
  });

  it('preserves user and assistant messages in order', () => {
    const { anthropicMessages } = convertMessages([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'Bye' },
    ]);
    assert.equal(anthropicMessages.length, 3);
    assert.equal(anthropicMessages[0]?.content, 'Hello');
    assert.equal(anthropicMessages[1]?.role, 'assistant');
    assert.equal(anthropicMessages[2]?.content, 'Bye');
  });
});

// ---------------------------------------------------------------------------
// HTTP integration tests (with mock claude binary)
// ---------------------------------------------------------------------------

const TEST_PORT = 19876;
const BASE = `http://127.0.0.1:${TEST_PORT}`;

/** Make an HTTP request and return { status, headers, body }. */
function request(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

describe('HTTP endpoints', () => {
  let serverProcess: import('node:child_process').ChildProcess;

  before(async () => {
    const { spawn } = await import('node:child_process');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const mockBin = resolve(__dirname, 'bin');
    const serverEntry = resolve(__dirname, '..', 'dist', 'index.js');

    // Prepend mock bin to PATH so our fake `claude` is found first.
    const env = { ...process.env, PATH: `${mockBin}:${process.env['PATH']}` };

    serverProcess = spawn('node', [serverEntry, String(TEST_PORT)], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server to be ready.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
      serverProcess.stdout?.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('127.0.0.1')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  after(() => {
    serverProcess?.kill('SIGTERM');
  });

  // -- Health --

  it('GET /health returns ok', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.equal(json.proxy, 'local-llm-proxy');
  });

  // -- CORS --

  it('OPTIONS returns 204 with CORS headers', async () => {
    const res = await request('/v1/messages', { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });

  // -- 404 --

  it('unknown route returns 404', async () => {
    const res = await request('/unknown');
    assert.equal(res.status, 404);
  });

  // -- /v1/models --

  it('GET /v1/models returns model list', async () => {
    const res = await request('/v1/models');
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.object, 'list');
    assert.ok(json.data.length >= 3);
    assert.equal(json.data[0].object, 'model');
    assert.equal(json.data[0].owned_by, 'anthropic');
  });

  // -- /v1/messages (Anthropic) --

  it('POST /v1/messages returns Anthropic response', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'test' }] },
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.type, 'message');
    assert.equal(json.role, 'assistant');
    assert.ok(json.content[0].text.includes('MOCK_RESPONSE'));
  });

  it('POST /v1/messages rejects invalid JSON', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    // Empty body → invalid JSON
    assert.equal(res.status, 400);
  });

  it('POST /v1/messages rejects empty messages', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [] },
    });
    assert.equal(res.status, 400);
  });

  it('POST /v1/messages streaming returns SSE', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'test' }], stream: true },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('event: message_start'));
    assert.ok(res.body.includes('event: content_block_delta'));
    assert.ok(res.body.includes('event: message_stop'));
  });

  // -- /v1/chat/completions (OpenAI) --

  it('POST /v1/chat/completions returns OpenAI response', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'test' }] },
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.object, 'chat.completion');
    assert.equal(json.choices[0].message.role, 'assistant');
    assert.ok(json.choices[0].message.content.includes('MOCK_RESPONSE'));
    assert.equal(json.choices[0].finish_reason, 'stop');
  });

  it('POST /v1/chat/completions handles system messages', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: {
        messages: [
          { role: 'system', content: 'Be brief' },
          { role: 'user', content: 'test' },
        ],
      },
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.object, 'chat.completion');
  });

  it('POST /v1/chat/completions rejects system-only messages', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'system', content: 'no user msg' }] },
    });
    assert.equal(res.status, 400);
    const json = JSON.parse(res.body);
    assert.ok(json.error.message.includes('user or assistant'));
  });

  it('POST /v1/chat/completions rejects empty messages', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [] },
    });
    assert.equal(res.status, 400);
  });

  it('POST /v1/chat/completions streaming returns SSE with [DONE]', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'test' }], stream: true },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('chat.completion.chunk'));
    assert.ok(res.body.includes('"role":"assistant"'));
    assert.ok(res.body.includes('"finish_reason":"stop"'));
    assert.ok(res.body.includes('data: [DONE]'));
  });

  // -- Error handling --

  it('auth error returns 401 on Anthropic endpoint', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'AUTH_FAIL' }] },
    });
    assert.equal(res.status, 401);
  });

  it('rate limit error returns 429 on Anthropic endpoint', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'RATE_LIMIT' }] },
    });
    assert.equal(res.status, 429);
  });

  it('generic exit error returns 500 on Anthropic endpoint', async () => {
    const res = await request('/v1/messages', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'EXIT_ERROR' }] },
    });
    assert.equal(res.status, 500);
  });

  it('auth error returns 401 on OpenAI endpoint', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'AUTH_FAIL' }] },
    });
    assert.equal(res.status, 401);
  });

  it('rate limit error returns 429 on OpenAI endpoint', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'RATE_LIMIT' }] },
    });
    assert.equal(res.status, 429);
  });
});
