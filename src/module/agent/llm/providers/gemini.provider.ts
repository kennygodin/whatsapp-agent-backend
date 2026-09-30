import { ApiError, GoogleGenAI } from '@google/genai';
import type { Content, Part } from '@google/genai';
import { randomUUID } from 'node:crypto';
import { withTimeout } from '../../../../common/utils/with-timeout.util';
import {
  LLM_REQUEST_TIMEOUT_MS,
  llmTimeoutMessage,
} from '../../agent.constants';
import { LlmProviderError, failureKindFromStatus } from '../llm-provider.error';
import type {
  ChatMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  ToolCall,
} from '../llm.types';

export interface GeminiOptions {
  name: string;
  apiKey: string;
  model: string;
}

function isGeminiContent(value: unknown): value is Content {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Content).parts)
  );
}

export class GeminiProvider implements LLMProvider {
  readonly name: string;
  private readonly client: GoogleGenAI;

  constructor(private readonly options: GeminiOptions) {
    this.name = options.name;
    this.client = new GoogleGenAI({
      apiKey: options.apiKey,
      httpOptions: { timeout: LLM_REQUEST_TIMEOUT_MS },
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await withTimeout(
        this.client.models.generateContent({
          model: this.options.model,
          contents: this.toContents(request.messages),
          config: {
            systemInstruction: request.system,
            ...(request.tools.length > 0
              ? {
                  tools: [
                    {
                      functionDeclarations: request.tools.map((tool) => ({
                        name: tool.name,
                        description: tool.description,
                        parametersJsonSchema: tool.parameters,
                      })),
                    },
                  ],
                }
              : {}),
          },
        }),
        LLM_REQUEST_TIMEOUT_MS,
        llmTimeoutMessage(this.name),
      );

      const content = response.candidates?.[0]?.content;
      const parts = content?.parts ?? [];
      const text = parts
        .filter((part) => part.text && !part.thought)
        .map((part) => part.text)
        .join('');
      const toolCalls: ToolCall[] = parts
        .filter((part) => part.functionCall?.name)
        .map((part) => ({
          id: part.functionCall?.id ?? randomUUID(),
          name: part.functionCall?.name ?? '',
          arguments: part.functionCall?.args ?? {},
        }));

      return { content: text || null, toolCalls, providerData: content };
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  private toContents(messages: ChatMessage[]): Content[] {
    const contents: Content[] = [];

    for (const message of messages) {
      if (message.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: message.content }] });
      } else if (message.role === 'assistant') {
        contents.push(
          isGeminiContent(message.providerData)
            ? message.providerData
            : { role: 'model', parts: this.toModelParts(message) },
        );
      } else {
        const responsePart: Part = {
          functionResponse: {
            id: message.toolCallId,
            name: message.name,
            response: this.parseToolResult(message.content),
          },
        };
        const previous = contents.at(-1);
        if (previous?.role === 'user' && previous.parts?.[0]?.functionResponse) {
          previous.parts.push(responsePart);
        } else {
          contents.push({ role: 'user', parts: [responsePart] });
        }
      }
    }
    return contents;
  }

  private toModelParts(
    message: Extract<ChatMessage, { role: 'assistant' }>,
  ): Part[] {
    const parts: Part[] = message.content ? [{ text: message.content }] : [];
    for (const call of message.toolCalls ?? []) {
      parts.push({
        functionCall: { id: call.id, name: call.name, args: call.arguments },
      });
    }
    return parts;
  }

  private parseToolResult(content: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(content);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : { result: parsed };
    } catch {
      return { result: content };
    }
  }

  private toProviderError(error: unknown): LlmProviderError {
    if (error instanceof ApiError) {
      return new LlmProviderError(
        this.name,
        failureKindFromStatus(error.status),
        error.message,
      );
    }
    return new LlmProviderError(
      this.name,
      'unavailable',
      error instanceof Error ? error.message : String(error),
    );
  }
}
