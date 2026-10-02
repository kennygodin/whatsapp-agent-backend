import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import { EscalationService } from '../alerts/escalation.service';
import { MessagesService } from '../messages/messages.service';
import { OrdersService } from '../orders/orders.service';
import { PaystackService } from '../paystack/paystack.service';
import { PAYSTACK_SUCCESS_STATUS } from '../paystack/paystack.constants';
import type { OutboundMessageJob } from '../whatsapp/interfaces/outbound-message-job.interface';
import { OUTBOUND_JOB_NAME } from '../whatsapp/whatsapp.constants';
import type { PaymentJob } from './interfaces/payment-job.interface';
import {
  AMOUNT_MISMATCH_REASON,
  OUT_OF_STOCK_AFTER_PAYMENT_REASON,
  PAID_CANCELLED_ORDER_REASON,
  PAYMENT_NEEDS_REVIEW_REPLY,
  PAYMENT_NOT_SUCCESSFUL,
  UNKNOWN_PAYMENT_REFERENCE,
  paymentConfirmation,
  paymentRecorded,
} from './payments.constants';

@Processor(QUEUES.PAYMENTS)
export class PaymentsProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly ordersService: OrdersService,
    private readonly escalationService: EscalationService,
    private readonly messagesService: MessagesService,
    @InjectQueue(QUEUES.WHATSAPP_OUTBOUND)
    private readonly outboundQueue: Queue<OutboundMessageJob>,
  ) {
    super();
  }

  async process(job: Job<PaymentJob>) {
    const { reference } = job.data;

    const verified = await this.paystackService.verifyTransaction(reference);
    if (verified.status !== PAYSTACK_SUCCESS_STATUS) {
      this.logger.warn(PAYMENT_NOT_SUCCESSFUL(reference, verified.status));
      return;
    }

    const outcome = await this.ordersService.recordPayment({
      reference,
      amountKobo: verified.amountKobo,
      currency: verified.currency,
      paidAt: verified.paidAt ? new Date(verified.paidAt) : new Date(),
    });

    switch (outcome.kind) {
      case 'unknown_reference':
        this.logger.warn(UNKNOWN_PAYMENT_REFERENCE(reference));
        return;
      case 'already_paid':
        return;
      case 'paid_cancelled_order':
        await this.escalate(outcome.leadId, PAID_CANCELLED_ORDER_REASON);
        return;
      case 'amount_mismatch':
        await this.escalate(outcome.leadId, AMOUNT_MISMATCH_REASON);
        return;
      case 'paid':
        this.logger.log(paymentRecorded(reference, outcome.leadId));
        if (!outcome.stockOk) {
          await this.escalate(
            outcome.leadId,
            OUT_OF_STOCK_AFTER_PAYMENT_REASON,
          );
          return;
        }
        await this.notifyCustomer(outcome.leadId, paymentConfirmation(outcome));
    }
  }

  private async escalate(leadId: string, reason: string) {
    await this.escalationService.escalate(leadId, reason);
    await this.notifyCustomer(leadId, PAYMENT_NEEDS_REVIEW_REPLY);
  }

  private async notifyCustomer(leadId: string, text: string) {
    const message = await this.messagesService.createReply(leadId, text, []);
    await this.outboundQueue.add(
      OUTBOUND_JOB_NAME,
      { messageId: message.id },
      { jobId: message.id },
    );
  }
}
