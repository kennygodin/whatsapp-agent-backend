import type { DefaultJobOptions } from 'bullmq';

export const QUEUES = {
  WHATSAPP_INTAKE: 'whatsapp-intake',
  CONVERSATION_TURN: 'conversation-turn',
  WHATSAPP_OUTBOUND: 'whatsapp-outbound',
  ALERTS: 'alerts',
  PAYMENTS: 'payments',
  LIFECYCLE: 'lifecycle',
} as const;

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};
