import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { LeadsService } from '../../leads/leads.service';
import type { AdminTool } from './admin-tool.interface';
import {
  NOT_PAUSED_MESSAGE,
  RESUMED_MESSAGE,
  RESUME_CONVERSATION,
  conversationResumedLog,
} from '../mcp.constants';

const inputSchema = z.object({ leadId: z.uuid() });

@Injectable()
export class ResumeConversationTool implements AdminTool<typeof inputSchema> {
  private readonly logger = new Logger(ResumeConversationTool.name);

  readonly name = RESUME_CONVERSATION.name;
  readonly title = RESUME_CONVERSATION.title;
  readonly description = RESUME_CONVERSATION.description;
  readonly inputSchema = inputSchema;
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  constructor(private readonly leadsService: LeadsService) {}

  async execute({ leadId }: z.infer<typeof inputSchema>) {
    const resumed = await this.leadsService.resumeBot(leadId);
    if (resumed) {
      this.logger.log(conversationResumedLog(leadId));
    }
    return {
      resumed,
      message: resumed ? RESUMED_MESSAGE : NOT_PAUSED_MESSAGE,
    };
  }
}
