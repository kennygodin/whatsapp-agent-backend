import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { LeadsModule } from '../leads/leads.module';
import { MailModule } from '../mail/mail.module';
import { TwilioModule } from '../twilio/twilio.module';
import { AlertsProcessor } from './alerts.processor';
import { EscalationService } from './escalation.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.ALERTS }),
    LeadsModule,
    MailModule,
    TwilioModule,
  ],
  providers: [EscalationService, AlertsProcessor],
  exports: [EscalationService],
})
export class AlertsModule {}
