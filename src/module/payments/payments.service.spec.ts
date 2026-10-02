import { describe, expect, it } from 'bun:test';
import type { Queue } from 'bullmq';
import type { PaymentJob } from './interfaces/payment-job.interface';
import { PaymentsService } from './payments.service';

function build() {
  const added: { name: string; data: PaymentJob; jobId?: string }[] = [];
  const queue = {
    add: async (name: string, data: PaymentJob, opts?: { jobId?: string }) => {
      added.push({ name, data, jobId: opts?.jobId });
    },
  } as unknown as Queue<PaymentJob>;
  return { service: new PaymentsService(queue), added };
}

describe('PaymentsService.handleWebhook', () => {
  it('queues charge.success once per reference', async () => {
    const { service, added } = build();

    await service.handleWebhook({
      event: 'charge.success',
      data: { reference: 'ord-1-123' },
    });

    expect(added).toEqual([
      {
        name: 'confirm-payment',
        data: { reference: 'ord-1-123' },
        jobId: 'paystack-ord-1-123',
      },
    ]);
  });

  it.each([
    [{ event: 'transfer.success', data: { reference: 'x' } }],
    [{ event: 'charge.success', data: {} }],
    [{ event: 'charge.success' }],
  ])('ignores events it does not handle: %o', async (payload) => {
    const { service, added } = build();
    await service.handleWebhook(payload);
    expect(added).toHaveLength(0);
  });
});
