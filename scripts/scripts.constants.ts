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
export const API_KEY_USAGE =
  'Usage: bun scripts/api-key.ts create "Key name" | list | revoke wak_xxxxxxxx';
export const NO_ADMIN_USER =
  'No admin user found. Run the seed with ADMIN_EMAIL and ADMIN_PASSWORD first.';
export const apiKeyCreatedMessage = (name: string, key: string) =>
  `API key "${name}" created. Copy it now, it will not be shown again:\n\n${key}\n`;
export const apiKeyListLine = (key: {
  prefix: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}) =>
  `${key.prefix}…  ${key.name}  created ${key.createdAt.toISOString()}  last used ${key.lastUsedAt?.toISOString() ?? 'never'}${key.revokedAt ? '  REVOKED' : ''}`;
export const NO_API_KEYS = 'No API keys yet.';
export const apiKeyRevokedMessage = (count: number, prefix: string) =>
  count > 0
    ? `Revoked ${count} key(s) starting with ${prefix}`
    : `No active key starts with ${prefix}`;
