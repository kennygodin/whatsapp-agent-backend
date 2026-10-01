import { Injectable } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import type { ToolDefinition } from '../llm/llm.types';
import type { AgentTool } from './agent-tool.interface';
import { ToolInputError } from './tool-input.error';
import {
  SEARCH_CATALOG_DESCRIPTION,
  SEARCH_CATALOG_QUERY_DESCRIPTION,
  SEARCH_CATALOG_TOOL_NAME,
  SEARCH_QUERY_REQUIRED,
} from '../agent.constants';

@Injectable()
export class SearchCatalogTool implements AgentTool {
  readonly definition: ToolDefinition = {
    name: SEARCH_CATALOG_TOOL_NAME,
    description: SEARCH_CATALOG_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: SEARCH_CATALOG_QUERY_DESCRIPTION,
        },
      },
      required: ['query'],
    },
  };

  constructor(private readonly productsService: ProductsService) {}

  async execute(args: Record<string, unknown>) {
    const { query } = args;
    if (typeof query !== 'string' || !query.trim()) {
      throw new ToolInputError(SEARCH_QUERY_REQUIRED);
    }
    return { products: await this.productsService.search(query) };
  }
}
