import { registerAs } from '@nestjs/config';

export default registerAs('llm', () => ({
  chain: (process.env.LLM_PROVIDER_CHAIN ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL,
  },
  cerebras: {
    apiKey: process.env.CEREBRAS_API_KEY,
    model: process.env.CEREBRAS_MODEL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
  },
}));
