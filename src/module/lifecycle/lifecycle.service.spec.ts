import { describe, expect, it } from 'bun:test';
import type { Queue } from 'bullmq';
import type { LeadsService } from '../leads/leads.service';
import type { MessagesService } from '../messages/messages.service';
import type { OrdersService } from '../orders/orders.service';
import type { OutboundMessageJob } from '../whatsapp/interfaces/outbound-message-job.interface';
import { LifecycleService } from './lifecycle.service';
import {
  DROP_OFF_AFTER_MS,
  LIFECYCLE_BATCH_SIZE,
  PAYMENT_NUDGE_AFTER_MS,
  WHATSAPP_WINDOW_SAFE_MS,
} from './lifecycle.constants';

const NOW = new Date('2026-10-03T12:00:00Z');
const candidate = (orderId: string) => ({
  orderId,
  leadId: `lead-${orderId}`,
  customerName: 'Ada',
  product: '20,000mAh Power Bank',
  quantity: 2,
  total: '₦50,000',
  paymentUrl: `https://checkout.paystack.com/${orderId}`,
});

function build(options: { claimable?: string[] } = {}) {
  const queries: Record<string, unknown>[] = [];
  const replies: { leadId: string; text: string }[] = [];
  const queued: string[] = [];
  const dropCalls: { before: Date; limit: number }[] = [];

  const ordersService = {
    findNudgeCandidates: async (input: Record<string, unknown>) => {
      queries.push(input);
      return [candidate('a'), candidate('b')];
    },
    claimNudge: async (orderId: string) =>
      (options.claimable ?? ['a', 'b']).includes(orderId),
  } as unknown as OrdersService;
  const leadsService = {
    dropInactive: async (before: Date, limit: number) => {
      dropCalls.push({ before, limit });
      return 3;
    },
  } as unknown as LeadsService;
  const messagesService = {
    createReply: async (leadId: string, text: string) => {
      replies.push({ leadId, text });
      return { id: `msg-${leadId}` };
    },
  } as unknown as MessagesService;
  const queue = {
    add: async (_name: string, data: OutboundMessageJob) => {
      queued.push(data.messageId);
    },
  } as unknown as Queue<OutboundMessageJob>;

  return {
    service: new LifecycleService(
      ordersService,
      leadsService,
      messagesService,
      queue,
    ),
    queries,
    replies,
    queued,
    dropCalls,
  };
}

describe('LifecycleService.sendPaymentNudges', () => {
  it('only looks at links older than the nudge delay, inside the WhatsApp window', async () => {
    const { service, queries } = build();
    await service.sendPaymentNudges(NOW);

    expect(queries[0]).toEqual({
      linkSentBefore: new Date(NOW.getTime() - PAYMENT_NUDGE_AFTER_MS),
      lastInboundAfter: new Date(NOW.getTime() - WHATSAPP_WINDOW_SAFE_MS),
      limit: LIFECYCLE_BATCH_SIZE,
    });
  });

  it('sends the same payment link in a reminder and queues it', async () => {
    const { service, replies, queued } = build();

    expect(await service.sendPaymentNudges(NOW)).toBe(2);
    expect(replies[0].text).toContain('https://checkout.paystack.com/a');
    expect(replies[0].text).toContain('₦50,000');
    expect(queued).toEqual(['msg-lead-a', 'msg-lead-b']);
  });

  it('skips an order another run already claimed, so nobody is nudged twice', async () => {
    const { service, replies } = build({ claimable: ['b'] });

    expect(await service.sendPaymentNudges(NOW)).toBe(1);
    expect(replies.map((reply) => reply.leadId)).toEqual(['lead-b']);
  });
});

describe('LifecycleService.dropInactiveLeads', () => {
  it('drops leads quiet for longer than the drop-off delay', async () => {
    const { service, dropCalls } = build();

    expect(await service.dropInactiveLeads(NOW)).toBe(3);
    expect(dropCalls[0]).toEqual({
      before: new Date(NOW.getTime() - DROP_OFF_AFTER_MS),
      limit: LIFECYCLE_BATCH_SIZE,
    });
  });
});
