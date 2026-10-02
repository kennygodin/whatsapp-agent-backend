import { Injectable } from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/client';
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

  findRecentForCustomer(customerId: string, limit: number) {
    return this.prisma.order.findMany({
      where: { lead: { customerId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { product: { select: { name: true } } },
    });
  }
}
