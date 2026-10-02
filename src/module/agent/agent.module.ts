import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertsModule } from '../alerts/alerts.module';
import { MessagesModule } from '../messages/messages.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { AgentService } from './agent.service';
import { SalesAgentService } from './sales-agent.service';
import { AGENT_TOOLS, LLM_PROVIDERS } from './agent.constants';
import { createLlmProviders } from './llm/llm-providers.factory';
import { LlmRouter } from './llm/llm-router';
import type { AgentTool } from './tools/agent-tool.interface';
import { CreateOrderTool } from './tools/create-order.tool';
import { EscalateToHumanTool } from './tools/escalate-to-human.tool';
import { GetOrderStatusTool } from './tools/get-order-status.tool';
import { SearchCatalogTool } from './tools/search-catalog.tool';
import { ToolRegistry } from './tools/tool-registry';
import { GeneratePaymentLinkTool } from './tools/generate-payment-link.tool';

@Module({
  imports: [ProductsModule, MessagesModule, AlertsModule, OrdersModule],
  providers: [
    AgentService,
    SalesAgentService,
    ToolRegistry,
    SearchCatalogTool,
    CreateOrderTool,
    GetOrderStatusTool,
    GeneratePaymentLinkTool,
    EscalateToHumanTool,
    {
      provide: AGENT_TOOLS,
      useFactory: (...tools: AgentTool[]) => tools,
      inject: [
        SearchCatalogTool,
        CreateOrderTool,
        GetOrderStatusTool,
        GeneratePaymentLinkTool,
        EscalateToHumanTool,
      ],
    },
    {
      provide: LLM_PROVIDERS,
      useFactory: createLlmProviders,
      inject: [ConfigService],
    },
    LlmRouter,
  ],
  exports: [SalesAgentService],
})
export class AgentModule {}
