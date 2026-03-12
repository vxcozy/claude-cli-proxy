// Anthropic API request/response types (subset needed for the proxy)

export interface ContentBlock {
  type: 'text';
  text: string;
}

export type MessageContent = string | ContentBlock[];

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: MessageContent;
}

export interface AnthropicRequest {
  model?: string;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  max_tokens?: number;
}

export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}
