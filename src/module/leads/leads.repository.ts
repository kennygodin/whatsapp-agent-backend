import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CLOSED_LEAD_STAGES } from './leads.constants';
import { BotMode, LeadStage } from '../../generated/prisma/client';

@Injectable()
export class LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { name: true } } },
    });
  }

  findOpenByCustomer(customerId: string) {
    return this.prisma.lead.findFirst({
      where: { customerId, stage: { notIn: CLOSED_LEAD_STAGES } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createWithInitialTransition(customerId: string) {
    return this.prisma.lead.create({
      data: {
        customerId,
        transitions: { create: { toStage: LeadStage.new } },
      },
    });
  }

  pauseForEscalation(id: string, reason: string, escalatedAt: Date) {
    return this.prisma.lead.updateMany({
      where: { id, botMode: BotMode.active },
      data: { botMode: BotMode.paused, escalatedAt, escalationReason: reason },
    });
  }

  findWithCustomerContact(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { name: true, phone: true } } },
    });
  }

  updateLastInboundAt(id: string, at: Date) {
    return this.prisma.lead.update({
      where: { id },
      data: { lastInboundAt: at },
    });
  }

  transitionStage(id: string, from: LeadStage, to: LeadStage, closedAt?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.lead.updateMany({
        where: { id, stage: from },
        data: { stage: to, closedAt },
      });
      if (count === 0) {
        return false;
      }

      await tx.stageTransition.create({
        data: { leadId: id, fromStage: from, toStage: to },
      });
      return true;
    });
  }
}
