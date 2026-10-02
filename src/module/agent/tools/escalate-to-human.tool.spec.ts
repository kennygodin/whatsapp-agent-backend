import { describe, expect, it } from 'bun:test';
import type { EscalationService } from '../../alerts/escalation.service';
import {
  ESCALATION_REASON_REQUIRED,
  MAX_ESCALATION_REASON_LENGTH,
} from '../agent.constants';
import { EscalateToHumanTool } from './escalate-to-human.tool';
import { ToolInputError } from './tool-input.error';

const CONTEXT = { leadId: 'lead-1', customerId: 'customer-1' };

function build() {
  const calls: { leadId: string; reason: string }[] = [];
  const escalationService = {
    escalate: async (leadId: string, reason: string) => {
      calls.push({ leadId, reason });
      return true;
    },
  } as unknown as EscalationService;
  return { tool: new EscalateToHumanTool(escalationService), calls };
}

describe('EscalateToHumanTool', () => {
  it('escalates the current lead from context, not from model arguments', async () => {
    const { tool, calls } = build();

    const result = await tool.execute(
      { reason: '  Faulty charger refund  ', leadId: 'someone-else' },
      CONTEXT,
    );

    expect(result).toEqual({ escalated: true });
    expect(calls).toEqual([
      { leadId: 'lead-1', reason: 'Faulty charger refund' },
    ]);
  });

  it('rejects a missing reason so the model can retry', async () => {
    const { tool } = build();
    await expect(tool.execute({}, CONTEXT)).rejects.toThrow(
      new ToolInputError(ESCALATION_REASON_REQUIRED),
    );
  });

  it('caps very long reasons', async () => {
    const { tool, calls } = build();
    await tool.execute({ reason: 'x'.repeat(1000) }, CONTEXT);
    expect(calls[0].reason).toHaveLength(MAX_ESCALATION_REASON_LENGTH);
  });
});
