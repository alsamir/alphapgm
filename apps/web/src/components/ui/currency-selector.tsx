'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  convertFromUSD,
  formatCurrency,
} from '@/lib/currency';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const STORAGE_KEY = 'catapp_currency';

// Map DB currency IDs to currency codes
const CURRENCY_ID_MAP: Record<number, string> = {
  1: 'USD',
  2: 'EUR',
  3: 'GBP',
  4: 'TRY',
  5: 'AED',
  6: 'SAR',
  7: 'MAD',
};

const CURRENCY_CODE_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(CURRENCY_ID_MAP).map(([id, code]) => [code, Number(id)])
);

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  convert: (amountUSD: number) => number;
  format: (amountUSD: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [mounted, setMounted] = useState(false);
  const { token, isAuthenticated, isLoading } = useAuth();
  const syncedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && CURRENCIES[stored]) {
        setCurrencyState(stored);
      }
    }
  }, []);

  // Sync currency from user profile when authenticated
  useEffect(() => {
    if (isLoading || !isAuthenticated || !token || syncedRef.current) return;
    syncedRef.current = true;
    api.getProfile(token).then((res) => {
      const currencyId = res.data?.settings?.currencyId;
      if (currencyId && CURRENCY_ID_MAP[currencyId]) {
        const code = CURRENCY_ID_MAP[currencyId];
        setCurrencyState(code);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, code);
        }
      }
    }).catch(() => {});
  }, [isLoading, isAuthenticated, token]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      syncedRef.current = false;
    }
  }, [isAuthenticated]);

  const setCurrency = useCallback((code: string) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code);
    }
    // Also save to user profile if authenticated
    if (token) {
      const currencyId = CURRENCY_CODE_TO_ID[code];
      if (currencyId) {
        api.updateSettings({ currencyId }, token).catch(() => {});
      }
    }
  }, [token]);

  const convert = useCallback(
    (amountUSD: number) => convertFromUSD(amountUSD, currency),
    [currency],
  );

  const format = useCallback(
    (amountUSD: number) => formatCurrency(convertFromUSD(amountUSD, currency), currency),
    [currency],
  );

  // During SSR or before hydration, use default currency to avoid mismatches
  const value: CurrencyContextType = {
    currency: mounted ? currency : DEFAULT_CURRENCY,
    setCurrency,
    convert: mounted ? convert : (amountUSD: number) => amountUSD,
    format: mounted ? format : (amountUSD: number) => formatCurrency(amountUSD, DEFAULT_CURRENCY),
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className={className || 'w-[130px] h-8 text-xs'}>
        <SelectValue>
          {CURRENCIES[currency]?.symbol} {currency}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span className="w-5 text-center">{CURRENCIES[code].symbol}</span>
              <span>{code}</span>
              <span className="text-muted-foreground text-xs ml-1">
                {CURRENCIES[code].name}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
