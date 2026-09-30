import * as Joi from 'joi';
import { ENV_VALIDATION_FAILED } from './config.constants';

const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  CORS_ORIGINS: Joi.string().optional(),
  PUBLIC_BASE_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_WHATSAPP_FROM: Joi.string()
    .pattern(/^whatsapp:\+\d+$/)
    .required(),
});

export function validateEnv(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`${ENV_VALIDATION_FAILED}: ${error.message}`);
  }

  return value;
}
