import {
  CONTINUATION_ENDINGS,
  CONTINUATION_WORDS,
  DEFAULT_QUIET_MS,
  LONG_QUIET_MS,
  MAX_TURN_WAIT_MS,
  SHORT_QUIET_MS,
} from './whatsapp.constants';

export function quietPeriodFor(lastBody: string): number {
  const text = lastBody.trim().toLowerCase();
  if (!text) {
    return DEFAULT_QUIET_MS;
  }

  const lastWord = text.split(/\s+/).at(-1) ?? '';
  if (
    CONTINUATION_ENDINGS.some((ending) => text.endsWith(ending)) ||
    CONTINUATION_WORDS.has(lastWord)
  ) {
    return LONG_QUIET_MS;
  }

  if (/[?!.]$/.test(text)) {
    return SHORT_QUIET_MS;
  }
  return DEFAULT_QUIET_MS;
}

export function remainingWaitMs(input: {
  oldestAt: number;
  newestAt: number;
  lastBody: string;
  now: number;
}): number {
  const quietUntil = input.newestAt + quietPeriodFor(input.lastBody);
  const deadline = input.oldestAt + MAX_TURN_WAIT_MS;
  return Math.max(0, Math.min(quietUntil, deadline) - input.now);
}
