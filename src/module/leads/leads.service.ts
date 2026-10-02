import { Injectable } from '@nestjs/common';
import { Lead, LeadStage } from '../../generated/prisma/client';
import { CustomersRepository } from './customers.repository';
import { LeadsRepository } from './leads.repository';
import { CLOSED_LEAD_STAGES, LEAD_NOT_FOUND } from './leads.constants';

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

  transitionStage(id: string, from: LeadStage, to: LeadStage) {
    const closedAt = CLOSED_LEAD_STAGES.includes(to) ? new Date() : undefined;
    return this.leadsRepository.transitionStage(id, from, to, closedAt);
  }
}
