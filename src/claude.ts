import { spawn } from 'node:child_process';

const AUTH_FAILURE = [
  'not logged in',
  'please run /login',
  'authentication required',
  'unauthorized',
  'auth token expired',
  'invalid api key',
  'invalid auth',
];

const RATE_LIMIT = [
  'rate limit',
  'too many requests',
  'usage limit',
  'quota exceeded',
  'try again later',
  'you have exceeded',
  'limit reached',
];

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly kind: 'auth' | 'rate_limit' | 'spawn' | 'exit' | 'cancelled',
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export interface RunOptions {
  systemPrompt?: string;
  model?: string;
  signal?: AbortSignal;
}

/**
 * Spawn the Claude CLI and stream its stdout as text chunks.
 *
 * Uses --print (plain text output) and --dangerously-skip-permissions
 * so it never blocks waiting for a TTY permission prompt.
 * Does NOT pass --tools "" so Claude's native coding tools remain available.
 */
export async function* runClaude(
  prompt: string,
  opts: RunOptions = {},
): AsyncGenerator<string, void, undefined> {
  const args: string[] = ['--print', '--dangerously-skip-permissions'];

  // CLAUDE_NO_TOOLS=1 disables built-in tools — pure chat mode.
  if (process.env['CLAUDE_NO_TOOLS'] === '1') {
    args.push('--tools', '');
  }

  if (opts.model) {
    args.push('--model', opts.model);
  }

  if (opts.systemPrompt) {
    args.push('--system-prompt', opts.systemPrompt);
  }

  // Prompt is the final argument.
  args.push(prompt);

  // Strip env vars that cause Claude CLI to refuse nested invocations.
  const env: Record<string, string | undefined> = { ...process.env };
  delete env['CLAUDECODE'];
  delete env['CLAUDE_CODE_SESSION'];

  let child;
  try {
    child = spawn('claude', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new ClaudeError(
      `Failed to spawn claude CLI: ${err instanceof Error ? err.message : String(err)}`,
      'spawn',
    );
  }

  // Close stdin immediately — prompt is passed as a CLI argument.
  child.stdin?.end();

  // Capture exit code before streaming so we never miss the 'close' event.
  const exitPromise = new Promise<number | null>((resolve) => {
    child.on('close', resolve);
    child.on('error', () => resolve(null));
  });

  // Collect stderr for error detection; cap at 64 KB.
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer | string) => {
    if (stderr.length < 65_536) {
      stderr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    }
  });

  // Kill child on abort.
  const onAbort = () => {
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
  };
  opts.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    if (child.stdout) {
      for await (const chunk of child.stdout) {
        if (opts.signal?.aborted) break;
        yield typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      }
    }

    const exitCode = await exitPromise;

    if (opts.signal?.aborted) {
      throw new ClaudeError('Run was cancelled', 'cancelled');
    }

    if (exitCode !== 0 && exitCode !== null) {
      const lower = stderr.toLowerCase();
      if (AUTH_FAILURE.some((p) => lower.includes(p))) {
        throw new ClaudeError(
          "Claude CLI is not authenticated. Run 'claude' in your terminal and use /login to sign in.",
          'auth',
        );
      }
      if (RATE_LIMIT.some((p) => lower.includes(p))) {
        throw new ClaudeError(
          "Usage limit reached. Wait for it to reset or check claude.ai/settings.",
          'rate_limit',
        );
      }
      throw new ClaudeError(
        `claude exited with code ${exitCode}${stderr ? ': ' + stderr.slice(0, 300) : ''}`,
        'exit',
      );
    }
  } finally {
    opts.signal?.removeEventListener('abort', onAbort);
    try { if (!child.killed) child.kill('SIGTERM'); } catch { /* ignore */ }
    try { child.stdin?.destroy(); } catch { /* ignore */ }
    try { child.stdout?.destroy(); } catch { /* ignore */ }
    try { child.stderr?.destroy(); } catch { /* ignore */ }
  }
}
