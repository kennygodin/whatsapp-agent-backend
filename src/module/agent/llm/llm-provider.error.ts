export type LlmFailureKind = 'rate_limited' | 'unavailable' | 'rejected';

export class LlmProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: LlmFailureKind,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export function failureKindFromStatus(status?: number): LlmFailureKind {
  if (status === 429) {
    return 'rate_limited';
  }
  if (status === undefined || status >= 500) {
    return 'unavailable';
  }
  return 'rejected';
}
