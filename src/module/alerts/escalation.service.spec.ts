import { describe, expect, it } from 'bun:test';
import type { Queue } from 'bullmq';
import type { LeadsService } from '../leads/leads.service';
import { ALERT_CHANNELS } from './alerts.constants';
import { EscalationService } from './escalation.service';
import type { EscalationAlertJob } from './interfaces/escalation-alert-job.interface';

const ESCALATED_AT = new Date('2026-10-02T10:00:00Z');

function build(paused: boolean) {
  const added: { name: string; data: EscalationAlertJob; jobId?: string }[] =
    [];
  const leadsService = {
    pauseForEscalation: async () =>
      paused
        ? {
            lead: { customer: { name: 'Ada', phone: '+2348000000001' } },
            escalatedAt: ESCALATED_AT,
          }
        : null,
  } as unknown as LeadsService;
  const queue = {
    add: async (
      name: string,
      data: EscalationAlertJob,
      opts?: { jobId?: string },
    ) => {
      added.push({ name, data, jobId: opts?.jobId });
    },
  } as unknown as Queue<EscalationAlertJob>;
  return { service: new EscalationService(leadsService, queue), added };
}

describe('EscalationService', () => {
  it('pauses the lead and queues one alert per channel', async () => {
    const { service, added } = build(true);

    expect(await service.escalate('lead-1', 'Wants a refund')).toBe(true);
    expect(added.map((job) => job.name).sort()).toEqual(
      Object.values(ALERT_CHANNELS).sort(),
    );
    expect(added[0].data).toEqual({
      leadId: 'lead-1',
      customerPhone: '+2348000000001',
      customerName: 'Ada',
      reason: 'Wants a refund',
      escalatedAt: ESCALATED_AT.toISOString(),
    });
    expect(new Set(added.map((job) => job.jobId)).size).toBe(added.length);
  });

  it('sends no alerts when the lead was already paused', async () => {
    const { service, added } = build(false);

    expect(await service.escalate('lead-1', 'Wants a refund')).toBe(false);
    expect(added).toHaveLength(0);
  });
});
