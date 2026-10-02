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
export const agentTurnSummary = (
  leadId: string,
  skill: { id: string; version: number },
  result: {
    provider: string;
    iterations: number;
    toolCalls: string[];
    corrections: number;
    rejected: boolean;
  },
) =>
  `lead=${leadId} skill=${skill.id}@v${skill.version} provider=${result.provider} iterations=${result.iterations} tools=[${result.toolCalls.join(',')}] corrections=${result.corrections} rejected=${result.rejected}`;

export const ungroundedPricesLog = (leadId: string, amounts: number[]) =>
  `lead=${leadId} reply mentioned ungrounded prices ${formatPriceList(amounts)}`;

export const MAX_REPLY_CORRECTIONS = 1;
export const AGENT_REPLY_REJECTED =
  'Agent reply failed validation after correction';

export const formatPriceList = (amounts: number[]) =>
  amounts.map((amount) => `₦${amount.toLocaleString('en-NG')}`).join(', ');
export const ungroundedPriceCorrection = (amounts: number[]) =>
  `Automatic check: your reply mentions ${formatPriceList(amounts)}, which did not come from a search_catalog result in this conversation. Rewrite the reply using only products and prices returned by search_catalog. If you want to suggest an alternative product, search for it first. If nothing suitable was found, say so.`;
export const GROUNDING_FALLBACK_REPLY =
  "Sorry, I couldn't confirm that. Which product would you like me to check for you?";

export const HISTORY_MESSAGE_LIMIT = 12;
export const MAX_HISTORY_MESSAGE_CHARS = 1000;
export const MEDIA_PLACEHOLDER = '[sent a photo, voice note or file]';
export const ESCALATE_TOOL_NAME = 'escalate_to_human';
export const ESCALATE_DESCRIPTION =
  'Hand this conversation to a human team member and pause automated replies. Use it when the customer asks for a person, is upset or complaining, asks about refunds, returns, warranty or a problem with an order, or when you cannot help after trying. After calling it, tell the customer a team member will reply in this chat soon.';
export const ESCALATE_REASON_DESCRIPTION =
  'One short sentence for the team member, e.g. "Customer wants a refund for a faulty charger".';
export const ESCALATION_REASON_REQUIRED = 'reason must be a non-empty string';
export const MAX_ESCALATION_REASON_LENGTH = 300;

export const CREATE_ORDER_TOOL_NAME = 'create_order';
export const CREATE_ORDER_DESCRIPTION =
  "Create the customer's order for one product, replacing any order they have not paid for yet. Use it once the customer has confirmed the product and quantity. Returns the order with the total price calculated by the store; always use that total and never calculate prices yourself.";
export const PRODUCT_ID_DESCRIPTION =
  'The productId exactly as returned by search_catalog.';
export const QUANTITY_DESCRIPTION = 'How many units the customer wants.';
export const EMAIL_DESCRIPTION =
  "The customer's email address, only if they gave it in this conversation. Leave it out otherwise.";
export const ORDER_ARGUMENTS_INVALID =
  'productId must be a string and quantity must be a number.';

export const GET_ORDER_STATUS_TOOL_NAME = 'get_order_status';
export const GET_ORDER_STATUS_DESCRIPTION =
  "Look up this customer's most recent orders with their status (pending, paid or cancelled) and totals. Use it when they ask about their order.";

export const GENERATE_PAYMENT_LINK_TOOL_NAME = 'generate_payment_link';
export const GENERATE_PAYMENT_LINK_DESCRIPTION =
  "Get the secure Paystack payment link for the customer's unpaid order. Returns the same link if one already exists. Send the paymentUrl to the customer exactly as returned, on its own line.";

export const ungroundedLinkCorrection = (urls: string[]) =>
  `Automatic check: your reply contains ${urls.join(', ')}, which did not come from a tool result in this conversation. Only share links exactly as a tool returned them. If you need the payment link, call generate_payment_link.`;
export const ungroundedLinksLog = (leadId: string, urls: string[]) =>
  `lead=${leadId} reply contained ungrounded links ${urls.join(', ')}`;
