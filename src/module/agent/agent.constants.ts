export const LLM_PROVIDERS = Symbol('LLM_PROVIDERS');
export const AGENT_TOOLS = Symbol('AGENT_TOOLS');

export const MAX_AGENT_ITERATIONS = 5;

export const SEARCH_CATALOG_TOOL_NAME = 'search_catalog';
export const SEARCH_CATALOG_DESCRIPTION =
  'Search the store catalog for products matching what the customer asked about. Returns up to 5 products with price and availability. Always use this before stating a price or availability.';
export const SEARCH_CATALOG_QUERY_DESCRIPTION =
  'Product keywords from the customer message, e.g. "power bank" or "wireless earbuds".';
export const SEARCH_QUERY_REQUIRED = 'query must be a non-empty string';

export const unknownToolMessage = (name: string) => `Unknown tool: ${name}`;
export const TOOL_UNAVAILABLE =
  'This tool is temporarily unavailable. Tell the customer you will check and get back to them.';
export const TOOL_EXECUTION_FAILED = 'Tool execution failed';
export const AGENT_ITERATION_CAP_REACHED = 'Agent iteration cap reached';

export const FAKE_PROVIDER_NAME = 'fake';
export const FAKE_DEFAULT_REPLY =
  '(fake model) Hello! How can I help you today?';
export const fakeToolSummary = (toolName: string, result: string) =>
  `(fake model) ${toolName} returned: ${result}`;

export const LLM_PROVIDER_NAMES = [
  'groq',
  'cerebras',
  'gemini',
  'fake',
] as const;
export type LlmProviderName = (typeof LLM_PROVIDER_NAMES)[number];

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
export const LLM_REASONING_EFFORT = 'low';

export const LLM_REQUEST_TIMEOUT_MS = 20_000;
export const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;
export const MAX_RATE_LIMIT_COOLDOWN_MS = 15 * 60_000;

export const ALL_LLM_PROVIDERS_FAILED = 'All LLM providers failed';
export const llmTimeoutMessage = (provider: string) =>
  `${provider} request timed out`;
export const llmRateLimitedMessage = (provider: string, cooldownMs: number) =>
  `${provider} rate limited, cooling down for ${Math.round(cooldownMs / 1000)}s`;
export const llmUnavailableMessage = (provider: string) =>
  `${provider} unavailable, trying next provider`;
export const llmRejectedMessage = (provider: string) =>
  `${provider} rejected the request (check API key, model name or request shape)`;

export const HISTORY_MESSAGE_LIMIT = 12;
export const MAX_HISTORY_MESSAGE_CHARS = 1000;
export const MEDIA_PLACEHOLDER = '[sent a photo, voice note or file]';
