import { describe, expect, it } from 'bun:test';
import { LeadStage } from '../../../generated/prisma/client';
import { PRODUCT_QA_SKILL } from './product-qa.skill';
import { buildSystemPrompt, skillForStage } from './system-prompt.builder';
import { UNKNOWN_CUSTOMER_NAME } from './skills.constants';

describe('system prompt', () => {
  it('has a skill for every lead stage', () => {
    for (const stage of Object.values(LeadStage)) {
      expect(skillForStage(stage)).toBeDefined();
    }
  });

  it('combines base rules, the skill and the conversation context', () => {
    const prompt = buildSystemPrompt({
      skill: PRODUCT_QA_SKILL,
      stage: LeadStage.engaged,
      customerName: 'Ada',
    });

    expect(prompt).toContain('*single asterisks*');
    expect(prompt).toContain(PRODUCT_QA_SKILL.instructions);
    expect(prompt).toContain("Customer's WhatsApp name: Ada");
    expect(prompt).toContain('Funnel stage: engaged');
  });

  it('handles a customer without a WhatsApp name', () => {
    const prompt = buildSystemPrompt({
      skill: PRODUCT_QA_SKILL,
      stage: LeadStage.new,
      customerName: null,
    });
    expect(prompt).toContain(UNKNOWN_CUSTOMER_NAME);
  });
});
