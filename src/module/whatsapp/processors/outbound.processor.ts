import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { isFinalAttempt } from '../../../common/utils/job-attempts.util';
import { MessageStatus } from '../../../generated/prisma/client';
import { QUEUES } from '../../../common/queue.constants';
import { MessagesService } from '../../messages/messages.service';
import type { OutboundMessageJob } from '../interfaces/outbound-message-job.interface';
import {
  OUTBOUND_RATE_LIMIT,
  OUTBOUND_SEND_FAILED,
} from '../whatsapp.constants';
import { TwilioService } from '../../twilio/twilio.service';

@Processor(QUEUES.WHATSAPP_OUTBOUND, {
  concurrency: 1,
  limiter: OUTBOUND_RATE_LIMIT,
})
export class OutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundProcessor.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly twilioService: TwilioService,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageJob>) {
    const message = await this.messagesService.findForSend(job.data.messageId);
    if (!message || message.status !== MessageStatus.queued) {
      return;
    }

    try {
      const sid = await this.twilioService.sendWhatsapp(
        message.lead.customer.phone,
        message.body,
      );
      await this.messagesService.markSent(message.id, sid);
    } catch (error) {
      const isPermanent = this.twilioService.isPermanentError(error);
      const isLastAttempt = isFinalAttempt(job);

      if (isPermanent || isLastAttempt) {
        await this.messagesService.markFailed(
          message.id,
          this.twilioService.getErrorCode(error),
        );
        this.logger.error(`${OUTBOUND_SEND_FAILED} ${message.id}`, error);
      }
      if (isPermanent) {
        throw new UnrecoverableError((error as Error).message);
      }
      throw error;
    }
  }
}
