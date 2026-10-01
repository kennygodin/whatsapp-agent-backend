import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import llmConfig from '../src/config/llm.config';
import { SEARCH_CATALOG_TOOL_NAME } from '../src/module/agent/agent.constants';
import { createLlmProviders } from '../src/module/agent/llm/llm-providers.factory';
import type {
  ChatMessage,
  LLMProvider,
} from '../src/module/agent/llm/llm.types';
import { SearchCatalogTool } from '../src/module/agent/tools/search-catalog.tool';
import {
  SMOKE_TEST_QUESTION,
  SMOKE_TEST_SYSTEM,
  SMOKE_TEST_TOOL_RESULT,
} from './scripts.constants';

const logger = new Logger('LlmSmokeTest');
const tools = [new SearchCatalogTool(null as never).definition];

async function checkProvider(provider: LLMProvider) {
  const messages: ChatMessage[] = [
    { role: 'user', content: SMOKE_TEST_QUESTION },
  ];

  const started = Date.now();
  const first = await provider.complete({
    system: SMOKE_TEST_SYSTEM,
    messages,
    tools,
  });
  const call = first.toolCalls.find(
    (toolCall) => toolCall.name === SEARCH_CATALOG_TOOL_NAME,
  );
  logger.log(
    `${provider.name} round 1 (${Date.now() - started}ms): ${
      call
        ? `called ${call.name}(${JSON.stringify(call.arguments)})`
        : `replied "${first.content}"`
    }`,
  );
  if (!call) {
    return;
  }

  messages.push(
    {
      role: 'assistant',
      content: first.content,
      toolCalls: first.toolCalls,
      providerData: first.providerData,
    },
    {
      role: 'tool',
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify(SMOKE_TEST_TOOL_RESULT),
    },
  );

  const secondStarted = Date.now();
  const second = await provider.complete({
    system: SMOKE_TEST_SYSTEM,
    messages,
    tools,
  });
  logger.log(
    `${provider.name} round 2 (${Date.now() - secondStarted}ms): "${second.content}"`,
  );
}

async function main() {
  const config = new ConfigService({ llm: llmConfig() });
  for (const provider of createLlmProviders(config)) {
    try {
      await checkProvider(provider);
    } catch (error) {
      logger.error(`${provider.name} failed`, error);
    }
  }
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});
