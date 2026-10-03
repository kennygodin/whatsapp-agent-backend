const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const LIFECYCLE_SCAN_EVERY_MS = 10 * MINUTE_MS;
export const PAYMENT_NUDGE_AFTER_MS = 2 * HOUR_MS;
export const WHATSAPP_WINDOW_SAFE_MS = 23 * HOUR_MS;
export const DROP_OFF_AFTER_MS = 24 * HOUR_MS;
export const LIFECYCLE_BATCH_SIZE = 50;

export const LIFECYCLE_JOBS = {
  PAYMENT_NUDGES: 'payment-nudges',
  DROP_OFFS: 'drop-offs',
} as const;

export const FRIEND = 'there';
export const paymentNudge = (order: {
  customerName: string | null;
  product: string;
  quantity: number;
  total: string;
  paymentUrl: string;
}) =>
  `Hi ${order.customerName ?? FRIEND}, your order for ${order.quantity} × ${order.product} (${order.total}) is saved and waiting for payment. You can pay securely here:\n${order.paymentUrl}\nReply here if you have any questions.`;

export const nudgesSent = (count: number) =>
  `Sent ${count} payment reminder(s)`;
export const leadsDropped = (count: number) =>
  `Marked ${count} inactive lead(s) as dropped off`;
export const unknownLifecycleJob = (name: string) =>
  `Unknown lifecycle job: ${name}`;
