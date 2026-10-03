import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { MessagesService } from '../../messages/messages.service';
import { READ_ONLY, type AdminTool } from './admin-tool.interface';
import {
  DEFAULT_MESSAGES_LIMIT,
  GET_CONVERSATION_MESSAGES,
  MAX_MESSAGES_LIMIT,
} from '../mcp.constants';

const inputSchema = z.object({
  leadId: z.uuid(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_MESSAGES_LIMIT)
    .default(DEFAULT_MESSAGES_LIMIT),
});

@Injectable()
export class GetConversationMessagesTool implements AdminTool<
  typeof inputSchema
> {
  readonly name = GET_CONVERSATION_MESSAGES.name;
  readonly title = GET_CONVERSATION_MESSAGES.title;
  readonly description = GET_CONVERSATION_MESSAGES.description;
  readonly inputSchema = inputSchema;
  readonly annotations = READ_ONLY;

  constructor(private readonly messagesService: MessagesService) {}

  async execute({ leadId, limit }: z.infer<typeof inputSchema>) {
    return {
      messages: await this.messagesService.historyForLead(leadId, limit),
    };
  }
}
