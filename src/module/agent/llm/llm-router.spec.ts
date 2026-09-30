import { afterEach, describe, expect, it, setSystemTime } from 'bun:test';
import { ALL_LLM_PROVIDERS_FAILED } from '../agent.constants';
import { LlmProviderError } from './llm-provider.error';
import type { LlmFailureKind } from './llm-provider.error';
import { LlmRouter } from './llm-router';
import type { LLMProvider } from './llm.types';

const provider = (name: string): LLMProvider => ({
  name,
  complete: async () => ({ content: name, toolCalls: [] }),
});

const failWith =
  (kind: LlmFailureKind, retryAfterMs?: number) => (p: LLMProvider) =>
    new LlmProviderError(p.name, kind, `${p.name} ${kind}`, retryAfterMs);

describe('LlmRouter', () => {
  afterEach(() => setSystemTime());

  it('uses the first provider when it succeeds', async () => {
    const router = new LlmRouter([provider('groq'), provider('cerebras')]);
    const used = await router.run(async (p) => p.name);
    expect(used).toBe('groq');
  });

  it('falls back to the next provider when one is unavailable', async () => {
    const router = new LlmRouter([provider('groq'), provider('cerebras')]);
    const attempts: string[] = [];

    const used = await router.run(async (p) => {
      attempts.push(p.name);
      if (p.name === 'groq') throw failWith('unavailable')(p);
      return p.name;
    });

    expect(used).toBe('cerebras');
    expect(attempts).toEqual(['groq', 'cerebras']);
  });

  it('skips a rate-limited provider until its cooldown ends', async () => {
    setSystemTime(new Date('2026-10-01T10:00:00Z'));
    const router = new LlmRouter([provider('groq'), provider('cerebras')]);

    await router.run(async (p) => {
      if (p.name === 'groq') throw failWith('rate_limited', 30_000)(p);
      return p.name;
    });

    const attemptsDuringCooldown: string[] = [];
    await router.run(async (p) => {
      attemptsDuringCooldown.push(p.name);
      return p.name;
    });
    expect(attemptsDuringCooldown).toEqual(['cerebras']);

    setSystemTime(new Date('2026-10-01T10:00:31Z'));
    const usedAfterCooldown = await router.run(async (p) => p.name);
    expect(usedAfterCooldown).toBe('groq');
  });

  it('throws when every provider fails', async () => {
    const router = new LlmRouter([provider('groq'), provider('cerebras')]);
    await expect(
      router.run(async (p) => {
        throw failWith('unavailable')(p);
      }),
    ).rejects.toThrow(ALL_LLM_PROVIDERS_FAILED);
  });

  it('does not hide bugs: non-provider errors are rethrown immediately', async () => {
    const router = new LlmRouter([provider('groq'), provider('cerebras')]);
    const attempts: string[] = [];

    await expect(
      router.run(async (p) => {
        attempts.push(p.name);
        throw new TypeError('bug in our code');
      }),
    ).rejects.toThrow('bug in our code');
    expect(attempts).toEqual(['groq']);
  });
});
