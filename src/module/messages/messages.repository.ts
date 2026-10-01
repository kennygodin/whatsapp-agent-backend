import { Injectable } from '@nestjs/common';
import { MessageDirection, MessageStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createInbound(data: {
    leadId: string;
    body: string;
    hasMedia: boolean;
    twilioSid: string;
  }) {
    return this.prisma.message.create({
      data: {
        ...data,
        direction: MessageDirection.inbound,
        status: MessageStatus.received,
      },
    });
  }

  findUnprocessedInbound(leadId: string) {
    return this.prisma.message.findMany({
      where: {
        leadId,
        direction: MessageDirection.inbound,
        processedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRecent(leadId: string, limit: number) {
    return this.prisma.message.findMany({
      where: {
        leadId,
        NOT: {
          direction: MessageDirection.outbound,
          status: MessageStatus.failed,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  markProcessed(ids: string[]) {
    return this.prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { processedAt: new Date() },
    });
  }

  async createOutboundAndMarkProcessed(
    leadId: string,
    body: string,
    processedIds: string[],
  ) {
    const [reply] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          leadId,
          body,
          direction: MessageDirection.outbound,
          status: MessageStatus.queued,
        },
      }),
      this.prisma.message.updateMany({
        where: { id: { in: processedIds } },
        data: { processedAt: new Date() },
      }),
    ]);
    return reply;
  }

  findWithCustomerPhone(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        lead: { select: { customer: { select: { phone: true } } } },
      },
    });
  }

  markSent(id: string, twilioSid: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: MessageStatus.sent, twilioSid },
    });
  }

  markFailed(id: string, errorCode: string | null) {
    return this.prisma.message.update({
      where: { id },
      data: { status: MessageStatus.failed, errorCode },
    });
  }
}
