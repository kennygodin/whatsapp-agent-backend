import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import { LeadsService } from '../leads/leads.service';
import { MessagesService } from '../messages/messages.service';
import { OrdersService } from '../orders/orders.service';
import type { OutboundMessageJob } from '../whatsapp/interfaces/outbound-message-job.interface';
import { OUTBOUND_JOB_NAME } from '../whatsapp/whatsapp.constants';
import {
  DROP_OFF_AFTER_MS,
  LIFECYCLE_BATCH_SIZE,
  PAYMENT_NUDGE_AFTER_MS,
  WHATSAPP_WINDOW_SAFE_MS,
  paymentNudge,
} from './lifecycle.constants';

@Injectable()
export class LifecycleService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly leadsService: LeadsService,
    private readonly messagesService: MessagesService,
    @InjectQueue(QUEUES.WHATSAPP_OUTBOUND)
    private readonly outboundQueue: Queue<OutboundMessageJob>,
  ) {}

  async sendPaymentNudges(now: Date = new Date()): Promise<number> {
    const candidates = await this.ordersService.findNudgeCandidates({
      linkSentBefore: new Date(now.getTime() - PAYMENT_NUDGE_AFTER_MS),
      lastInboundAfter: new Date(now.getTime() - WHATSAPP_WINDOW_SAFE_MS),
      limit: LIFECYCLE_BATCH_SIZE,
    });

    let sent = 0;
    for (const order of candidates) {
      if (!(await this.ordersService.claimNudge(order.orderId))) {
        continue;
      }
      const message = await this.messagesService.createReply(
        order.leadId,
        paymentNudge(order),
        [],
      );
      await this.outboundQueue.add(
        OUTBOUND_JOB_NAME,
        { messageId: message.id },
        { jobId: message.id },
      );
      sent += 1;
    }
    return sent;
  }

  dropInactiveLeads(now: Date = new Date()): Promise<number> {
    return this.leadsService.dropInactive(
      new Date(now.getTime() - DROP_OFF_AFTER_MS),
      LIFECYCLE_BATCH_SIZE,
    );
  }
}
