import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../common/queue.constants';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { ConversationTurnProcessor } from './processors/conversation-turn.processor';
import { IntakeProcessor } from './processors/intake.processor';
import { OutboundProcessor } from './processors/outbound.processor';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AgentModule } from '../agent/agent.module';
import { TwilioModule } from '../twilio/twilio.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.WHATSAPP_INTAKE },
      { name: QUEUES.CONVERSATION_TURN },
      { name: QUEUES.WHATSAPP_OUTBOUND },
    ),
    AgentModule,
    AlertsModule,
    LeadsModule,
    MessagesModule,
    TwilioModule,
  ],

  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    IntakeProcessor,
    ConversationTurnProcessor,
    OutboundProcessor,
  ],
})
export class WhatsappModule {}
