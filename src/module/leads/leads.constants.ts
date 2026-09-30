import { LeadStage } from '../../generated/prisma/client';

export const CLOSED_LEAD_STAGES: LeadStage[] = [
  LeadStage.converted,
  LeadStage.dropped_off,
];

export const LEAD_NOT_FOUND = 'Lead not found';
