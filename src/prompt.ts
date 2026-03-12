import type { AnthropicMessage, MessageContent } from './types.js';

/**
 * Serialize an Anthropic messages array into a CLI prompt string.
 *
 * Single-turn: return the user message text directly.
 * Multi-turn: wrap history in <conversation_history> tags so the model
 * understands the full context, then append an instruction to continue.
 */
export function buildPrompt(messages: AnthropicMessage[]): string {
  // Single user message — pass it straight through.
  if (messages.length === 1 && messages[0]?.role === 'user') {
    return extractText(messages[0].content);
  }

  const parts: string[] = ['<conversation_history>'];

  for (const msg of messages) {
    const text = extractText(msg.content);
    if (!text) continue;
    const label = msg.role === 'user' ? 'User' : 'Assistant';
    parts.push(`[${label}]: ${text}`);
  }

  parts.push('</conversation_history>');
  parts.push('');
  parts.push('Continue the conversation. Respond to the most recent [User] message above.');

  return parts.join('\n');
}

/** Pull plain text out of a message content field (string or block array). */
export function extractText(content: MessageContent): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
