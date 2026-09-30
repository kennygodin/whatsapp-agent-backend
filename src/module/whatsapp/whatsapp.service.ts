import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import type { InboundMessageJob } from './interfaces/inbound-message-job.interface';
import {
  INTAKE_JOB_NAME,
  INVALID_INBOUND_PAYLOAD,
  WHATSAPP_ADDRESS_PREFIX,
} from './whatsapp.constants';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectQueue(QUEUES.WHATSAPP_INTAKE)
    private readonly intakeQueue: Queue<InboundMessageJob>,
  ) {}

  async enqueueInbound(payload: Record<string, string | undefined>) {
    const job = this.toInboundMessageJob(payload);
    await this.intakeQueue.add(INTAKE_JOB_NAME, job, {
      jobId: job.messageSid,
    });
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
