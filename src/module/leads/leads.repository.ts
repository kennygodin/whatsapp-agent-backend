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

  findInactiveOpen(
    stages: LeadStage[],
    lastInboundBefore: Date,
    limit: number,
  ) {
    return this.prisma.lead.findMany({
      where: {
        stage: { in: stages },
        botMode: BotMode.active,
        lastInboundAt: { lt: lastInboundBefore },
      },
      orderBy: { lastInboundAt: 'asc' },
      take: limit,
      select: { id: true, stage: true },
    });
  }

  countReachedStagesSince(since: Date) {
    return this.prisma.$queryRaw<{ stage: LeadStage; leads: number }[]>`
      SELECT t."toStage" AS stage, COUNT(DISTINCT t."leadId")::int AS leads
      FROM stage_transitions t
      JOIN leads l ON l.id = t."leadId"
      WHERE l."createdAt" >= ${since}
      GROUP BY t."toStage"
    `;
  }

  countPaused() {
    return this.prisma.lead.count({ where: { botMode: BotMode.paused } });
  }

  findConversations(filter: {
    stage?: LeadStage;
    botMode?: BotMode;
    limit: number;
  }) {
    return this.prisma.lead.findMany({
      where: { stage: filter.stage, botMode: filter.botMode },
      orderBy: { lastInboundAt: 'desc' },
      take: filter.limit,
      include: {
        customer: { select: { name: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { direction: true, body: true, createdAt: true },
        },
      },
    });
  }

  resumeBot(id: string) {
    return this.prisma.lead.updateMany({
      where: { id, botMode: BotMode.paused },
      data: { botMode: BotMode.active },
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
