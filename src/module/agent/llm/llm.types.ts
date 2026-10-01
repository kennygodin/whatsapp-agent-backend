export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type ChatMessage =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      toolCalls?: ToolCall[];
      providerData?: unknown;
    }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  providerData?: unknown;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
