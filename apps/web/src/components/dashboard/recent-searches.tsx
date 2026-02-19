'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface LedgerEntry {
  id: number;
  amount: number;
  type: string;
  sourceDetail: string;
  sourceId: number | null;
  balanceAfter: number;
  createdAt: string;
}

export function RecentSearches() {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchSearches = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getCreditLedger(token, page);
        const allEntries = res.data?.data || [];
        // Filter to consumption entries only (converter lookups)
        const consumptions = allEntries.filter(
          (e: LedgerEntry) => e.amount < 0 && e.type !== 'AI_QUERY'
        );
        setEntries(consumptions);
        setHasMore(res.data?.hasMore || false);
      } catch (err) {
        console.error('Failed to fetch recent searches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearches();
  }, [token, page]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            {t('recentConverterLookups')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">{t('noConverterLookups')}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {t('searchToSeeHistory')}
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/">{t('searchConverters')}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                // Parse sourceDetail: usually contains converter name/brand info
                const detail = entry.sourceDetail || t('converterLookup');
                const parts = detail.split(' - ');
                const converterName = parts[0] || detail;
                const brand = parts[1] || '';

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Search className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{converterName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {brand && (
                            <Badge variant="outline" className="text-[10px]">
                              {brand}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.createdAt, t)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-red-400 font-medium">
                        {t('creditCount', { count: entry.amount })}
                      </span>
                      {entry.sourceId && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                          <Link href={`/converter/${entry.sourceId}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {entries.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
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

function formatDate(dateStr: string, t: (key: string, values?: Record<string, any>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('daysAgo', { count: diffDays });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
