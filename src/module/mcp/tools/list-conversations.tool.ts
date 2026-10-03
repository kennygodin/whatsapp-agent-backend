import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BotMode, LeadStage } from '../../../generated/prisma/client';
import { LeadsService } from '../../leads/leads.service';
import { READ_ONLY, type AdminTool } from './admin-tool.interface';
import {
  DEFAULT_CONVERSATIONS_LIMIT,
  LIST_CONVERSATIONS,
  MAX_CONVERSATIONS_LIMIT,
} from '../mcp.constants';

const inputSchema = z.object({
  stage: z.enum(LeadStage).optional(),
  botMode: z.enum(BotMode).optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_CONVERSATIONS_LIMIT)
    .default(DEFAULT_CONVERSATIONS_LIMIT),
});

@Injectable()
export class ListConversationsTool implements AdminTool<typeof inputSchema> {
  readonly name = LIST_CONVERSATIONS.name;
  readonly title = LIST_CONVERSATIONS.title;
  readonly description = LIST_CONVERSATIONS.description;
  readonly inputSchema = inputSchema;
  readonly annotations = READ_ONLY;

  constructor(private readonly leadsService: LeadsService) {}

  async execute(input: z.infer<typeof inputSchema>) {
    return {
      conversations: await this.leadsService.listConversations(input),
    };
  }
}
