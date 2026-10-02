import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertsModule } from '../alerts/alerts.module';
import { MessagesModule } from '../messages/messages.module';
import { ProductsModule } from '../products/products.module';
import { AgentService } from './agent.service';
import { SalesAgentService } from './sales-agent.service';
import { AGENT_TOOLS, LLM_PROVIDERS } from './agent.constants';
import { createLlmProviders } from './llm/llm-providers.factory';
import { LlmRouter } from './llm/llm-router';
import type { AgentTool } from './tools/agent-tool.interface';
import { EscalateToHumanTool } from './tools/escalate-to-human.tool';
import { SearchCatalogTool } from './tools/search-catalog.tool';
import { ToolRegistry } from './tools/tool-registry';

@Module({
  imports: [ProductsModule, MessagesModule, AlertsModule],
  providers: [
    AgentService,
    SalesAgentService,
    ToolRegistry,
    SearchCatalogTool,
    EscalateToHumanTool,
    {
      provide: AGENT_TOOLS,
      useFactory: (
        searchCatalog: SearchCatalogTool,
        escalateToHuman: EscalateToHumanTool,
      ): AgentTool[] => [searchCatalog, escalateToHuman],
      inject: [SearchCatalogTool, EscalateToHumanTool],
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
