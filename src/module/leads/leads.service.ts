import { Injectable } from '@nestjs/common';
import { BotMode, Lead, LeadStage } from '../../generated/prisma/client';
import { CustomersRepository } from './customers.repository';
import { LeadsRepository } from './leads.repository';
import {
  CLOSED_LEAD_STAGES,
  CONVERTIBLE_STAGES,
  CUSTOMER_NOT_FOUND,
  LEAD_NOT_FOUND,
  MESSAGE_PREVIEW_LENGTH,
  OPEN_LEAD_STAGES,
  ORDER_START_STAGES,
} from './leads.constants';

@Injectable()
export class LeadsService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async findOrOpenLead(phone: string, profileName?: string) {
    const customer = await this.customersRepository.upsertByPhone(
      phone,
      profileName,
    );
    const openLead = await this.leadsRepository.findOpenByCustomer(customer.id);
    if (openLead) {
      return { lead: openLead, isNew: false };
    }

    const lead = await this.leadsRepository.createWithInitialTransition(
      customer.id,
    );
    return { lead, isNew: true };
  }

  async registerInbound(lead: Lead, isNew: boolean, receivedAt: Date) {
    await this.leadsRepository.updateLastInboundAt(lead.id, receivedAt);
    if (!isNew && lead.stage === LeadStage.new) {
      await this.transitionStage(lead.id, LeadStage.new, LeadStage.engaged);
    }
  }

  async getById(id: string) {
    const lead = await this.leadsRepository.findById(id);
    if (!lead) {
      throw new Error(LEAD_NOT_FOUND);
    }
    return lead;
  }

  async pauseForEscalation(id: string, reason: string) {
    const escalatedAt = new Date();
    const { count } = await this.leadsRepository.pauseForEscalation(
      id,
      reason,
      escalatedAt,
    );
    if (count === 0) {
      return null;
    }

    const lead = await this.leadsRepository.findWithCustomerContact(id);
    if (!lead) {
      throw new Error(LEAD_NOT_FOUND);
    }
    return { lead, escalatedAt };
  }

  async getCustomer(id: string) {
    const customer = await this.customersRepository.findById(id);
    if (!customer) {
      throw new Error(CUSTOMER_NOT_FOUND);
    }
    return customer;
  }

  async markOrderStarted(id: string) {
    const lead = await this.getById(id);
    if (ORDER_START_STAGES.includes(lead.stage)) {
      await this.transitionStage(id, lead.stage, LeadStage.order_started);
    }
  }

  async markConverted(id: string) {
    const lead = await this.getById(id);
    if (CONVERTIBLE_STAGES.includes(lead.stage)) {
      await this.transitionStage(id, lead.stage, LeadStage.converted);
    }
  }

  async dropInactive(lastInboundBefore: Date, limit: number) {
    const leads = await this.leadsRepository.findInactiveOpen(
      OPEN_LEAD_STAGES,
      lastInboundBefore,
      limit,
    );
    let dropped = 0;
    for (const lead of leads) {
      if (
        await this.transitionStage(lead.id, lead.stage, LeadStage.dropped_off)
      ) {
        dropped += 1;
      }
    }
    return dropped;
  }

  async reachedStagesSince(since: Date): Promise<Record<LeadStage, number>> {
    const rows = await this.leadsRepository.countReachedStagesSince(since);
    const counts = Object.fromEntries(
      Object.values(LeadStage).map((stage) => [stage, 0]),
    ) as Record<LeadStage, number>;
    for (const row of rows) {
      counts[row.stage] = row.leads;
    }
    return counts;
  }

  countPaused() {
    return this.leadsRepository.countPaused();
  }

  async listConversations(filter: {
    stage?: LeadStage;
    botMode?: BotMode;
    limit: number;
  }) {
    const leads = await this.leadsRepository.findConversations(filter);
    return leads.map((lead) => {
      const [lastMessage] = lead.messages;
      return {
        leadId: lead.id,
        customerName: lead.customer.name,
        phone: lead.customer.phone,
        stage: lead.stage,
        botMode: lead.botMode,
        escalationReason: lead.escalationReason,
        lastCustomerMessageAt: lead.lastInboundAt.toISOString(),
        lastMessage: lastMessage
          ? {
              from: lastMessage.direction,
              text: lastMessage.body.slice(0, MESSAGE_PREVIEW_LENGTH),
              at: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    });
  }

  async resumeBot(id: string): Promise<boolean> {
    const { count } = await this.leadsRepository.resumeBot(id);
    return count > 0;
  }

  transitionStage(id: string, from: LeadStage, to: LeadStage) {
    const closedAt = CLOSED_LEAD_STAGES.includes(to) ? new Date() : undefined;
    return this.leadsRepository.transitionStage(id, from, to, closedAt);
  }
}
