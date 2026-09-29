import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { BotMode, Message } from '../../../generated/prisma/client';
import { QUEUES } from '../../../common/queue.constants';
import { LeadsService } from '../../leads/leads.service';
import { MessagesService } from '../../messages/messages.service';
import { ConversationTurnJob } from '../interfaces/conversation-turn-job.interface';
import { OutboundMessageJob } from '../interfaces/outbound-message-job.interface';
import {
  ECHO_REPLY_PREFIX,
  MAX_WHATSAPP_BODY_LENGTH,
  MEDIA_NOT_SUPPORTED_REPLY,
  OUTBOUND_JOB_NAME,
  TURN_CONCURRENCY,
} from '../whatsapp.constants';

@Processor(QUEUES.CONVERSATION_TURN, { concurrency: TURN_CONCURRENCY })
export class ConversationTurnProcessor extends WorkerHost {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly messagesService: MessagesService,
    @InjectQueue(QUEUES.WHATSAPP_OUTBOUND)
    private readonly outboundQueue: Queue<OutboundMessageJob>,
  ) {
    super();
  }

  async process(job: Job<ConversationTurnJob>) {
    const { leadId } = job.data;

    const pending = await this.messagesService.findUnprocessedInbound(leadId);
    if (pending.length === 0) {
      return;
    }
    const pendingIds = pending.map((message) => message.id);

    const lead = await this.leadsService.getById(leadId);
    if (lead.botMode === BotMode.paused) {
      await this.messagesService.markProcessed(pendingIds);
      return;
    }

    const reply = await this.messagesService.createReply(
      leadId,
      this.buildEchoReply(pending),
      pendingIds,
    );
    await this.outboundQueue.add(
      OUTBOUND_JOB_NAME,
      { messageId: reply.id },
      { jobId: reply.id },
    );
  }

  private buildEchoReply(pending: Message[]) {
    const text = pending
      .map((message) => message.body)
      .filter(Boolean)
      .join('\n');

    if (!text) {
      return MEDIA_NOT_SUPPORTED_REPLY;
    }
    return `${ECHO_REPLY_PREFIX}${text}`.slice(0, MAX_WHATSAPP_BODY_LENGTH);
  }
}
