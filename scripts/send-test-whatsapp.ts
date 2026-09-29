import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import {
  DEFAULT_TEST_BODY,
  DEFAULT_TEST_FROM,
  TEST_PROFILE_NAME,
  WEBHOOK_PATH,
} from './scripts.constants';
import { Logger } from '@nestjs/common';

const logger = new Logger('SendTestWhatsapp');

async function main() {
  const [, , body = DEFAULT_TEST_BODY, from = DEFAULT_TEST_FROM] = process.argv;
  const url = `${process.env.PUBLIC_BASE_URL}${WEBHOOK_PATH}`;

  const params: Record<string, string> = {
    MessageSid: `SM${randomUUID().replace(/-/g, '')}`,
    From: from,
    To: process.env.TWILIO_WHATSAPP_FROM ?? '',
    Body: body,
    NumMedia: '0',
    ProfileName: TEST_PROFILE_NAME,
  };

  const signature = twilio.getExpectedTwilioSignature(
    process.env.TWILIO_AUTH_TOKEN ?? '',
    url,
    params,
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signature,
    },
    body: new URLSearchParams(params),
  });

  logger.log(`${response.status} ${await response.text()}`);
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
