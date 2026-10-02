import { describe, expect, it } from 'bun:test';
import type { Job } from 'bullmq';
import { isFinalAttempt } from './job-attempts.util';

const job = (attemptsMade: number, attempts?: number) =>
  ({ attemptsMade, opts: { attempts } }) as Job;

describe('isFinalAttempt', () => {
  it('is false while retries remain', () => {
    expect(isFinalAttempt(job(0, 5))).toBe(false);
    expect(isFinalAttempt(job(3, 5))).toBe(false);
  });

  it('is true on the last allowed attempt', () => {
    expect(isFinalAttempt(job(4, 5))).toBe(true);
  });

  it('treats a job without retries as always final', () => {
    expect(isFinalAttempt(job(0))).toBe(true);
  });
});
