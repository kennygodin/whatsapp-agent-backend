export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
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
