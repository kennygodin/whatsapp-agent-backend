import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { ADMIN_TOOLS } from './mcp.constants';
import type { AdminTool } from './tools/admin-tool.interface';
import { GetConversationMessagesTool } from './tools/get-conversation-messages.tool';
import { GetLeadFunnelStatsTool } from './tools/get-lead-funnel-stats.tool';
import { GetLeadOrdersTool } from './tools/get-lead-orders.tool';
import { ListConversationsTool } from './tools/list-conversations.tool';
import { ListProductsTool } from './tools/list-products.tool';
import { ResumeConversationTool } from './tools/resume-conversation.tool';

const ADMIN_TOOL_CLASSES = [
  GetLeadFunnelStatsTool,
  ListConversationsTool,
  GetConversationMessagesTool,
  GetLeadOrdersTool,
  ListProductsTool,
  ResumeConversationTool,
];

@Module({
  imports: [
    AuthModule,
    LeadsModule,
    MessagesModule,
    OrdersModule,
    ProductsModule,
  ],
  controllers: [McpController],
  providers: [
    McpServerFactory,
    ...ADMIN_TOOL_CLASSES,
    {
      provide: ADMIN_TOOLS,
      useFactory: (...tools: AdminTool[]) => tools,
      inject: ADMIN_TOOL_CLASSES,
    },
  ],
})
export class McpModule {}
