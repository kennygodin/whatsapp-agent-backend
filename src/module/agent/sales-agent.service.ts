import { Injectable, Logger } from '@nestjs/common';
import type { LeadStage } from '../../generated/prisma/client';
import { MessagesService } from '../messages/messages.service';
import { AgentService } from './agent.service';
import type { AgentTurnResult } from './agent.service';
import {
  GROUNDING_FALLBACK_REPLY,
  HISTORY_MESSAGE_LIMIT,
  agentTurnSummary,
  ungroundedLinkCorrection,
  ungroundedLinksLog,
  ungroundedPriceCorrection,
  ungroundedPricesLog,
} from './agent.constants';
import { findUngroundedPrices } from './grounding/price-check';
import { toChatHistory } from './context/conversation-history';
import {
  buildSystemPrompt,
  skillForStage,
} from './skills/system-prompt.builder';
import { findUngroundedUrls } from './grounding/link-check';

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
      validateReply: (reply, facts) =>
        this.checkGrounding(input.leadId, reply, facts),
    });

    this.logger.log(agentTurnSummary(input.leadId, skill, result));
    return result.rejected
      ? { ...result, reply: GROUNDING_FALLBACK_REPLY }
      : result;
  }

  private checkGrounding(
    leadId: string,
    reply: string,
    facts: string,
  ): string | null {
    const corrections: string[] = [];

    const prices = findUngroundedPrices(reply, facts);
    if (prices.length > 0) {
      this.logger.warn(ungroundedPricesLog(leadId, prices));
      corrections.push(ungroundedPriceCorrection(prices));
    }

    const urls = findUngroundedUrls(reply, facts);
    if (urls.length > 0) {
      this.logger.warn(ungroundedLinksLog(leadId, urls));
      corrections.push(ungroundedLinkCorrection(urls));
    }

    return corrections.length > 0 ? corrections.join('\n') : null;
  }
}
