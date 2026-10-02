export const PAYSTACK_WEBHOOK_ROUTE = 'webhooks/paystack';
export const CHARGE_SUCCESS_EVENT = 'charge.success';
export const PAYMENT_JOB_NAME = 'confirm-payment';
export const paymentJobId = (reference: string) => `paystack-${reference}`;

export const INVALID_PAYSTACK_SIGNATURE = 'Invalid Paystack signature';

export const PAYMENT_NOT_SUCCESSFUL = (reference: string, status: string) =>
  `Payment ${reference} is "${status}" at Paystack; nothing to record`;
export const UNKNOWN_PAYMENT_REFERENCE = (reference: string) =>
  `Payment ${reference} does not match any order`;
export const paymentRecorded = (reference: string, leadId: string) =>
  `Payment ${reference} recorded for lead ${leadId}`;

export const PAID_CANCELLED_ORDER_REASON =
  'Customer paid for an order that had been replaced or cancelled. Check the payment and refund or fulfil manually.';
export const AMOUNT_MISMATCH_REASON =
  'Payment amount or currency does not match the order total. The order was not marked paid. Check the payment in Paystack.';
export const OUT_OF_STOCK_AFTER_PAYMENT_REASON =
  'Customer paid, but there is not enough stock. Refund or restock and contact the customer.';

export const paymentConfirmation = (order: {
  product: string;
  quantity: number;
  total: string;
}) =>
  `Payment received, thank you! Your order for ${order.quantity} × ${order.product} (${order.total}) is confirmed. Our team will contact you on this chat to arrange delivery.`;
export const PAYMENT_NEEDS_REVIEW_REPLY =
  "We've received your payment. A team member will check your order and reply here shortly.";
