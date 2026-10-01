import { Injectable } from '@nestjs/common';
import { LeadStage } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CLOSED_LEAD_STAGES } from './leads.constants';

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
