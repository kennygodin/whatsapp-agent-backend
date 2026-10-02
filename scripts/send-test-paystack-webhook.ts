import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import {
  PAYSTACK_REFERENCE_REQUIRED,
  PAYSTACK_WEBHOOK_PATH,
} from './scripts.constants';

const logger = new Logger('SendTestPaystackWebhook');

async function main() {
  const [, , reference] = process.argv;
  if (!reference) {
    throw new Error(PAYSTACK_REFERENCE_REQUIRED);
  }

  const body = JSON.stringify({
    event: 'charge.success',
    data: { reference, status: 'success' },
  });
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY ?? '')
    .update(body)
    .digest('hex');

  const response = await fetch(
    `${process.env.PUBLIC_BASE_URL}${PAYSTACK_WEBHOOK_PATH}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
      },
      body,
    },
  );
  logger.log(`${response.status} ${await response.text()}`);
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
