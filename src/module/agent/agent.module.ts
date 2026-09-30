import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsModule } from '../products/products.module';
import { AgentService } from './agent.service';
import { AGENT_TOOLS, LLM_PROVIDERS } from './agent.constants';
import { createLlmProviders } from './llm/llm-providers.factory';
import { LlmRouter } from './llm/llm-router';
import type { AgentTool } from './tools/agent-tool.interface';
import { SearchCatalogTool } from './tools/search-catalog.tool';
import { ToolRegistry } from './tools/tool-registry';

@Module({
  imports: [ProductsModule],
  providers: [
    AgentService,
    ToolRegistry,
    SearchCatalogTool,
    {
      provide: AGENT_TOOLS,
      useFactory: (searchCatalog: SearchCatalogTool): AgentTool[] => [
        searchCatalog,
      ],
      inject: [SearchCatalogTool],
    },
    {
      provide: LLM_PROVIDERS,
      useFactory: createLlmProviders,
      inject: [ConfigService],
    },
    LlmRouter,
  ],
  exports: [AgentService],
})
export class AgentModule {}
