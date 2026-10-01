const NAIRA_AMOUNT = /(?:₦|NGN\s?|N(?=\d))\s?(\d{1,3}(?:,\d{3})+|\d+)/gi;

export function extractNairaAmounts(text: string): number[] {
  return [...text.matchAll(NAIRA_AMOUNT)].map((match) =>
    Number(match[1].replace(/,/g, '')),
  );
}

export function findUngroundedPrices(reply: string, facts: string): number[] {
  const known = new Set(extractNairaAmounts(facts));
  return [
    ...new Set(
      extractNairaAmounts(reply).filter((amount) => !known.has(amount)),
    ),
  ];
}
