import { Injectable } from '@nestjs/common';
import { EscalationService } from '../../alerts/escalation.service';
import type { ToolDefinition } from '../llm/llm.types';
import type { AgentTool, ToolContext } from './agent-tool.interface';
import { ToolInputError } from './tool-input.error';
import {
  ESCALATE_DESCRIPTION,
  ESCALATE_REASON_DESCRIPTION,
  ESCALATE_TOOL_NAME,
  ESCALATION_REASON_REQUIRED,
  MAX_ESCALATION_REASON_LENGTH,
} from '../agent.constants';

@Injectable()
export class EscalateToHumanTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: ESCALATE_TOOL_NAME,
    description: ESCALATE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: ESCALATE_REASON_DESCRIPTION },
      },
      required: ['reason'],
    },
  };

  constructor(private readonly escalationService: EscalationService) {}

  async execute(args: Record<string, unknown>, context: ToolContext) {
    const { reason } = args;
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new ToolInputError(ESCALATION_REASON_REQUIRED);
    }

    await this.escalationService.escalate(
      context.leadId,
      reason.trim().slice(0, MAX_ESCALATION_REASON_LENGTH),
    );
    return { escalated: true };
  }
}
