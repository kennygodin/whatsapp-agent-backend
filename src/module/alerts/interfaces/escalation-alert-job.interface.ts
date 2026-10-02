export interface EscalationAlertJob {
  leadId: string;
  customerPhone: string;
  customerName: string | null;
  reason: string;
  escalatedAt: string;
}
