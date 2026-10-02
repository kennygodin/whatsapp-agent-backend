import { describe, expect, it } from 'bun:test';
import { extractUrls, findUngroundedUrls } from './link-check';

describe('extractUrls', () => {
  it('finds links and drops trailing punctuation', () => {
    expect(
      extractUrls('Pay here: https://checkout.paystack.com/abc123. Thanks!'),
    ).toEqual(['https://checkout.paystack.com/abc123']);
  });

  it('stops at WhatsApp formatting characters', () => {
    expect(extractUrls('*https://checkout.paystack.com/abc*')).toEqual([
      'https://checkout.paystack.com/abc',
    ]);
  });
});

describe('findUngroundedUrls', () => {
  const toolResult = JSON.stringify({
    ok: true,
    data: { paymentUrl: 'https://checkout.paystack.com/abc123' },
  });

  it('accepts the exact link a tool returned', () => {
    expect(
      findUngroundedUrls(
        'Pay here:\nhttps://checkout.paystack.com/abc123',
        toolResult,
      ),
    ).toEqual([]);
  });

  it('flags a link the model altered or invented', () => {
    expect(
      findUngroundedUrls(
        'Pay here: https://checkout.paystack.com/abc124',
        toolResult,
      ),
    ).toEqual(['https://checkout.paystack.com/abc124']);
  });
});
