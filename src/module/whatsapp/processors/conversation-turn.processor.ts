import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import { BotMode } from '../../../generated/prisma/client';
import type { Message } from '../../../generated/prisma/client';
import { QUEUES } from '../../../common/queue.constants';
import { isFinalAttempt } from '../../../common/utils/job-attempts.util';
import { SalesAgentService } from '../../agent/sales-agent.service';
import { LeadsService } from '../../leads/leads.service';
import { MessagesService } from '../../messages/messages.service';
import type { ConversationTurnJob } from '../interfaces/conversation-turn-job.interface';
import type { OutboundMessageJob } from '../interfaces/outbound-message-job.interface';
import { remainingWaitMs } from '../turn-timing';
import { toWhatsAppFormatting } from '../whatsapp-format';
import {
  AGENT_FALLBACK_REPLY,
  MAX_WHATSAPP_BODY_LENGTH,
  MEDIA_NOT_SUPPORTED_REPLY,
  OUTBOUND_JOB_NAME,
  TURN_CONCURRENCY,
  TURN_FAILED_FALLBACK_SENT,
} from '../whatsapp.constants';

@Processor(QUEUES.CONVERSATION_TURN, { concurrency: TURN_CONCURRENCY })
export class ConversationTurnProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationTurnProcessor.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly messagesService: MessagesService,
    private readonly salesAgentService: SalesAgentService,
    @InjectQueue(QUEUES.WHATSAPP_OUTBOUND)
    private readonly outboundQueue: Queue<OutboundMessageJob>,
  ) {
    super();
  }

  async process(job: Job<ConversationTurnJob>, token?: string) {
    try {
      await this.runTurn(job, token);
    } catch (error) {
      if (error instanceof DelayedError || !isFinalAttempt(job)) {
        throw error;
      }
      this.logger.error(
        `${TURN_FAILED_FALLBACK_SENT} (lead ${job.data.leadId})`,
        error,
      );
      await this.sendFallbackReply(job.data.leadId);
    }
  }

  private async runTurn(job: Job<ConversationTurnJob>, token?: string) {
    const { leadId } = job.data;

    const pending = await this.messagesService.findUnprocessedInbound(leadId);
    if (pending.length === 0) {
      return;
    }

    const newest = pending[pending.length - 1];
    const waitMs = remainingWaitMs({
      oldestAt: pending[0].createdAt.getTime(),
      newestAt: newest.createdAt.getTime(),
      lastBody: newest.body,
      now: Date.now(),
    });
    if (waitMs > 0) {
      await job.moveToDelayed(Date.now() + waitMs, token);
      throw new DelayedError();
    }

    const pendingIds = pending.map((message) => message.id);
    const lead = await this.leadsService.getById(leadId);
    if (lead.botMode === BotMode.paused) {
      await this.messagesService.markProcessed(pendingIds);
      return;
    }

    const replyText = await this.buildReply(pending, {
      leadId,
      customerId: lead.customerId,
      stage: lead.stage,
      customerName: lead.customer.name,
    });
    await this.sendReply(leadId, replyText, pendingIds);
  }

  private async buildReply(
    pending: Message[],
    input: Parameters<SalesAgentService['respond']>[0],
  ): Promise<string> {
    if (pending.every((message) => !message.body.trim())) {
      return MEDIA_NOT_SUPPORTED_REPLY;
    }

    const result = await this.salesAgentService.respond(input);
    return toWhatsAppFormatting(result.reply ?? AGENT_FALLBACK_REPLY).slice(
      0,
      MAX_WHATSAPP_BODY_LENGTH,
    );
  }

  private async sendFallbackReply(leadId: string) {
    const pending = await this.messagesService.findUnprocessedInbound(leadId);
    if (pending.length === 0) {
      return;
    }
    await this.sendReply(
      leadId,
      AGENT_FALLBACK_REPLY,
      pending.map((message) => message.id),
    );
  }

  private async sendReply(leadId: string, text: string, pendingIds: string[]) {
    const reply = await this.messagesService.createReply(
      leadId,
      text,
      pendingIds,
    );
    await this.outboundQueue.add(
      OUTBOUND_JOB_NAME,
      { messageId: reply.id },
      { jobId: reply.id },
    );
  }
}
