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
export const TURN_DEBOUNCE_MS = 6000;
export const OUTBOUND_RATE_LIMIT = { max: 1, duration: 3000 };
export const TWILIO_REQUEST_TIMEOUT_MS = 10_000;
export const MAX_WHATSAPP_BODY_LENGTH = 1600;

export const ECHO_REPLY_PREFIX = 'You said: ';
export const MEDIA_NOT_SUPPORTED_REPLY =
  "Sorry, I can only read text messages for now. Please type your question and I'll help you right away.";
export const TWILIO_REQUEST_TIMED_OUT = 'Twilio request timed out';
export const OUTBOUND_SEND_FAILED = 'Failed to send WhatsApp message';
