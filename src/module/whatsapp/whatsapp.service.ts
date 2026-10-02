import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { MessageStatus as TwilioMessageStatus } from 'twilio/lib/rest/api/v2010/account/message';
import { QUEUES } from '../../common/queue.constants';
import { MessageStatus } from '../../generated/prisma/enums';
import { MessagesService } from '../messages/messages.service';
import type { InboundMessageJob } from './interfaces/inbound-message-job.interface';
import {
  INTAKE_JOB_NAME,
  INVALID_INBOUND_PAYLOAD,
  TWILIO_DELIVERY_STATUSES,
  WHATSAPP_ADDRESS_PREFIX,
  deliveryFailedLog,
} from './whatsapp.constants';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectQueue(QUEUES.WHATSAPP_INTAKE)
    private readonly intakeQueue: Queue<InboundMessageJob>,
    private readonly messagesService: MessagesService,
  ) {}

  async enqueueInbound(payload: Record<string, string | undefined>) {
    const job = this.toInboundMessageJob(payload);
    await this.intakeQueue.add(INTAKE_JOB_NAME, job, {
      jobId: job.messageSid,
    });
  }

  async recordDeliveryStatus(payload: Record<string, string | undefined>) {
    const { MessageSid, MessageStatus: twilioStatus, ErrorCode } = payload;
    const status =
      TWILIO_DELIVERY_STATUSES[twilioStatus as TwilioMessageStatus];
    if (!MessageSid || !status) {
      return;
    }

    const errorCode = ErrorCode || null;
    await this.messagesService.recordDeliveryStatus(
      MessageSid,
      status,
      errorCode,
    );

    if (
      status === MessageStatus.undelivered ||
      status === MessageStatus.failed
    ) {
      this.logger.warn(deliveryFailedLog(MessageSid, status, errorCode));
    }
  }

  private toInboundMessageJob(
    payload: Record<string, string | undefined>,
  ): InboundMessageJob {
    const { MessageSid, From, Body, ProfileName, NumMedia } = payload;
    if (!MessageSid || !From?.startsWith(WHATSAPP_ADDRESS_PREFIX)) {
      throw new BadRequestException(INVALID_INBOUND_PAYLOAD);
    }

    return {
      messageSid: MessageSid,
      phone: From.slice(WHATSAPP_ADDRESS_PREFIX.length),
      profileName: ProfileName || undefined,
      body: (Body ?? '').trim(),
      numMedia: Number(NumMedia ?? 0) || 0,
    };
  }
}
