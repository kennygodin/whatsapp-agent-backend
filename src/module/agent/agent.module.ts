import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AgentService } from './agent.service';
import { AGENT_TOOLS, LLM_PROVIDER } from './agent.constants';
import { FakeLLMProvider } from './llm/fake-llm.provider';
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
    { provide: LLM_PROVIDER, useClass: FakeLLMProvider },
  ],
  exports: [AgentService],
})
export class AgentModule {}
