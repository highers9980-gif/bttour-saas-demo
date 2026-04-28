import type { CurrencyCode } from '../types/money';

const EXPONENT: Record<CurrencyCode, number> = {
  KRW: 0,
  VND: 0,
  USD: 2,
  EUR: 2,
  AUD: 2,
  SGD: 2,
  CNY: 2,
};

export function minorExponent(currency: CurrencyCode): number {
  return EXPONENT[currency];
}

/** major(예: 12345.67 USD) → minor(1234567 cents) */
export function parseMajorToMinor(currency: CurrencyCode, amount: number): number {
  const e = minorExponent(currency);
  if (e === 0) return Math.trunc(amount);
  return Math.round(amount * 10 ** e);
}

export function formatMinor(currency: CurrencyCode, minor: number): string {
  const e = minorExponent(currency);
  if (e === 0) return new Intl.NumberFormat('ko-KR').format(minor);
  const major = minor / 10 ** e;
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: e,
    maximumFractionDigits: e,
  }).format(major);
}
