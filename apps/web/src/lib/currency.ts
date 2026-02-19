// Currency conversion utilities for Catalyser
// Exchange rates are hardcoded from USD as the base currency.
// In the future these could be fetched from an API endpoint.

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // rate from USD
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', rate: 0.79 },
  TRY: { code: 'TRY', symbol: '\u20BA', name: 'Turkish Lira', rate: 32.5 },
  AED: { code: 'AED', symbol: '\u062F.\u0625', name: 'UAE Dirham', rate: 3.67 },
  SAR: { code: 'SAR', symbol: '\uFDFC', name: 'Saudi Riyal', rate: 3.75 },
  MAD: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', rate: 10.1 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

export const DEFAULT_CURRENCY = 'USD';

/**
 * Convert an amount from USD to the target currency.
 */
export function convertFromUSD(amount: number, targetCurrency: string): number {
  const info = CURRENCIES[targetCurrency];
  if (!info) return amount;
  return amount * info.rate;
}

/**
 * Format an amount with the appropriate currency symbol.
 * Uses .toFixed(2) + regex instead of .toLocaleString() to avoid SSR hydration mismatches.
 */
export function formatCurrency(amount: number, currency: string): string {
  const info = CURRENCIES[currency];
  if (!info) {
    // Fallback: format as USD
    const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `$${formatted}`;
  }

  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${info.symbol}${formatted}`;
}
