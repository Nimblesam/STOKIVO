import type { Currency } from './types';

export function formatMoney(minorUnits: number, currency: Currency = 'GBP'): string {
  const major = minorUnits / 100;
  if (currency === 'GBP') {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(major);
  }
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(major);
}

export function formatCompact(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}
