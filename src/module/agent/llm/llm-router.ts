import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ALL_LLM_PROVIDERS_FAILED,
  DEFAULT_RATE_LIMIT_COOLDOWN_MS,
  LLM_PROVIDERS,
  MAX_RATE_LIMIT_COOLDOWN_MS,
  llmRateLimitedMessage,
  llmRejectedMessage,
  llmUnavailableMessage,
} from '../agent.constants';
import { LlmProviderError } from './llm-provider.error';
import type { LLMProvider } from './llm.types';

@Injectable()
export class LlmRouter {
  private readonly logger = new Logger(LlmRouter.name);
  private readonly cooldownUntil = new Map<string, number>();

  constructor(
    @Inject(LLM_PROVIDERS) private readonly providers: LLMProvider[],
  ) {}

  async run<T>(task: (provider: LLMProvider) => Promise<T>): Promise<T> {
    const available = this.providers.filter(
      (provider) => (this.cooldownUntil.get(provider.name) ?? 0) <= Date.now(),
    );

    for (const provider of available) {
      try {
        return await task(provider);
      } catch (error) {
        if (!(error instanceof LlmProviderError)) {
          throw error;
        }
        this.recordFailure(error);
      }
    }

    throw new Error(ALL_LLM_PROVIDERS_FAILED);
  }

  private recordFailure(error: LlmProviderError) {
    if (error.kind === 'rate_limited') {
      const cooldownMs = Math.min(
        error.retryAfterMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS,
        MAX_RATE_LIMIT_COOLDOWN_MS,
      );
      this.cooldownUntil.set(error.provider, Date.now() + cooldownMs);
      this.logger.warn(llmRateLimitedMessage(error.provider, cooldownMs));
    } else if (error.kind === 'rejected') {
      this.logger.error(
        `${llmRejectedMessage(error.provider)}: ${error.message}`,
      );
    } else {
      this.logger.warn(
        `${llmUnavailableMessage(error.provider)}: ${error.message}`,
      );
    }
  }
}
