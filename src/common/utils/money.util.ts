const NAIRA_FORMATTER = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function formatNaira(kobo: number): string {
  return NAIRA_FORMATTER.format(kobo / 100);
}
