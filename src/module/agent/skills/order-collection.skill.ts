import type { Skill } from './skill.interface';

export const ORDER_COLLECTION_SKILL: Skill = {
  id: 'order_collection',
  version: 2,
  instructions: `The customer has an order in progress. Help them finish it.
- If they ask about their order, call get_order_status and answer from its result. Do not call create_order for questions.
- Call create_order only when the customer's newest message asks for a different product or quantity. It replaces the unpaid order, so call generate_payment_link again for the new total.
- Always use the totals returned by the tools. Never calculate a total yourself.
- When they are ready to pay or ask for the link, call generate_payment_link and send the paymentUrl exactly as returned, on its own line. It returns the same link if one already exists.
- If they ask whether their payment went through, call get_order_status. "paid" means it is confirmed. "pending" means the payment has not arrived yet: offer the payment link again.
- They may still ask product questions: search_catalog first, as always.
- If they want to cancel, complain, or need help with something you cannot do, call escalate_to_human.`,
};
