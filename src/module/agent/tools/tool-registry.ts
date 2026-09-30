import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ToolCall, ToolDefinition } from '../llm/llm.types';
import type {
  AgentTool,
  ToolContext,
  ToolResult,
} from './agent-tool.interface';
import { ToolInputError } from './tool-input.error';
import {
  AGENT_TOOLS,
  TOOL_EXECUTION_FAILED,
  TOOL_UNAVAILABLE,
  unknownToolMessage,
} from '../agent.constants';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools: Map<string, AgentTool>;

  constructor(@Inject(AGENT_TOOLS) tools: AgentTool[]) {
    this.tools = new Map(tools.map((tool) => [tool.definition.name, tool]));
  }

  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((tool) => tool.definition);
  }

  async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { ok: false, error: unknownToolMessage(call.name) };
    }

    try {
      return { ok: true, data: await tool.execute(call.arguments, context) };
    } catch (error) {
      if (error instanceof ToolInputError) {
        return { ok: false, error: error.message };
      }
      this.logger.error(`${TOOL_EXECUTION_FAILED}: ${call.name}`, error);
      return { ok: false, error: TOOL_UNAVAILABLE };
    }
  }
}
