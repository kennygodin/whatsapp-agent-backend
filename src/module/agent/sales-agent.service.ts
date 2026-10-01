import { Injectable, Logger } from '@nestjs/common';
import type { LeadStage } from '../../generated/prisma/client';
import { MessagesService } from '../messages/messages.service';
import { AgentService } from './agent.service';
import type { AgentTurnResult } from './agent.service';
import { HISTORY_MESSAGE_LIMIT, agentTurnSummary } from './agent.constants';
import { toChatHistory } from './context/conversation-history';
import {
  buildSystemPrompt,
  skillForStage,
} from './skills/system-prompt.builder';

export interface SalesTurnInput {
  leadId: string;
  customerId: string;
  stage: LeadStage;
  customerName: string | null;
}

@Injectable()
export class SalesAgentService {
  private readonly logger = new Logger(SalesAgentService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly messagesService: MessagesService,
  ) {}

  async respond(input: SalesTurnInput): Promise<AgentTurnResult> {
    const skill = skillForStage(input.stage);
    const recent = await this.messagesService.findRecent(
      input.leadId,
      HISTORY_MESSAGE_LIMIT,
    );

    const result = await this.agentService.runTurn({
      system: buildSystemPrompt({
        skill,
        stage: input.stage,
        customerName: input.customerName,
      }),
      history: toChatHistory(recent),
      context: { leadId: input.leadId, customerId: input.customerId },
    });

    this.logger.log(agentTurnSummary(input.leadId, skill, result));
    return result;
  }
}
