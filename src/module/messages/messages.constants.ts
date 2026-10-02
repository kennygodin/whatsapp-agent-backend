import { MessageStatus } from '../../generated/prisma/client';

export type DeliveryStatus = Extract<
  MessageStatus,
  'delivered' | 'read' | 'undelivered' | 'failed'
>;

export const DELIVERY_STATUS_UPDATABLE_FROM: Record<
  DeliveryStatus,
  MessageStatus[]
> = {
  [MessageStatus.delivered]: [MessageStatus.queued, MessageStatus.sent],
  [MessageStatus.read]: [
    MessageStatus.queued,
    MessageStatus.sent,
    MessageStatus.delivered,
  ],
  [MessageStatus.undelivered]: [MessageStatus.queued, MessageStatus.sent],
  [MessageStatus.failed]: [MessageStatus.queued, MessageStatus.sent],
};
