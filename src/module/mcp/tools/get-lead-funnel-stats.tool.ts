import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LeadStage } from '../../../generated/prisma/client';
import { LeadsService } from '../../leads/leads.service';
import { OrdersService } from '../../orders/orders.service';
import { READ_ONLY, type AdminTool } from './admin-tool.interface';
import {
  DAY_MS,
  DEFAULT_STATS_DAYS,
  GET_LEAD_FUNNEL_STATS,
  MAX_STATS_DAYS,
} from '../mcp.constants';

const inputSchema = z.object({
  days: z
    .number()
    .int()
    .min(1)
    .max(MAX_STATS_DAYS)
    .default(DEFAULT_STATS_DAYS)
    .describe('How many days back to look'),
});

@Injectable()
export class GetLeadFunnelStatsTool implements AdminTool<typeof inputSchema> {
  readonly name = GET_LEAD_FUNNEL_STATS.name;
  readonly title = GET_LEAD_FUNNEL_STATS.title;
  readonly description = GET_LEAD_FUNNEL_STATS.description;
  readonly inputSchema = inputSchema;
  readonly annotations = READ_ONLY;

  constructor(
    private readonly leadsService: LeadsService,
    private readonly ordersService: OrdersService,
  ) {}

  async execute({ days }: z.infer<typeof inputSchema>) {
    const since = new Date(Date.now() - days * DAY_MS);
    const [reached, payments, pausedNow] = await Promise.all([
      this.leadsService.reachedStagesSince(since),
      this.ordersService.paidSummarySince(since),
      this.leadsService.countPaused(),
    ]);

    const leads = reached[LeadStage.new];
    const converted = reached[LeadStage.converted];
    return {
      since: since.toISOString(),
      leads,
      reachedStage: reached,
      conversionRate:
        leads > 0 ? `${((converted / leads) * 100).toFixed(1)}%` : null,
      ...payments,
      pausedForHumanNow: pausedNow,
    };
  }
}
