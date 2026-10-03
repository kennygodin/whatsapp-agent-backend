import { describe, expect, it, spyOn } from 'bun:test';
import { Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { McpServerFactory } from './mcp-server.factory';
import { ADMIN_TOOL_UNAVAILABLE } from './mcp.constants';
import { READ_ONLY, type AdminTool } from './tools/admin-tool.interface';

const echoTool: AdminTool = {
  name: 'echo',
  title: 'Echo',
  description: 'Returns its input',
  inputSchema: z.object({ text: z.string() }),
  annotations: READ_ONLY,
  execute: async (input) => ({ echoed: input.text }),
};

const brokenTool: AdminTool = {
  ...echoTool,
  name: 'broken',
  execute: async () => {
    throw new Error('database password is hunter2');
  },
};

async function connect(tools: AdminTool[]) {
  const server = new McpServerFactory(tools).create();
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

describe('McpServerFactory', () => {
  it('lists every admin tool with its schema and annotations', async () => {
    const client = await connect([echoTool, brokenTool]);
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(['echo', 'broken']);
    expect(tools[0].inputSchema.required).toEqual(['text']);
    expect(tools[0].annotations?.readOnlyHint).toBe(true);
  });

  it('returns a tool result as JSON text', async () => {
    const client = await connect([echoTool]);
    const result = await client.callTool({
      name: 'echo',
      arguments: { text: 'hi' },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify({ echoed: 'hi' }, null, 2) },
    ]);
  });

  it('hides internal error details from the client', async () => {
    const logged = spyOn(Logger.prototype, 'error').mockImplementation(
      () => {},
    );
    const client = await connect([brokenTool]);
    const result = await client.callTool({
      name: 'broken',
      arguments: { text: 'hi' },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: ADMIN_TOOL_UNAVAILABLE },
    ]);
    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });
});
