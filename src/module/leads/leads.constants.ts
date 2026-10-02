import { LeadStage } from '../../generated/prisma/client';

export const CLOSED_LEAD_STAGES: LeadStage[] = [
  LeadStage.converted,
  LeadStage.dropped_off,
];

export const ORDER_START_STAGES: LeadStage[] = [
  LeadStage.new,
  LeadStage.engaged,
];

export const LEAD_NOT_FOUND = 'Lead not found';
export const CUSTOMER_NOT_FOUND = 'Customer not found';
