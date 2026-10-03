import { Injectable } from '@nestjs/common';
import { BotMode, LeadStage, OrderStatus } from '../../generated/prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPendingForLead(leadId: string) {
    return this.prisma.order.findFirst({
      where: { leadId, status: OrderStatus.pending },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    });
  }

  findNudgeCandidates(input: {
    linkSentBefore: Date;
    lastInboundAfter: Date;
    limit: number;
  }) {
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.pending,
        paymentUrl: { not: null },
        paymentLinkSentAt: { lte: input.linkSentBefore },
        nudgedAt: null,
        lead: {
          stage: LeadStage.order_started,
          botMode: BotMode.active,
          lastInboundAt: { gte: input.lastInboundAfter },
        },
      },
      orderBy: { paymentLinkSentAt: 'asc' },
      take: input.limit,
      include: {
        product: { select: { name: true } },
        lead: { select: { customer: { select: { name: true } } } },
      },
    });
  }

  claimNudge(orderId: string) {
    return this.prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.pending, nudgedAt: null },
      data: { nudgedAt: new Date() },
    });
  }

  findByReference(reference: string) {
    return this.prisma.order.findUnique({
      where: { paymentReference: reference },
      include: { product: { select: { name: true } } },
    });
  }

  markPaidAndDecrementStock(data: {
    orderId: string;
    productId: string;
    quantity: number;
    paidAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const paid = await tx.order.updateMany({
        where: { id: data.orderId, status: OrderStatus.pending },
        data: { status: OrderStatus.paid, paidAt: data.paidAt },
      });
      if (paid.count === 0) {
        return { marked: false, stockOk: false };
      }

      const stock = await tx.product.updateMany({
        where: { id: data.productId, stock: { gte: data.quantity } },
        data: { stock: { decrement: data.quantity } },
      });
      return { marked: true, stockOk: stock.count > 0 };
    });
  }

  attachPaymentLink(orderId: string, reference: string, url: string) {
    return this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: OrderStatus.pending,
        paymentReference: null,
      },
      data: { paymentReference: reference, paymentUrl: url },
    });
  }

  replacePendingOrder(data: {
    leadId: string;
    customerId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    email?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM leads WHERE id = ${data.leadId} FOR UPDATE`;

      const pending = await tx.order.findFirst({
        where: { leadId: data.leadId, status: OrderStatus.pending },
        orderBy: { createdAt: 'desc' },
      });
      if (
        pending?.productId === data.productId &&
        pending.quantity === data.quantity &&
        !data.email
      ) {
        return pending;
      }

      await tx.order.updateMany({
        where: { leadId: data.leadId, status: OrderStatus.pending },
        data: { status: OrderStatus.cancelled, cancelledAt: new Date() },
      });

      if (data.email) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { email: data.email },
        });
      }

      return tx.order.create({
        data: {
          leadId: data.leadId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalAmount: data.totalAmount,
        },
      });
    });
  }

  sumPaidSince(since: Date) {
    return this.prisma.order.aggregate({
      where: { status: OrderStatus.paid, paidAt: { gte: since } },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
  }

  findForLead(leadId: string) {
    return this.prisma.order.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    });
  }

  findRecentForCustomer(customerId: string, limit: number) {
    return this.prisma.order.findMany({
      where: { lead: { customerId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { product: { select: { name: true } } },
    });
  }
}
