export const MCP_ROUTE = 'mcp';
export const MCP_SERVER_INFO = {
  name: 'whatsapp-sales-admin',
  version: '1.0.0',
};
export const ADMIN_TOOLS = Symbol('ADMIN_TOOLS');

export const MCP_METHOD_NOT_ALLOWED =
  'This MCP server is stateless: send JSON-RPC requests with POST';
export const ADMIN_TOOL_FAILED = 'Admin tool failed';
export const ADMIN_TOOL_UNAVAILABLE =
  'This tool failed on the server. Try again shortly.';

export const DEFAULT_STATS_DAYS = 30;
export const MAX_STATS_DAYS = 365;
export const DEFAULT_CONVERSATIONS_LIMIT = 20;
export const MAX_CONVERSATIONS_LIMIT = 50;
export const DEFAULT_MESSAGES_LIMIT = 30;
export const MAX_MESSAGES_LIMIT = 100;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const GET_LEAD_FUNNEL_STATS = {
  name: 'get_lead_funnel_stats',
  title: 'Lead funnel stats',
  description:
    'Funnel for leads created in the last N days: how many reached each stage (new, engaged, order_started, converted, dropped_off), the conversion rate, revenue from payments in that period, and how many chats are paused for a human right now.',
};
export const LIST_CONVERSATIONS = {
  name: 'list_conversations',
  title: 'List conversations',
  description:
    'Most recently active WhatsApp conversations (leads) with customer name, phone, stage, bot mode and the last message. Filter by stage or botMode, e.g. botMode "paused" for chats waiting on a human.',
};
export const GET_CONVERSATION_MESSAGES = {
  name: 'get_conversation_messages',
  title: 'Conversation messages',
  description:
    'Messages of one conversation in chronological order, including delivery status. Use a leadId from list_conversations.',
};
export const GET_LEAD_ORDERS = {
  name: 'get_lead_orders',
  title: 'Orders for a lead',
  description:
    'All orders for one lead with status (pending, paid, cancelled), total, Paystack reference, and when the payment link, reminder and payment happened.',
};
export const LIST_PRODUCTS = {
  name: 'list_products',
  title: 'List products',
  description:
    'The full catalog with exact stock counts and active/inactive status (customers only ever see in stock / out of stock).',
};
export const RESUME_CONVERSATION = {
  name: 'resume_conversation',
  title: 'Resume bot replies',
  description:
    'Hand a paused (escalated) conversation back to the bot so it replies to the customer again. Only use after the human has finished handling the chat.',
};
export const NOT_PAUSED_MESSAGE =
  'Nothing changed: this lead does not exist or its bot is not paused.';
export const RESUMED_MESSAGE =
  'The bot will answer this customer’s next message.';
export const conversationResumedLog = (leadId: string) =>
  `Lead ${leadId} handed back to the bot via MCP`;
