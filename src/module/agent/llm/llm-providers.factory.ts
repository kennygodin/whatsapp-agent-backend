import { ConfigService } from '@nestjs/config';
import {
  CEREBRAS_BASE_URL,
  GROQ_BASE_URL,
  LLM_REASONING_EFFORT,
  type LlmProviderName,
} from '../agent.constants';
import { FakeLLMProvider } from './fake-llm.provider';
import type { LLMProvider } from './llm.types';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider';

const PROVIDER_BUILDERS: Record<
  LlmProviderName,
  (config: ConfigService) => LLMProvider
> = {
  groq: (config) =>
    new OpenAICompatibleProvider({
      name: 'groq',
      baseURL: GROQ_BASE_URL,
      apiKey: config.getOrThrow<string>('llm.groq.apiKey'),
      model: config.getOrThrow<string>('llm.groq.model'),
      reasoningEffort: LLM_REASONING_EFFORT,
    }),
  cerebras: (config) =>
    new OpenAICompatibleProvider({
      name: 'cerebras',
      baseURL: CEREBRAS_BASE_URL,
      apiKey: config.getOrThrow<string>('llm.cerebras.apiKey'),
      model: config.getOrThrow<string>('llm.cerebras.model'),
      reasoningEffort: LLM_REASONING_EFFORT,
    }),
  gemini: (config) =>
    new GeminiProvider({
      name: 'gemini',
      apiKey: config.getOrThrow<string>('llm.gemini.apiKey'),
      model: config.getOrThrow<string>('llm.gemini.model'),
    }),
  fake: () => new FakeLLMProvider(),
};

export function createLlmProviders(config: ConfigService): LLMProvider[] {
  return config
    .getOrThrow<LlmProviderName[]>('llm.chain')
    .map((name) => PROVIDER_BUILDERS[name](config));
}
