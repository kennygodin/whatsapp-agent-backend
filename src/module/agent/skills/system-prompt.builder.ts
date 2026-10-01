import { LeadStage } from '../../../generated/prisma/client';
import { PRODUCT_QA_SKILL } from './product-qa.skill';
import type { Skill } from './skill.interface';
import {
  BASE_SYSTEM_PROMPT,
  CONTEXT_SECTION_HEADING,
  SKILL_SECTION_HEADING,
  UNKNOWN_CUSTOMER_NAME,
  customerNameLine,
  funnelStageLine,
} from './skills.constants';

const SKILL_BY_STAGE: Record<LeadStage, Skill> = {
  [LeadStage.new]: PRODUCT_QA_SKILL,
  [LeadStage.engaged]: PRODUCT_QA_SKILL,
  [LeadStage.order_started]: PRODUCT_QA_SKILL,
  [LeadStage.converted]: PRODUCT_QA_SKILL,
  [LeadStage.dropped_off]: PRODUCT_QA_SKILL,
};

export function skillForStage(stage: LeadStage): Skill {
  return SKILL_BY_STAGE[stage];
}

export function buildSystemPrompt(input: {
  skill: Skill;
  stage: LeadStage;
  customerName: string | null;
}): string {
  return [
    BASE_SYSTEM_PROMPT,
    `${SKILL_SECTION_HEADING}\n${input.skill.instructions}`,
    [
      CONTEXT_SECTION_HEADING,
      customerNameLine(input.customerName ?? UNKNOWN_CUSTOMER_NAME),
      funnelStageLine(input.stage),
    ].join('\n'),
  ].join('\n\n');
}
