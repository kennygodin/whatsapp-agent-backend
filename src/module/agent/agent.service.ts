import { Injectable, Logger } from '@nestjs/common';
import { LlmRouter } from './llm/llm-router';
import type { ChatMessage, LLMProvider } from './llm/llm.types';
import type { ToolContext } from './tools/agent-tool.interface';
import { ToolRegistry } from './tools/tool-registry';
import {
  AGENT_ITERATION_CAP_REACHED,
  MAX_AGENT_ITERATIONS,
} from './agent.constants';

export interface AgentTurnInput {
  system: string;
  history: ChatMessage[];
  context: ToolContext;
}

export interface AgentTurnResult {
  reply: string | null;
  provider: string;
  iterations: number;
  toolCalls: string[];
  hitIterationCap: boolean;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly llmRouter: LlmRouter,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    return this.llmRouter.run((provider) => this.runLoop(provider, input));
  }

  private async runLoop(
    llm: LLMProvider,
    { system, history, context }: AgentTurnInput,
  ): Promise<AgentTurnResult> {
    const messages: ChatMessage[] = [...history];
    const tools = this.toolRegistry.definitions();
    const toolCalls: string[] = [];

    for (let iteration = 1; iteration <= MAX_AGENT_ITERATIONS; iteration++) {
      const response = await llm.complete({ system, messages, tools });

      if (response.toolCalls.length === 0) {
        return {
          reply: response.content?.trim() || null,
          provider: llm.name,
          iterations: iteration,
          toolCalls,
          hitIterationCap: false,
        };
      }

      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
        providerData: response.providerData,
      });

      for (const call of response.toolCalls) {
        toolCalls.push(call.name);
        const result = await this.toolRegistry.execute(call, context);
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify(result),
        });
      }
    }

    this.logger.warn(AGENT_ITERATION_CAP_REACHED);
    return {
      reply: null,
      provider: llm.name,
      iterations: MAX_AGENT_ITERATIONS,
      toolCalls,
      hitIterationCap: true,
    };
  }
}
