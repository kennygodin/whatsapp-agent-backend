import { Injectable } from '@nestjs/common';
import { OrderRuleError } from '../../orders/order-rule.error';
import { OrdersService } from '../../orders/orders.service';
import type { ToolDefinition } from '../llm/llm.types';
import type { AgentTool, ToolContext } from './agent-tool.interface';
import { ToolInputError } from './tool-input.error';
import {
  CREATE_ORDER_DESCRIPTION,
  CREATE_ORDER_TOOL_NAME,
  EMAIL_DESCRIPTION,
  ORDER_ARGUMENTS_INVALID,
  PRODUCT_ID_DESCRIPTION,
  QUANTITY_DESCRIPTION,
} from '../agent.constants';

@Injectable()
export class CreateOrderTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: CREATE_ORDER_TOOL_NAME,
    description: CREATE_ORDER_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: PRODUCT_ID_DESCRIPTION },
        quantity: { type: 'integer', description: QUANTITY_DESCRIPTION },
        email: { type: 'string', description: EMAIL_DESCRIPTION },
      },
      required: ['productId', 'quantity'],
    },
  };

  constructor(private readonly ordersService: OrdersService) {}

  async execute(args: Record<string, unknown>, context: ToolContext) {
    const { productId, quantity, email } = args;
    if (typeof productId !== 'string' || typeof quantity !== 'number') {
      throw new ToolInputError(ORDER_ARGUMENTS_INVALID);
    }

    try {
      return await this.ordersService.createForLead({
        leadId: context.leadId,
        customerId: context.customerId,
        productId,
        quantity,
        email: typeof email === 'string' ? email : undefined,
      });
    } catch (error) {
      if (error instanceof OrderRuleError) {
        throw new ToolInputError(error.message);
      }
      throw error;
    }
  }
}
