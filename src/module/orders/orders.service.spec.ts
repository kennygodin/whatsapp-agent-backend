import { describe, expect, it } from 'bun:test';
import type { LeadsService } from '../leads/leads.service';
import type { ProductsService } from '../products/products.service';
import { OrderRuleError } from './order-rule.error';
import type { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  PRODUCT_NOT_AVAILABLE,
  QUANTITY_INVALID,
  notEnoughStock,
} from './orders.constants';

const POWER_BANK = {
  id: 'product-1',
  name: '20,000mAh Power Bank',
  price: 2500000,
  stock: 20,
};

function build(
  options: {
    customerEmail?: string | null;
    product?: typeof POWER_BANK | null;
  } = {},
) {
  const created: Record<string, unknown>[] = [];
  const startedLeads: string[] = [];

  const ordersRepository = {
    replacePendingOrder: async (data: Record<string, unknown>) => {
      created.push(data);
      return {
        id: 'order-1',
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        status: 'pending',
      };
    },
  } as unknown as OrdersRepository;
  const productsService = {
    findActiveById: async () =>
      options.product === undefined ? POWER_BANK : options.product,
  } as unknown as ProductsService;
  const leadsService = {
    getCustomer: async () => ({
      email:
        options.customerEmail === undefined
          ? 'ada@example.com'
          : options.customerEmail,
    }),
    markOrderStarted: async (leadId: string) => {
      startedLeads.push(leadId);
    },
  } as unknown as LeadsService;

  return {
    service: new OrdersService(ordersRepository, productsService, leadsService),
    created,
    startedLeads,
  };
}

const input = {
  leadId: 'lead-1',
  customerId: 'customer-1',
  productId: 'product-1',
};

describe('OrdersService.createForLead', () => {
  it('prices the order on the server and moves the lead to order_started', async () => {
    const { service, created, startedLeads } = build();

    const order = await service.createForLead({ ...input, quantity: 2 });

    expect(created[0]).toMatchObject({
      unitPrice: 2500000,
      totalAmount: 5000000,
    });
    expect(order).toMatchObject({
      total: '₦50,000',
      unitPrice: '₦25,000',
      quantity: 2,
    });
    expect(startedLeads).toEqual(['lead-1']);
  });

  it.each([0, -1, 1.5, 11])('rejects quantity %p', async (quantity) => {
    const { service } = build();
    await expect(service.createForLead({ ...input, quantity })).rejects.toThrow(
      new OrderRuleError(QUANTITY_INVALID),
    );
  });

  it('rejects products that are missing or inactive', async () => {
    const { service } = build({ product: null });
    await expect(
      service.createForLead({ ...input, quantity: 1 }),
    ).rejects.toThrow(new OrderRuleError(PRODUCT_NOT_AVAILABLE));
  });

  it('rejects quantities above stock without revealing the stock count', async () => {
    const { service } = build({ product: { ...POWER_BANK, stock: 1 } });
    await expect(
      service.createForLead({ ...input, quantity: 2 }),
    ).rejects.toThrow(new OrderRuleError(notEnoughStock(POWER_BANK.name)));
  });

  it('asks for an email when the customer has none', async () => {
    const { service, created } = build({ customerEmail: null });
    await expect(
      service.createForLead({ ...input, quantity: 1 }),
    ).rejects.toThrow(new OrderRuleError(EMAIL_REQUIRED));
    expect(created).toHaveLength(0);
  });

  it('saves a new email, normalised', async () => {
    const { service, created } = build({ customerEmail: null });
    await service.createForLead({
      ...input,
      quantity: 1,
      email: '  Ada@Example.COM ',
    });
    expect(created[0].email).toBe('ada@example.com');
  });

  it('rejects an invalid email', async () => {
    const { service } = build({ customerEmail: null });
    await expect(
      service.createForLead({ ...input, quantity: 1, email: 'not-an-email' }),
    ).rejects.toThrow(new OrderRuleError(EMAIL_INVALID));
  });

  it('does not resend an email the customer already has', async () => {
    const { service, created } = build();
    await service.createForLead({
      ...input,
      quantity: 1,
      email: 'ADA@example.com',
    });
    expect(created[0].email).toBeUndefined();
  });
});
