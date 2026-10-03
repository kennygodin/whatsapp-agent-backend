import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { OrdersModule } from '../orders/orders.module';
import { LifecycleProcessor } from './lifecycle.processor';
import { LifecycleService } from './lifecycle.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.LIFECYCLE },
      { name: QUEUES.WHATSAPP_OUTBOUND },
    ),
    LeadsModule,
    MessagesModule,
    OrdersModule,
  ],
  providers: [LifecycleService, LifecycleProcessor],
})
export class LifecycleModule {}
