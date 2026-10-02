import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { OrderStatus, PrismaClient } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { OrdersRepository } from './orders.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('OrdersRepository against Postgres', () => {
  const suffix = `${Date.now()}`;
  let prisma: PrismaClient;
  let repository: OrdersRepository;
  let leadId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    repository = new OrdersRepository(prisma as unknown as PrismaService);

    const product = await prisma.product.create({
      data: {
        sku: `TEST-${suffix}`,
        name: 'Integration test product',
        description: 'Created by orders.repository.integration.spec.ts',
        price: 1000,
        stock: 5,
      },
    });
    const customer = await prisma.customer.create({
      data: { phone: `+999${suffix}`, leads: { create: {} } },
      include: { leads: true },
    });
    productId = product.id;
    customerId = customer.id;
    leadId = customer.leads[0].id;
  });

  afterAll(async () => {
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.$disconnect();
  });

  const orderFor = (quantity: number) => ({
    leadId,
    customerId,
    productId,
    quantity,
    unitPrice: 1000,
    totalAmount: 1000 * quantity,
  });

  const pendingCount = () =>
    prisma.order.count({ where: { leadId, status: OrderStatus.pending } });

  it('two simultaneous identical requests create exactly one order', async () => {
    const [first, second] = await Promise.all([
      repository.replacePendingOrder(orderFor(2)),
      repository.replacePendingOrder(orderFor(2)),
    ]);

    expect(first.id).toBe(second.id);
    expect(await pendingCount()).toBe(1);
    expect(await prisma.order.count({ where: { leadId } })).toBe(1);
  });

  it('a different quantity cancels the old order and creates a new one', async () => {
    const replaced = await repository.replacePendingOrder(orderFor(3));

    expect(replaced.quantity).toBe(3);
    expect(await pendingCount()).toBe(1);
    expect(
      await prisma.order.count({
        where: { leadId, status: OrderStatus.cancelled },
      }),
    ).toBe(1);
  });
});
