'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, ArrowDown, ArrowUp, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CreditBalance() {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const [balance, setBalance] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [balanceRes, ledgerRes] = await Promise.all([
          api.getCreditBalance(token),
          api.getCreditLedger(token, page),
        ]);
        setBalance(balanceRes.data);
        setLedger(ledgerRes.data?.data || []);
        setHasMore(ledgerRes.data?.hasMore || false);
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, page]);

  const handleBuyCredits = async (quantity: number) => {
    if (!token) return;
    setPurchasing(true);
    try {
      const res = await api.createCreditTopup(quantity, token);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      alert(err.message || t('checkoutFailed'));
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-8 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const available = balance?.available ?? 0;
  const lifetimeEarned = balance?.lifetimeEarned ?? 0;
  const lifetimeSpent = balance?.lifetimeSpent ?? 0;
  const usagePercent = lifetimeEarned > 0 ? Math.min(100, Math.round((lifetimeSpent / lifetimeEarned) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-primary/30">
          <CardContent className="p-6 text-center">
            <Coins className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-4xl font-bold text-primary">{available}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('availableCredits')}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{lifetimeEarned}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('lifetimeEarned')}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{lifetimeSpent}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('lifetimeSpent')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Usage Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t('creditUsage')}</span>
            <span className="text-sm text-muted-foreground">
              {t('usedOfEarned', { spent: lifetimeSpent, earned: lifetimeEarned })}
            </span>
          </div>
          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${usagePercent}%`,
                background: usagePercent > 80
                  ? 'linear-gradient(90deg, #ef4444, #f87171)'
                  : usagePercent > 50
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{t('percentUsed', { percent: usagePercent })}</span>
            <span className="text-xs font-medium text-primary">{t('remaining', { count: available })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t('buyCredits')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleBuyCredits(1)}
              disabled={purchasing}
              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
            >
              <div className="text-2xl font-bold group-hover:text-primary transition-colors">50</div>
              <div className="text-sm text-muted-foreground">{t('creditsUnit')}</div>
              <div className="mt-2 text-sm font-medium">$9.99</div>
              <div className="text-xs text-muted-foreground">{t('perCredit', { price: '$0.20' })}</div>
            </button>
            <button
              onClick={() => handleBuyCredits(2)}
              disabled={purchasing}
              className="p-4 rounded-lg border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all text-left group relative disabled:opacity-50"
            >
              <Badge className="absolute -top-2 right-3 text-[10px]">{t('popular')}</Badge>
              <div className="text-2xl font-bold text-primary">100</div>
              <div className="text-sm text-muted-foreground">{t('creditsUnit')}</div>
              <div className="mt-2 text-sm font-medium">$17.99</div>
              <div className="text-xs text-muted-foreground">{t('perCredit', { price: '$0.18' })}</div>
            </button>
            <button
              onClick={() => handleBuyCredits(4)}
              disabled={purchasing}
              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
            >
              <div className="text-2xl font-bold group-hover:text-primary transition-colors">200</div>
              <div className="text-sm text-muted-foreground">{t('creditsUnit')}</div>
              <div className="mt-2 text-sm font-medium">$29.99</div>
              <div className="text-xs text-muted-foreground">{t('perCredit', { price: '$0.15' })}</div>
            </button>
          </div>
          {purchasing && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              {t('redirectingToCheckout')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('transactionHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('noTransactions')}</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    {entry.amount > 0 ? (
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ArrowDown className="h-4 w-4 text-green-400" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ArrowUp className="h-4 w-4 text-red-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">{entry.sourceDetail || entry.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${entry.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {t('balance')}: {entry.balanceAfter}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {ledger.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('previous')}
              </Button>
              <span className="text-sm text-muted-foreground">{t('pageNumber', { page })}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                {t('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
