import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '../../../common/queue.constants';
import { LeadsService } from '../../leads/leads.service';
import { MessagesService } from '../../messages/messages.service';
import type { ConversationTurnJob } from '../interfaces/conversation-turn-job.interface';
import type { InboundMessageJob } from '../interfaces/inbound-message-job.interface';
import {
  INTAKE_CONCURRENCY,
  TURN_INITIAL_DELAY_MS,
  TURN_JOB_NAME,
} from '../whatsapp.constants';

@Processor(QUEUES.WHATSAPP_INTAKE, { concurrency: INTAKE_CONCURRENCY })
export class IntakeProcessor extends WorkerHost {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly messagesService: MessagesService,
    @InjectQueue(QUEUES.CONVERSATION_TURN)
    private readonly turnQueue: Queue<ConversationTurnJob>,
  ) {
    super();
  }

  async process(job: Job<InboundMessageJob>) {
    const { messageSid, phone, profileName, body, numMedia } = job.data;

    const { lead, isNew } = await this.leadsService.findOrOpenLead(
      phone,
      profileName,
    );
    const message = await this.messagesService.recordInbound({
      leadId: lead.id,
      body,
      hasMedia: numMedia > 0,
      twilioSid: messageSid,
    });

    if (message) {
      await this.leadsService.registerInbound(lead, isNew, message.createdAt);
    }

    await this.turnQueue.add(
      TURN_JOB_NAME,
      { leadId: lead.id },
      {
        delay: TURN_INITIAL_DELAY_MS,
        deduplication: { id: lead.id, keepLastIfActive: true },
      },
    );
  }
}
