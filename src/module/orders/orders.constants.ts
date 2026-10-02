export const MAX_ORDER_QUANTITY = 10;
export const RECENT_ORDERS_LIMIT = 3;

export const QUANTITY_INVALID = `quantity must be a whole number from 1 to ${MAX_ORDER_QUANTITY}.`;
export const PRODUCT_NOT_AVAILABLE =
  'That product is not available. Search the catalog again and use a productId from the results.';
export const notEnoughStock = (productName: string) =>
  `There is not enough ${productName} in stock for that quantity. Ask the customer to choose a smaller quantity or another product.`;
export const EMAIL_REQUIRED =
  'The customer has no email address on file. Ask for their email address (it is needed for the payment receipt), then call create_order again with it.';
export const EMAIL_INVALID =
  'That email address is not valid. Ask the customer to check it.';

export const PAYMENT_REFERENCE_PREFIX = 'ord';
export const paymentReference = (orderId: string) =>
  `${PAYMENT_REFERENCE_PREFIX}-${orderId}-${Date.now()}`;
export const NO_PENDING_ORDER =
  'There is no unpaid order for this customer. Create the order with create_order first.';
export const ORDER_CHANGED =
  'The order changed while the payment link was being created. Call generate_payment_link again.';
