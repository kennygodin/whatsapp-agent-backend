import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { withTimeout } from '../../../../common/utils/with-timeout.util';
import {
  LLM_REQUEST_TIMEOUT_MS,
  llmTimeoutMessage,
} from '../../agent.constants';
import { LlmProviderError, failureKindFromStatus } from '../llm-provider.error';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  ToolCall,
} from '../llm.types';

export interface OpenAICompatibleOptions {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAICompatibleOptions) {
    this.name = options.name;
    this.client = new OpenAI({
      baseURL: options.baseURL,
      apiKey: options.apiKey,
      timeout: LLM_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const completion = await withTimeout(
        this.client.chat.completions.create({
          model: this.options.model,
          messages: this.toMessages(request),
          ...(request.tools.length > 0
            ? { tools: request.tools.map((tool) => this.toTool(tool)) }
            : {}),
          ...(this.options.reasoningEffort
            ? { reasoning_effort: this.options.reasoningEffort }
            : {}),
        }),
        LLM_REQUEST_TIMEOUT_MS,
        llmTimeoutMessage(this.name),
      );

      const message = completion.choices[0]?.message;
      const toolCalls: ToolCall[] = (message?.tool_calls ?? [])
        .filter((call) => call.type === 'function')
        .map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: this.parseArguments(call.function.arguments),
        }));

      return { content: message?.content ?? null, toolCalls };
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  private toMessages(request: LLMRequest): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: request.system },
    ];

    for (const message of request.messages) {
      if (message.role === 'user') {
        messages.push({ role: 'user', content: message.content });
      } else if (message.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: message.toolCallId,
          content: message.content,
        });
      } else {
        messages.push({
          role: 'assistant',
          content: message.content,
          ...(message.toolCalls?.length
            ? {
                tool_calls: message.toolCalls.map((call) => ({
                  id: call.id,
                  type: 'function' as const,
                  function: {
                    name: call.name,
                    arguments: JSON.stringify(call.arguments),
                  },
                })),
              }
            : {}),
        });
      }
    }
    return messages;
  }

  private toTool(tool: LLMRequest['tools'][number]): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  private parseArguments(raw: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private toProviderError(error: unknown): LlmProviderError {
    if (error instanceof OpenAI.APIError) {
      const retryAfterSeconds = Number(error.headers?.get('retry-after'));
      return new LlmProviderError(
        this.name,
        failureKindFromStatus(error.status),
        error.message,
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : undefined,
      );
    }
    return new LlmProviderError(
      this.name,
      'unavailable',
      error instanceof Error ? error.message : String(error),
    );
  }
}
