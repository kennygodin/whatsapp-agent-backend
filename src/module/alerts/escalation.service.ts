import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import { LeadsService } from '../leads/leads.service';
import type { EscalationAlertJob } from './interfaces/escalation-alert-job.interface';
import { ALERT_CHANNELS, escalationRecorded } from './alerts.constants';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly leadsService: LeadsService,
    @InjectQueue(QUEUES.ALERTS)
    private readonly alertsQueue: Queue<EscalationAlertJob>,
  ) {}

  async escalate(leadId: string, reason: string): Promise<boolean> {
    const paused = await this.leadsService.pauseForEscalation(leadId, reason);
    if (!paused) {
      return false;
    }

    const { lead, escalatedAt } = paused;
    const alert: EscalationAlertJob = {
      leadId,
      customerPhone: lead.customer.phone,
      customerName: lead.customer.name,
      reason,
      escalatedAt: escalatedAt.toISOString(),
    };

    await Promise.all(
      Object.values(ALERT_CHANNELS).map((channel) =>
        this.alertsQueue.add(channel, alert, {
          jobId: `${channel}-${leadId}-${escalatedAt.getTime()}`,
        }),
      ),
    );
    this.logger.warn(escalationRecorded(leadId, reason));
    return true;
  }
}
