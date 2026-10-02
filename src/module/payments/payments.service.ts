import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import type { PaymentJob } from './interfaces/payment-job.interface';
import {
  CHARGE_SUCCESS_EVENT,
  PAYMENT_JOB_NAME,
  paymentJobId,
} from './payments.constants';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectQueue(QUEUES.PAYMENTS)
    private readonly paymentsQueue: Queue<PaymentJob>,
  ) {}

  async handleWebhook(payload: Record<string, unknown>) {
    const data = payload.data as { reference?: unknown } | undefined;
    if (
      payload.event !== CHARGE_SUCCESS_EVENT ||
      typeof data?.reference !== 'string'
    ) {
      return;
    }

    await this.paymentsQueue.add(
      PAYMENT_JOB_NAME,
      { reference: data.reference },
      { jobId: paymentJobId(data.reference) },
    );
  }
}
