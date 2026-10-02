import { MessageStatus } from '../../generated/prisma/client';
import type { MessageStatus as TwilioMessageStatus } from 'twilio/lib/rest/api/v2010/account/message';
import type { DeliveryStatus } from '../messages/messages.constants';

export const WHATSAPP_WEBHOOK_ROUTE = 'webhooks/whatsapp';
export const STATUS_CALLBACK_PATH = 'status';

export const WHATSAPP_ADDRESS_PREFIX = 'whatsapp:';
export const TWILIO_SIGNATURE_HEADER = 'x-twilio-signature';
export const EMPTY_TWIML_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
export const INTAKE_JOB_NAME = 'inbound-message';

export const INVALID_TWILIO_SIGNATURE = 'Invalid Twilio signature';
export const INVALID_INBOUND_PAYLOAD = 'Invalid inbound WhatsApp payload';

export const TURN_JOB_NAME = 'conversation-turn';
export const OUTBOUND_JOB_NAME = 'send-message';

export const INTAKE_CONCURRENCY = 1;
export const TURN_CONCURRENCY = 5;
export const TURN_INITIAL_DELAY_MS = 2000;
export const SHORT_QUIET_MS = 2000;
export const DEFAULT_QUIET_MS = 5000;
export const LONG_QUIET_MS = 8000;
export const MAX_TURN_WAIT_MS = 15_000;
export const CONTINUATION_ENDINGS = [',', ':', '-', '…', '...'];
export const CONTINUATION_WORDS = new Set([
  'and',
  'but',
  'so',
  'or',
  'also',
  'because',
  'cos',
  'then',
  'with',
  'plus',
  'if',
]);

export const OUTBOUND_RATE_LIMIT = { max: 1, duration: 3000 };
export const TWILIO_REQUEST_TIMEOUT_MS = 10_000;
export const MAX_WHATSAPP_BODY_LENGTH = 1600;

export const MEDIA_NOT_SUPPORTED_REPLY =
  "Sorry, I can only read text messages for now. Please type your question and I'll help you right away.";
export const TWILIO_REQUEST_TIMED_OUT = 'Twilio request timed out';
export const OUTBOUND_SEND_FAILED = 'Failed to send WhatsApp message';
export const AGENT_FALLBACK_REPLY =
  "Sorry, I'm having a little trouble right now. Please send your message again in a minute.";

export const TWILIO_DELIVERY_STATUSES: Partial<
  Record<TwilioMessageStatus, DeliveryStatus>
> = {
  delivered: MessageStatus.delivered,
  read: MessageStatus.read,
  undelivered: MessageStatus.undelivered,
  failed: MessageStatus.failed,
};
export const deliveryFailedLog = (
  twilioSid: string,
  status: string,
  errorCode: string | null,
) =>
  `WhatsApp message ${twilioSid} ${status} (Twilio error ${errorCode ?? 'none'})`;
export const TURN_FAILED_FALLBACK_SENT =
  'Turn failed on final attempt; fallback reply sent';
