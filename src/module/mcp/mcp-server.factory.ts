import { Inject, Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AdminTool } from './tools/admin-tool.interface';
import {
  ADMIN_TOOLS,
  ADMIN_TOOL_FAILED,
  ADMIN_TOOL_UNAVAILABLE,
  MCP_SERVER_INFO,
} from './mcp.constants';

@Injectable()
export class McpServerFactory {
  private readonly logger = new Logger(McpServerFactory.name);

  constructor(@Inject(ADMIN_TOOLS) private readonly tools: AdminTool[]) {}

  create(): McpServer {
    const server = new McpServer(MCP_SERVER_INFO);
    for (const tool of this.tools) {
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        },
        (input) => this.run(tool, input),
      );
    }
    return server;
  }

  private async run(
    tool: AdminTool,
    input: Record<string, unknown>,
  ): Promise<CallToolResult> {
    try {
      const result = await tool.execute(input);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      this.logger.error(`${ADMIN_TOOL_FAILED}: ${tool.name}`, error);
      return {
        isError: true,
        content: [{ type: 'text', text: ADMIN_TOOL_UNAVAILABLE }],
      };
    }
  }
}
