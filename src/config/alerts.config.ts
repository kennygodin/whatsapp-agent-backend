import { registerAs } from '@nestjs/config';

export default registerAs('alerts', () => ({
  email: process.env.ALERT_EMAIL,
  whatsapp: process.env.ALERT_WHATSAPP,
}));
