import type { EscalationAlertJob } from './interfaces/escalation-alert-job.interface';

export const ALERT_CHANNELS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const;
export const ALERT_TIME_ZONE = 'Africa/Lagos';

export const UNKNOWN_CUSTOMER = 'Unknown customer';
export const unknownAlertChannel = (name: string) =>
  `Unknown alert channel: ${name}`;
export const escalationRecorded = (leadId: string, reason: string) =>
  `lead=${leadId} escalated: ${reason}`;

export const escalationEmailSubject = (alert: EscalationAlertJob) =>
  `Customer needs a human: ${alert.customerName ?? UNKNOWN_CUSTOMER} (${alert.customerPhone})`;

export const escalationAlertText = (alert: EscalationAlertJob) =>
  [
    'A WhatsApp conversation needs a human.',
    '',
    `Customer: ${alert.customerName ?? UNKNOWN_CUSTOMER} (${alert.customerPhone})`,
    `Reason: ${alert.reason}`,
    `Escalated at: ${new Date(alert.escalatedAt).toLocaleString('en-NG', { timeZone: ALERT_TIME_ZONE })}`,
    `Lead: ${alert.leadId}`,
    '',
    'The bot is paused for this chat until the conversation is resumed.',
  ].join('\n');

export const alertFailedLog = (
  channel: string,
  leadId: string,
  attemptsMade: number,
) => `Alert failed: channel=${channel} lead=${leadId} attempts=${attemptsMade}`;
