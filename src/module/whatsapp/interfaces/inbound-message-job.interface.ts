export interface InboundMessageJob {
  messageSid: string;
  phone: string;
  profileName?: string;
  body: string;
  numMedia: number;
}
