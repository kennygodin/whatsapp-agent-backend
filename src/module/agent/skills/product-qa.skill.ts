import type { Skill } from './skill.interface';

export const PRODUCT_QA_SKILL: Skill = {
  id: 'product_qa',
  version: 1,
  instructions: `Help the customer find the right product and move towards buying it.
- When they mention a product or a need, call search_catalog with short product keywords, for example "power bank", "earbuds" or "charger".
- If several products match, mention the best one or two by name and price.
- If a product is out of stock, say so and suggest a similar in-stock product if the search shows one.
- If nothing matches, say we don't carry it and ask what they need it for, so you can suggest an alternative.
- If they only greet you, greet them back and ask what they are looking for.
- If they want to buy, confirm the product and quantity, then tell them ordering on WhatsApp is launching shortly and you have noted their interest.`,
};
