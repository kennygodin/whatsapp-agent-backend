export const WEBHOOK_PATH = '/api/v1/webhooks/whatsapp';
export const DEFAULT_TEST_BODY = 'Hello';
export const DEFAULT_TEST_FROM = 'whatsapp:+2348000000000';
export const TEST_PROFILE_NAME = 'Local Tester';
export const WEBHOOK_ACCEPTED = (status: number) =>
  `Webhook responded ${status} — the WhatsApp reply arrives separately in a few seconds.`;
