import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { API_PREFIX, SECURE_URL_PROTOCOL } from '../../common/common.constants';
import { withTimeout } from '../../common/utils/with-timeout.util';
import {
  STATUS_CALLBACK_PATH,
  TWILIO_REQUEST_TIMED_OUT,
  TWILIO_REQUEST_TIMEOUT_MS,
  WHATSAPP_ADDRESS_PREFIX,
  WHATSAPP_WEBHOOK_ROUTE,
} from './whatsapp.constants';

@Injectable()
export class TwilioService {
  private readonly client: twilio.Twilio;
  private readonly whatsappFrom: string;
  private readonly statusCallbackUrl?: string;

  constructor(configService: ConfigService) {
    this.client = twilio(
      configService.getOrThrow<string>('twilio.accountSid'),
      configService.getOrThrow<string>('twilio.authToken'),
      { autoRetry: false },
    );
    this.whatsappFrom = configService.getOrThrow<string>('twilio.whatsappFrom');
    const publicBaseUrl = configService.getOrThrow<string>('app.publicBaseUrl');
    if (new URL(publicBaseUrl).protocol === SECURE_URL_PROTOCOL) {
      this.statusCallbackUrl = `${publicBaseUrl}/${API_PREFIX}/${WHATSAPP_WEBHOOK_ROUTE}/${STATUS_CALLBACK_PATH}`;
    }
  }

  async sendWhatsapp(phone: string, body: string): Promise<string> {
    const message = await withTimeout(
      this.client.messages.create({
        from: this.whatsappFrom,
        to: `${WHATSAPP_ADDRESS_PREFIX}${phone}`,
        body,
        ...(this.statusCallbackUrl
          ? { statusCallback: this.statusCallbackUrl }
          : {}),
      }),

      TWILIO_REQUEST_TIMEOUT_MS,
      TWILIO_REQUEST_TIMED_OUT,
    );
    return message.sid;
  }

  isPermanentError(error: unknown): boolean {
    return (
      error instanceof twilio.RestException &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    );
  }

  getErrorCode(error: unknown): string | null {
    if (error instanceof twilio.RestException) {
      return String(error.code ?? error.status);
    }
    return null;
  }
}
