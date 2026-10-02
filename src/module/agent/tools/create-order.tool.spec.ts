import { describe, expect, it } from 'bun:test';
import { OrderRuleError } from '../../orders/order-rule.error';
import type { OrdersService } from '../../orders/orders.service';
import { CreateOrderTool } from './create-order.tool';
import { ToolInputError } from './tool-input.error';

const CONTEXT = { leadId: 'lead-1', customerId: 'customer-1' };

describe('CreateOrderTool', () => {
  it('uses lead and customer from context, never from model arguments', async () => {
    let received: Record<string, unknown> = {};
    const ordersService = {
      createForLead: async (input: Record<string, unknown>) => {
        received = input;
        return { orderId: 'order-1' };
      },
    } as unknown as OrdersService;

    await new CreateOrderTool(ordersService).execute(
      { productId: 'product-1', quantity: 2, customerId: 'someone-else' },
      CONTEXT,
    );

    expect(received).toMatchObject({
      leadId: 'lead-1',
      customerId: 'customer-1',
      productId: 'product-1',
      quantity: 2,
    });
  });

  it('turns order rule failures into messages the model can act on', async () => {
    const ordersService = {
      createForLead: async () => {
        throw new OrderRuleError('Ask for their email');
      },
    } as unknown as OrdersService;

    await expect(
      new CreateOrderTool(ordersService).execute(
        { productId: 'product-1', quantity: 1 },
        CONTEXT,
      ),
    ).rejects.toThrow(new ToolInputError('Ask for their email'));
  });
});
