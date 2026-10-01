import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { LLMProvider, LLMRequest, LLMResponse } from './llm.types';
import {
  FAKE_DEFAULT_REPLY,
  FAKE_PROVIDER_NAME,
  SEARCH_CATALOG_TOOL_NAME,
  fakeToolSummary,
} from '../agent.constants';

@Injectable()
export class FakeLLMProvider implements LLMProvider {
  readonly name = FAKE_PROVIDER_NAME;

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const last = request.messages.at(-1);

    if (last?.role === 'tool') {
      return {
        content: fakeToolSummary(last.name, last.content),
        toolCalls: [],
      };
    }

    const canSearch = request.tools.some(
      (tool) => tool.name === SEARCH_CATALOG_TOOL_NAME,
    );
    if (last?.role === 'user' && canSearch) {
      return {
        content: null,
        toolCalls: [
          {
            id: randomUUID(),
            name: SEARCH_CATALOG_TOOL_NAME,
            arguments: { query: last.content },
          },
        ],
      };
    }

    return { content: FAKE_DEFAULT_REPLY, toolCalls: [] };
  }
}
