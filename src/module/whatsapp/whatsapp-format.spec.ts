import { describe, expect, it } from 'bun:test';
import { toWhatsAppFormatting } from './whatsapp-format';

describe('toWhatsAppFormatting', () => {
  it.each([
    [
      'Yes, *Wireless Earbuds* for **₦32,000**.',
      'Yes, *Wireless Earbuds* for *₦32,000*.',
    ],
    ['**20,000mAh Power Bank** – ₦25,000', '*20,000mAh Power Bank* – ₦25,000'],
    ['already *fine*', 'already *fine*'],
    ['## Options\n- one', 'Options\n- one'],
    [
      'see [our site](https://example.com) now',
      'see our site (https://example.com) now',
    ],
    ['__note__', '_note_'],
    ['2 * 3 = 6', '2 * 3 = 6'],
  ])('%s', (input, expected) => {
    expect(toWhatsAppFormatting(input)).toBe(expected);
  });
});
