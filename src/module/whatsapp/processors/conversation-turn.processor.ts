import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job, Queue } from 'bullmq';
import { BotMode } from '../../../generated/prisma/client';
import type { Message } from '../../../generated/prisma/client';
import { QUEUES } from '../../../common/queue.constants';
import { SalesAgentService } from '../../agent/sales-agent.service';
import { LeadsService } from '../../leads/leads.service';
import { MessagesService } from '../../messages/messages.service';
import type { ConversationTurnJob } from '../interfaces/conversation-turn-job.interface';
import type { OutboundMessageJob } from '../interfaces/outbound-message-job.interface';
import { remainingWaitMs } from '../turn-timing';
import { toWhatsAppFormatting } from '../whatsapp-format';
import {
  AGENT_FALLBACK_REPLY,
  AGENT_TURN_FAILED,
  MAX_WHATSAPP_BODY_LENGTH,
  MEDIA_NOT_SUPPORTED_REPLY,
  OUTBOUND_JOB_NAME,
  TURN_CONCURRENCY,
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

    const replyText = await this.buildReply(job, pending, {
      leadId,
      customerId: lead.customerId,
      stage: lead.stage,
      customerName: lead.customer.name,
    });

    const reply = await this.messagesService.createReply(
      leadId,
      replyText,
      pendingIds,
    );
    await this.outboundQueue.add(
      OUTBOUND_JOB_NAME,
      { messageId: reply.id },
      { jobId: reply.id },
    );
  }

  private async buildReply(
    job: Job<ConversationTurnJob>,
    pending: Message[],
    input: Parameters<SalesAgentService['respond']>[0],
  ): Promise<string> {
    if (pending.every((message) => !message.body.trim())) {
      return MEDIA_NOT_SUPPORTED_REPLY;
    }

    try {
      const result = await this.salesAgentService.respond(input);
      return (result.reply ?? AGENT_FALLBACK_REPLY).slice(
        0,
        MAX_WHATSAPP_BODY_LENGTH,
      );
    } catch (error) {
      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (!isLastAttempt) {
        throw error;
      }
      this.logger.error(`${AGENT_TURN_FAILED} (lead ${input.leadId})`, error);
      const result = await this.salesAgentService.respond(input);
      return toWhatsAppFormatting(result.reply ?? AGENT_FALLBACK_REPLY).slice(
        0,
        MAX_WHATSAPP_BODY_LENGTH,
      );
    }
  }
}
