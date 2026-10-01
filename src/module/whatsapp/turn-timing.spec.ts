import { describe, expect, it } from 'bun:test';
import { quietPeriodFor, remainingWaitMs } from './turn-timing';
import {
  DEFAULT_QUIET_MS,
  LONG_QUIET_MS,
  MAX_TURN_WAIT_MS,
  SHORT_QUIET_MS,
} from './whatsapp.constants';

describe('quietPeriodFor', () => {
  it.each([
    ['is delivery free?', SHORT_QUIET_MS],
    ['I want the power bank.', SHORT_QUIET_MS],
    ['thanks!', SHORT_QUIET_MS],
    ['I want the power bank and', LONG_QUIET_MS],
    ['also,', LONG_QUIET_MS],
    ['wait...', LONG_QUIET_MS],
    ['Also', LONG_QUIET_MS],
    ['how much', DEFAULT_QUIET_MS],
    ['hi', DEFAULT_QUIET_MS],
    ['', DEFAULT_QUIET_MS],
  ])('"%s" waits %ims', (body, expected) => {
    expect(quietPeriodFor(body)).toBe(expected);
  });
});

describe('remainingWaitMs', () => {
  const start = 1_000_000;

  it('waits for the quiet period after the newest message', () => {
    expect(
      remainingWaitMs({
        oldestAt: start,
        newestAt: start + 1000,
        lastBody: 'how much',
        now: start + 2000,
      }),
    ).toBe(DEFAULT_QUIET_MS - 1000);
  });

  it('returns 0 once the customer has been quiet long enough', () => {
    expect(
      remainingWaitMs({
        oldestAt: start,
        newestAt: start,
        lastBody: 'is delivery free?',
        now: start + SHORT_QUIET_MS,
      }),
    ).toBe(0);
  });

  it('never waits past the cap measured from the first unanswered message', () => {
    expect(
      remainingWaitMs({
        oldestAt: start,
        newestAt: start + MAX_TURN_WAIT_MS - 1000,
        lastBody: 'and',
        now: start + MAX_TURN_WAIT_MS - 1000,
      }),
    ).toBe(1000);
  });
});
