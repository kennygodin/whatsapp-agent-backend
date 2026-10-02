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
    });
  }

  createReplacingPending(data: {
    leadId: string;
    customerId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    email?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
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
