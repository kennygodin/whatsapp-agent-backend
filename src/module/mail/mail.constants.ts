export const MAIL_REQUEST_TIMEOUT_MS = 10_000;
export const MAIL_REQUEST_TIMED_OUT = 'Email request timed out';
export const mailSendFailedMessage = (name: string, message: string) =>
  `Email send failed (${name}): ${message}`;
