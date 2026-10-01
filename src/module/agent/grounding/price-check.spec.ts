import { describe, expect, it } from 'bun:test';
import { extractNairaAmounts, findUngroundedPrices } from './price-check';

describe('extractNairaAmounts', () => {
  it.each([
    ['*Power Bank* – ₦25,000', [25000]],
    ['₦ 18,500 or ₦4,500', [18500, 4500]],
    ['NGN 32000', [32000]],
    ['N55,000 only', [55000]],
    ['no price here, 20,000mAh', []],
  ])('%s', (text, expected) => {
    expect(extractNairaAmounts(text)).toEqual(expected);
  });
});

describe('findUngroundedPrices', () => {
  const searchResult = JSON.stringify({
    ok: true,
    data: {
      products: [{ name: 'Smart Watch', price: '₦55,000', inStock: false }],
    },
  });

  it('accepts prices that came from a tool result', () => {
    expect(
      findUngroundedPrices(
        'The *Smart Watch* is ₦55,000 but out of stock.',
        searchResult,
      ),
    ).toEqual([]);
  });

  it('flags a price that appears nowhere in the facts', () => {
    expect(
      findUngroundedPrices(
        'Smart Watch – ₦55,000, out of stock. Try a fitness band for ₦35,000.',
        searchResult,
      ),
    ).toEqual([35000]);
  });

  it('ignores numbers that are not prices', () => {
    expect(findUngroundedPrices('The 20,000mAh model', searchResult)).toEqual(
      [],
    );
  });
});
