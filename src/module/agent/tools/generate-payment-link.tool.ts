import { Injectable } from '@nestjs/common';
import { OrderRuleError } from '../../orders/order-rule.error';
import { OrdersService } from '../../orders/orders.service';
import type { ToolDefinition } from '../llm/llm.types';
import type { AgentTool, ToolContext } from './agent-tool.interface';
import { ToolInputError } from './tool-input.error';
import {
  GENERATE_PAYMENT_LINK_DESCRIPTION,
  GENERATE_PAYMENT_LINK_TOOL_NAME,
} from '../agent.constants';

@Injectable()
export class GeneratePaymentLinkTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: GENERATE_PAYMENT_LINK_TOOL_NAME,
    description: GENERATE_PAYMENT_LINK_DESCRIPTION,
    parameters: { type: 'object', properties: {} },
  };

  constructor(private readonly ordersService: OrdersService) {}

  async execute(_args: Record<string, unknown>, context: ToolContext) {
    try {
      return await this.ordersService.createPaymentLink({
        leadId: context.leadId,
        customerId: context.customerId,
      });
    } catch (error) {
      if (error instanceof OrderRuleError) {
        throw new ToolInputError(error.message);
      }
      throw error;
    }
  }
}
