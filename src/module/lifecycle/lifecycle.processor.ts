import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { QUEUES } from '../../common/queue.constants';
import { LifecycleService } from './lifecycle.service';
import {
  LIFECYCLE_JOBS,
  LIFECYCLE_SCAN_EVERY_MS,
  leadsDropped,
  nudgesSent,
  unknownLifecycleJob,
} from './lifecycle.constants';

@Processor(QUEUES.LIFECYCLE)
export class LifecycleProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(LifecycleProcessor.name);

  constructor(
    private readonly lifecycleService: LifecycleService,
    @InjectQueue(QUEUES.LIFECYCLE)
    private readonly lifecycleQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    for (const name of Object.values(LIFECYCLE_JOBS)) {
      await this.lifecycleQueue.upsertJobScheduler(
        name,
        { every: LIFECYCLE_SCAN_EVERY_MS },
        { name },
      );
    }
  }

  async process(job: Job) {
    if (job.name === LIFECYCLE_JOBS.PAYMENT_NUDGES) {
      const sent = await this.lifecycleService.sendPaymentNudges();
      if (sent > 0) {
        this.logger.log(nudgesSent(sent));
      }
      return;
    }

    if (job.name === LIFECYCLE_JOBS.DROP_OFFS) {
      const dropped = await this.lifecycleService.dropInactiveLeads();
      if (dropped > 0) {
        this.logger.log(leadsDropped(dropped));
      }
      return;
    }

    throw new UnrecoverableError(unknownLifecycleJob(job.name));
  }
}
