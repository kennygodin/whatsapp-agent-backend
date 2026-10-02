export const WEBHOOK_PATH = '/api/v1/webhooks/whatsapp';
export const DEFAULT_TEST_BODY = 'Hello';
export const DEFAULT_TEST_FROM = 'whatsapp:+2348000000000';
export const TEST_PROFILE_NAME = 'Local Tester';
export const WEBHOOK_ACCEPTED = (status: number) =>
  `Webhook responded ${status} — the WhatsApp reply arrives separately in a few seconds.`;
export const SMOKE_TEST_SYSTEM =
  'You are a sales assistant for an electronics store. Use the search_catalog tool before answering product questions.';
export const SMOKE_TEST_QUESTION = 'do you have power banks?';
export const SMOKE_TEST_TOOL_RESULT = {
  ok: true,
  data: {
    products: [
      {
        productId: 'smoke-test-product',
        name: '20,000mAh Power Bank',
        price: '₦25,000',
        inStock: true,
      },
    ],
  },
};

export const PAYSTACK_WEBHOOK_PATH = '/api/v1/webhooks/paystack';
export const PAYSTACK_REFERENCE_REQUIRED =
  'Usage: bun scripts/send-test-paystack-webhook.ts <payment reference>';
