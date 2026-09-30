import { AgentService } from './agent.service';
import { MAX_AGENT_ITERATIONS } from './agent.constants';
import type { LLMProvider, LLMRequest, LLMResponse } from './llm/llm.types';
import type { AgentTool } from './tools/agent-tool.interface';
import { ToolInputError } from './tools/tool-input.error';
import { ToolRegistry } from './tools/tool-registry';
import { LlmRouter } from './llm/llm-router';

const CONTEXT = { leadId: 'lead-1', customerId: 'customer-1' };
const SYSTEM = 'You are a test assistant.';

function scriptedProvider(responses: LLMResponse[]) {
  const requests: LLMRequest[] = [];
  const provider: LLMProvider = {
    name: 'scripted',
    complete: async (request) => {
      requests.push(structuredClone(request));
      const next = responses.shift();
      if (!next) {
        throw new Error('No scripted response left');
      }
      return next;
    },
  };
  return { provider, requests };
}

const lookupTool: AgentTool = {
  definition: {
    name: 'lookup',
    description: 'test tool',
    parameters: { type: 'object', properties: {} },
  },
  execute: async (args) => {
    if (args.fail === true) {
      throw new ToolInputError('fail must not be true');
    }
    return { received: args };
  },
};

function buildAgent(responses: LLMResponse[]) {
  const { provider, requests } = scriptedProvider(responses);
  const agent = new AgentService(
    new LlmRouter([provider]),
    new ToolRegistry([lookupTool]),
  );
  return { agent, requests };
}

const userSays = (content: string) => [{ role: 'user' as const, content }];

describe('AgentService', () => {
  it('returns the reply directly when the model calls no tools', async () => {
    const { agent, requests } = buildAgent([
      { content: 'Hello there!', toolCalls: [] },
    ]);

    const result = await agent.runTurn({
      system: SYSTEM,
      history: userSays('hi'),
      context: CONTEXT,
    });

    expect(result).toEqual({
      reply: 'Hello there!',
      provider: 'scripted',
      iterations: 1,
      toolCalls: [],
      hitIterationCap: false,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].tools.map((tool) => tool.name)).toEqual(['lookup']);
  });

  it('runs a requested tool and sends the result back to the model', async () => {
    const { agent, requests } = buildAgent([
      {
        content: null,
        toolCalls: [{ id: 'call-1', name: 'lookup', arguments: { q: 'x' } }],
      },
      { content: 'Found it.', toolCalls: [] },
    ]);

    const result = await agent.runTurn({
      system: SYSTEM,
      history: userSays('find x'),
      context: CONTEXT,
    });

    expect(result.reply).toBe('Found it.');
    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toEqual(['lookup']);

    const secondRequest = requests[1].messages;
    expect(secondRequest.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
    ]);
    expect(secondRequest[2]).toEqual({
      role: 'tool',
      toolCallId: 'call-1',
      name: 'lookup',
      content: JSON.stringify({ ok: true, data: { received: { q: 'x' } } }),
    });
  });

  it('feeds an unknown tool back as an error instead of throwing', async () => {
    const { agent, requests } = buildAgent([
      {
        content: null,
        toolCalls: [{ id: 'call-1', name: 'does_not_exist', arguments: {} }],
      },
      { content: 'Sorry about that.', toolCalls: [] },
    ]);

    const result = await agent.runTurn({
      system: SYSTEM,
      history: userSays('hi'),
      context: CONTEXT,
    });

    expect(result.reply).toBe('Sorry about that.');
    expect(requests[1].messages.at(-1)).toMatchObject({
      role: 'tool',
      content: JSON.stringify({
        ok: false,
        error: 'Unknown tool: does_not_exist',
      }),
    });
  });

  it('passes tool input errors to the model so it can correct itself', async () => {
    const { agent, requests } = buildAgent([
      {
        content: null,
        toolCalls: [
          { id: 'call-1', name: 'lookup', arguments: { fail: true } },
        ],
      },
      { content: 'Let me try again.', toolCalls: [] },
    ]);

    await agent.runTurn({
      system: SYSTEM,
      history: userSays('hi'),
      context: CONTEXT,
    });

    expect(requests[1].messages.at(-1)).toMatchObject({
      role: 'tool',
      content: JSON.stringify({ ok: false, error: 'fail must not be true' }),
    });
  });

  it('stops at the iteration cap when the model keeps calling tools', async () => {
    const looping: LLMResponse = {
      content: null,
      toolCalls: [{ id: 'call', name: 'lookup', arguments: {} }],
    };
    const { agent, requests } = buildAgent(
      Array.from({ length: MAX_AGENT_ITERATIONS + 1 }, () => looping),
    );

    const result = await agent.runTurn({
      system: SYSTEM,
      history: userSays('hi'),
      context: CONTEXT,
    });

    expect(result.reply).toBeNull();
    expect(result.hitIterationCap).toBe(true);
    expect(requests).toHaveLength(MAX_AGENT_ITERATIONS);
  });
});
