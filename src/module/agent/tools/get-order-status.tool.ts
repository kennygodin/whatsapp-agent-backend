import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import type { ToolDefinition } from '../llm/llm.types';
import type { AgentTool, ToolContext } from './agent-tool.interface';
import {
  GET_ORDER_STATUS_DESCRIPTION,
  GET_ORDER_STATUS_TOOL_NAME,
} from '../agent.constants';

@Injectable()
export class GetOrderStatusTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: GET_ORDER_STATUS_TOOL_NAME,
    description: GET_ORDER_STATUS_DESCRIPTION,
    parameters: { type: 'object', properties: {} },
  };

  constructor(private readonly ordersService: OrdersService) {}

  async execute(_args: Record<string, unknown>, context: ToolContext) {
    return {
      orders: await this.ordersService.recentForCustomer(context.customerId),
    };
  }
}
