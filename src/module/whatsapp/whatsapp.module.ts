import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.WHATSAPP_INTAKE })],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
