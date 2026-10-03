import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { OrdersService } from '../../orders/orders.service';
import { READ_ONLY, type AdminTool } from './admin-tool.interface';
import { GET_LEAD_ORDERS } from '../mcp.constants';

const inputSchema = z.object({ leadId: z.uuid() });

@Injectable()
export class GetLeadOrdersTool implements AdminTool<typeof inputSchema> {
  readonly name = GET_LEAD_ORDERS.name;
  readonly title = GET_LEAD_ORDERS.title;
  readonly description = GET_LEAD_ORDERS.description;
  readonly inputSchema = inputSchema;
  readonly annotations = READ_ONLY;

  constructor(private readonly ordersService: OrdersService) {}

  async execute({ leadId }: z.infer<typeof inputSchema>) {
    return { orders: await this.ordersService.forLead(leadId) };
  }
}
