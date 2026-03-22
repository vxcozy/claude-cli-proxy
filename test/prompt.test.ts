import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, extractText } from '../src/prompt.js';

// ---------------------------------------------------------------------------
// extractText
// ---------------------------------------------------------------------------

describe('extractText', () => {
  it('returns string content as-is', () => {
    assert.equal(extractText('hello'), 'hello');
  });

  it('extracts text from content blocks', () => {
    const blocks = [
      { type: 'text' as const, text: 'first' },
      { type: 'text' as const, text: 'second' },
    ];
    assert.equal(extractText(blocks), 'first\nsecond');
  });

  it('returns empty string for empty blocks', () => {
    assert.equal(extractText([]), '');
  });
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------

describe('buildPrompt', () => {
  it('passes single user message through directly', () => {
    const result = buildPrompt([{ role: 'user', content: 'Hello' }]);
    assert.equal(result, 'Hello');
  });

  it('wraps multi-turn conversation in history tags', () => {
    const result = buildPrompt([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'How are you?' },
    ]);

    assert.ok(result.includes('<conversation_history>'));
    assert.ok(result.includes('[User]: Hi'));
    assert.ok(result.includes('[Assistant]: Hello!'));
    assert.ok(result.includes('[User]: How are you?'));
    assert.ok(result.includes('</conversation_history>'));
    assert.ok(result.includes('Continue the conversation'));
  });

  it('handles content blocks in multi-turn', () => {
    const result = buildPrompt([
      { role: 'user', content: [{ type: 'text', text: 'block message' }] },
      { role: 'assistant', content: 'reply' },
    ]);

    assert.ok(result.includes('[User]: block message'));
    assert.ok(result.includes('[Assistant]: reply'));
  });

  it('skips empty content in multi-turn', () => {
    const result = buildPrompt([
      { role: 'user', content: '' },
      { role: 'user', content: 'real message' },
    ]);

    assert.ok(!result.includes('[User]: \n'));
    assert.ok(result.includes('[User]: real message'));
  });
});
