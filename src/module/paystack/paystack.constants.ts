export const PAYSTACK_API_BASE_URL = 'https://api.paystack.co';
export const PAYSTACK_INITIALIZE_PATH = '/transaction/initialize';
export const PAYSTACK_VERIFY_PATH = '/transaction/verify';
export const PAYSTACK_REQUEST_TIMEOUT_MS = 15_000;
export const PAYSTACK_SIGNATURE_HEADER = 'x-paystack-signature';
export const PAYSTACK_CURRENCY = 'NGN';
export const PAYSTACK_SUCCESS_STATUS = 'success';

export const paystackRequestFailed = (path: string, message: string) =>
  `Paystack ${path} failed: ${message}`;
