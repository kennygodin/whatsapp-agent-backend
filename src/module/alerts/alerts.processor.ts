import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import { MailService } from '../mail/mail.service';
import { TwilioService } from '../twilio/twilio.service';
import type { EscalationAlertJob } from './interfaces/escalation-alert-job.interface';
import {
  ALERT_CHANNELS,
  escalationAlertText,
  escalationEmailSubject,
  unknownAlertChannel,
} from './alerts.constants';

@Processor(QUEUES.ALERTS)
export class AlertsProcessor extends WorkerHost {
  private readonly alertEmail: string;
  private readonly alertWhatsapp: string;

  constructor(
    configService: ConfigService,
    private readonly mailService: MailService,
    private readonly twilioService: TwilioService,
  ) {
    super();
    this.alertEmail = configService.getOrThrow<string>('alerts.email');
    this.alertWhatsapp = configService.getOrThrow<string>('alerts.whatsapp');
  }

  async process(job: Job<EscalationAlertJob>) {
    const text = escalationAlertText(job.data);

    if (job.name === ALERT_CHANNELS.EMAIL) {
      await this.mailService.send({
        to: this.alertEmail,
        subject: escalationEmailSubject(job.data),
        text,
        idempotencyKey: job.id,
      });
      return;
    }

    if (job.name === ALERT_CHANNELS.WHATSAPP) {
      try {
        await this.twilioService.sendWhatsapp(this.alertWhatsapp, text);
      } catch (error) {
        if (this.twilioService.isPermanentError(error)) {
          throw new UnrecoverableError((error as Error).message);
        }
        throw error;
      }
      return;
    }

    throw new UnrecoverableError(unknownAlertChannel(job.name));
  }
}
