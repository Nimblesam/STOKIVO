export function formatMoney(minorUnits: number, currency: string = 'GBP'): string {
  const major = minorUnits / 100;
  const localeMap: Record<string, string> = {
    GBP: 'en-GB', NGN: 'en-NG', USD: 'en-US', EUR: 'de-DE', CAD: 'en-CA',
    GHS: 'en-GH', KES: 'en-KE', ZAR: 'en-ZA', INR: 'en-IN', AED: 'ar-AE', AUD: 'en-AU',
  };
  const locale = localeMap[currency] || 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(major);
}

export function formatCompact(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}
