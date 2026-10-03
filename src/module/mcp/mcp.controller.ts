import {
  Controller,
  Delete,
  Get,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { McpServerFactory } from './mcp-server.factory';
import { MCP_METHOD_NOT_ALLOWED, MCP_ROUTE } from './mcp.constants';

@Controller(MCP_ROUTE)
@UseGuards(ApiKeyGuard)
export class McpController {
  constructor(private readonly mcpServerFactory: McpServerFactory) {}

  @Post()
  async handle(@Req() request: Request, @Res() response: Response) {
    const server = this.mcpServerFactory.create();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  }

  @Get()
  openStream() {
    throw new MethodNotAllowedException(MCP_METHOD_NOT_ALLOWED);
  }

  @Delete()
  endSession() {
    throw new MethodNotAllowedException(MCP_METHOD_NOT_ALLOWED);
  }
}
