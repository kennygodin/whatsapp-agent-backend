import * as Joi from 'joi';
import { ENV_VALIDATION_FAILED } from './config.constants';
import {
  LLM_PROVIDER_NAMES,
  LlmProviderName,
} from '../module/agent/agent.constants';

const PROVIDER_NAME_PATTERN = LLM_PROVIDER_NAMES.join('|');
const LLM_CHAIN_PATTERN = new RegExp(
  `^(${PROVIDER_NAME_PATTERN})(,(${PROVIDER_NAME_PATTERN}))*$`,
);

const requiredWhenInChain = (provider: LlmProviderName) =>
  Joi.string().when('LLM_PROVIDER_CHAIN', {
    is: Joi.string().pattern(new RegExp(`(^|,)${provider}(,|$)`)),
    // oxlint-disable-next-line unicorn/no-thenable -- Joi conditional API, not a Promise
    then: Joi.required(),
    otherwise: Joi.optional(),
  });

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
  LLM_PROVIDER_CHAIN: Joi.string().pattern(LLM_CHAIN_PATTERN).required(),
  GROQ_API_KEY: requiredWhenInChain('groq'),
  GROQ_MODEL: requiredWhenInChain('groq'),
  CEREBRAS_API_KEY: requiredWhenInChain('cerebras'),
  CEREBRAS_MODEL: requiredWhenInChain('cerebras'),
  GEMINI_API_KEY: requiredWhenInChain('gemini'),
  GEMINI_MODEL: requiredWhenInChain('gemini'),
  RESEND_API_KEY: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),
  ALERT_EMAIL: Joi.string().email().required(),
  ALERT_WHATSAPP: Joi.string()
    .pattern(/^\+\d+$/)
    .required(),
  PAYSTACK_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_[A-Za-z0-9]+$/)
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
