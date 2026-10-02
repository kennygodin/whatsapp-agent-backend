import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { withTimeout } from '../../common/utils/with-timeout.util';
import {
  MAIL_REQUEST_TIMED_OUT,
  MAIL_REQUEST_TIMEOUT_MS,
  mailSendFailedMessage,
} from './mail.constants';

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  idempotencyKey?: string;
}

@Injectable()
export class MailService {
  private readonly client: Resend;
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.client = new Resend(configService.getOrThrow<string>('mail.apiKey'));
    this.from = configService.getOrThrow<string>('mail.from');
  }

  async send({ to, subject, text, idempotencyKey }: MailInput) {
    const { error } = await withTimeout(
      this.client.emails.send(
        { from: this.from, to, subject, text },
        idempotencyKey ? { idempotencyKey } : undefined,
      ),
      MAIL_REQUEST_TIMEOUT_MS,
      MAIL_REQUEST_TIMED_OUT,
    );
    if (error) {
      throw new Error(mailSendFailedMessage(error.name, error.message));
    }
  }
}
