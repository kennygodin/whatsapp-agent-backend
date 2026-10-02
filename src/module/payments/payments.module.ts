import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { AlertsModule } from '../alerts/alerts.module';
import { MessagesModule } from '../messages/messages.module';
import { OrdersModule } from '../orders/orders.module';
import { PaystackModule } from '../paystack/paystack.module';
import { PaymentsController } from './payments.controller';
import { PaymentsProcessor } from './payments.processor';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.PAYMENTS },
      { name: QUEUES.WHATSAPP_OUTBOUND },
    ),
    AlertsModule,
    MessagesModule,
    OrdersModule,
    PaystackModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsProcessor],
})
export class PaymentsModule {}
