import { Injectable, Logger } from '@nestjs/common';
import { LlmRouter } from './llm/llm-router';
import type { ChatMessage, LLMProvider } from './llm/llm.types';
import type { ToolContext } from './tools/agent-tool.interface';
import { ToolRegistry } from './tools/tool-registry';
import {
  AGENT_ITERATION_CAP_REACHED,
  AGENT_REPLY_REJECTED,
  MAX_AGENT_ITERATIONS,
  MAX_REPLY_CORRECTIONS,
} from './agent.constants';

export type ReplyValidator = (reply: string, facts: string) => string | null;

export interface AgentTurnInput {
  system: string;
  history: ChatMessage[];
  context: ToolContext;
  validateReply?: ReplyValidator;
}

export interface AgentTurnResult {
  reply: string | null;
  provider: string;
  iterations: number;
  toolCalls: string[];
  corrections: number;
  hitIterationCap: boolean;
  rejected: boolean;
}

function customerText(history: ChatMessage[]): string[] {
  return history.flatMap((message) =>
    message.role === 'user' ? [message.content] : [],
  );
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
    { system, history, context, validateReply }: AgentTurnInput,
  ): Promise<AgentTurnResult> {
    const messages: ChatMessage[] = [...history];
    const facts = customerText(history);
    const tools = this.toolRegistry.definitions();
    const toolCalls: string[] = [];
    let corrections = 0;

    const finish = (
      reply: string | null,
      iterations: number,
      outcome: { hitIterationCap?: boolean; rejected?: boolean } = {},
    ): AgentTurnResult => ({
      reply,
      provider: llm.name,
      iterations,
      toolCalls,
      corrections,
      hitIterationCap: outcome.hitIterationCap ?? false,
      rejected: outcome.rejected ?? false,
    });

    for (let iteration = 1; iteration <= MAX_AGENT_ITERATIONS; iteration++) {
      const response = await llm.complete({ system, messages, tools });

      if (response.toolCalls.length === 0) {
        const reply = response.content?.trim() || null;
        const correction =
          reply && validateReply
            ? validateReply(reply, facts.join('\n'))
            : null;
        if (!correction) {
          return finish(reply, iteration);
        }
        if (corrections >= MAX_REPLY_CORRECTIONS) {
          this.logger.warn(AGENT_REPLY_REJECTED);
          return finish(null, iteration, { rejected: true });
        }

        corrections += 1;
        messages.push(
          {
            role: 'assistant',
            content: reply,
            providerData: response.providerData,
          },
          { role: 'user', content: correction },
        );
        continue;
      }

      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
        providerData: response.providerData,
      });

      for (const call of response.toolCalls) {
        toolCalls.push(call.name);
        const result = JSON.stringify(
          await this.toolRegistry.execute(call, context),
        );
        facts.push(result);
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: result,
        });
      }
    }

    this.logger.warn(AGENT_ITERATION_CAP_REACHED);
    return finish(null, MAX_AGENT_ITERATIONS, { hitIterationCap: true });
  }
}
