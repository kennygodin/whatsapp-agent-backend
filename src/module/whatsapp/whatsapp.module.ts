import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { ConversationTurnProcessor } from './processors/conversation-turn.processor';
import { IntakeProcessor } from './processors/intake.processor';
import { OutboundProcessor } from './processors/outbound.processor';
import { TwilioService } from './twilio.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.WHATSAPP_INTAKE },
      { name: QUEUES.CONVERSATION_TURN },
      { name: QUEUES.WHATSAPP_OUTBOUND },
    ),
    LeadsModule,
    MessagesModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    TwilioService,
    IntakeProcessor,
    ConversationTurnProcessor,
    OutboundProcessor,
  ],
})
export class WhatsappModule {}
