import type { ToolDefinition } from '../llm/llm.types';

export interface ToolContext {
  leadId: string;
  customerId: string;
}

export interface AgentTool {
  readonly definition: ToolDefinition;
  execute(
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown>;
}

export type ToolResult =
  { ok: true; data: unknown } | { ok: false; error: string };
