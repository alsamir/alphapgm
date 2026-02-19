'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  AlertTriangle,
  Loader2,
  Plus,
  Minus,
  Send,
  Filter,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreditStats {
  totalDistributed: number;
  totalConsumed: number;
  totalAvailable: number;
  averagePerUser: number;
}

interface LedgerEntry {
  id: number;
  userId: number;
  userEmail: string;
  type: string;
  amount: number;
  balanceAfter: number;
  sourceDetail: string;
  createdAt: string;
}

const CREDIT_TYPES = [
  'SIGNUP_BONUS',
  'SUBSCRIPTION',
  'PURCHASE',
  'CONVERTER_LOOKUP',
  'AI_QUERY',
  'MANUAL',
  'TOPUP',
] as const;

type CreditType = (typeof CREDIT_TYPES)[number];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  SIGNUP_BONUS: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  SUBSCRIPTION: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  PURCHASE: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  CONVERTER_LOOKUP: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  AI_QUERY: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  MANUAL: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  TOPUP: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
};

const ITEMS_PER_PAGE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatNumber(num: number): string {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ---------------------------------------------------------------------------
// Reusable inline Dialog (matches admin-converters.tsx pattern)
// ---------------------------------------------------------------------------

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[90vh] overflow-y-auto">
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  subtext?: string;
}) {
  return (
    <Card className="bg-card border-border relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: color }} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <span className="text-xs">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {subtext && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground">{subtext}</span>
              </div>
            )}
          </div>
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="py-3 px-2">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PaginationControls({
  page,
  hasMore,
  loading,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (p: number) => void;
}) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = page + 2;
  for (let p = start; p <= end; p++) {
    if (p < page || p === page || (p > page && hasMore)) {
      pages.push(p);
    }
  }
  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, idx) => {
          const showEllipsisBefore = idx > 0 && p - pages[idx - 1] > 1;
          return (
            <span key={p} className="flex items-center">
              {showEllipsisBefore && (
                <span className="px-1 text-xs text-muted-foreground">...</span>
              )}
              <Button
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                disabled={loading}
                onClick={() => onPageChange(p)}
                className="h-8 w-8 p-0 text-xs"
              >
                {p}
              </Button>
            </span>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || loading}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminCredits() {
  const { token } = useAuth();

  // --- Stats ---
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Ledger ---
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Adjustment form ---
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustUserId, setAdjustUserId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // --- Confirm deduction dialog ---
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- User search for adjustment ---
  const [userSearchResults, setUserSearchResults] = useState<
    { id: number; email: string; name: string }[]
  >([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------- Toast helper -------
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ------- Debounced search for ledger -------
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ------- Fetch stats -------
  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await api.getAdminCreditStats(token);
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to fetch credit stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  // ------- Fetch ledger -------
  const fetchLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter) params.type = typeFilter;

      const res = await api.getAdminCreditLedger(params, token);
      setEntries(res.data?.data || []);
      setHasMore(res.data?.hasMore || false);
    } catch (err) {
      console.error('Failed to fetch credit ledger:', err);
      showToast('Failed to fetch credit ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, typeFilter, showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // ------- User search for adjustment -------
  const handleUserEmailSearch = useCallback(
    (value: string) => {
      setAdjustEmail(value);
      setAdjustUserId(null);

      if (userSearchTimerRef.current) {
        clearTimeout(userSearchTimerRef.current);
      }

      if (!value || value.length < 2) {
        setUserSearchResults([]);
        return;
      }

      userSearchTimerRef.current = setTimeout(async () => {
        if (!token) return;
        setUserSearchLoading(true);
        try {
          const res = await api.listUsers({ search: value, limit: 8 }, token);
          const users = res.data?.data || [];
          setUserSearchResults(
            users.map((u: any) => ({ id: u.id, email: u.email, name: u.name || u.username })),
          );
        } catch {
          setUserSearchResults([]);
        } finally {
          setUserSearchLoading(false);
        }
      }, 300);
    },
    [token],
  );

  const selectUser = (user: { id: number; email: string; name: string }) => {
    setAdjustEmail(user.email);
    setAdjustUserId(user.id);
    setUserSearchResults([]);
  };

  // ------- Handle credit adjustment -------
  const handleAdjustSubmit = useCallback(async () => {
    if (!token || !adjustUserId) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setAdjustError('Amount must be a non-zero number');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('A reason is required');
      return;
    }

    // If it's a deduction, show confirmation first
    if (amount < 0 && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError(null);
    try {
      await api.adjustUserCredits(
        { userId: adjustUserId, amount, reason: adjustReason.trim() },
        token,
      );
      showToast(
        `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits`,
        'success',
      );
      setAdjustOpen(false);
      setConfirmOpen(false);
      resetAdjustForm();
      // Refresh data
      fetchStats();
      fetchLedger();
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to adjust credits');
    } finally {
      setAdjustSubmitting(false);
    }
  }, [token, adjustUserId, adjustAmount, adjustReason, confirmOpen, showToast, fetchStats, fetchLedger]);

  const resetAdjustForm = () => {
    setAdjustEmail('');
    setAdjustUserId(null);
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustError(null);
    setUserSearchResults([]);
  };

  const openAdjustForm = () => {
    resetAdjustForm();
    setAdjustOpen(true);
  };

  // ------- Type filter change -------
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 text-white'
              : 'bg-destructive/90 text-destructive-foreground'
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* ================================================================ */}
        {/* Credit Overview Stats                                           */}
        {/* ================================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Total Distributed"
                value={formatNumber(stats?.totalDistributed ?? 0)}
                icon={TrendingUp}
                color="#00e88f"
                subtext="All time credits added"
              />
              <StatCard
                label="Total Consumed"
                value={formatNumber(stats?.totalConsumed ?? 0)}
                icon={TrendingDown}
                color="#f87171"
                subtext="All time credits used"
              />
              <StatCard
                label="Available Balance"
                value={formatNumber(stats?.totalAvailable ?? 0)}
                icon={Coins}
                color="#5b9cf5"
                subtext="Across all users"
              />
              <StatCard
                label="Avg Per User"
                value={(stats?.averagePerUser ?? 0).toFixed(1)}
                icon={Users}
                color="#ffd866"
                subtext="Credits per active user"
              />
            </>
          )}
        </div>

        {/* ================================================================ */}
        {/* Credit Audit Trail                                              */}
        {/* ================================================================ */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Credit Audit Trail</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  All credit transactions across all users.
                </p>
              </div>
              <Button size="sm" onClick={openAdjustForm}>
                <Coins className="h-4 w-4 mr-1.5" />
                Adjust Credits
              </Button>
            </div>

            {/* Filters row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-background"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={typeFilter}
                  onChange={handleTypeFilterChange}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <option value="">All Types</option>
                  {CREDIT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground">User</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-right">
                      Amount
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-right">
                      Balance After
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground">Source Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Coins className="h-8 w-8 text-muted-foreground/50" />
                          <span className="text-muted-foreground">No credit entries found</span>
                          {(debouncedSearch || typeFilter) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearch('');
                                setTypeFilter('');
                              }}
                              className="text-xs mt-1"
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                      const typeStyle = TYPE_COLORS[entry.type] || {
                        bg: 'bg-secondary/50',
                        text: 'text-foreground',
                      };
                      const isPositive = entry.amount > 0;

                      return (
                        <tr
                          key={entry.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className="truncate block max-w-[200px]"
                              title={entry.userEmail}
                            >
                              {entry.userEmail}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${typeStyle.bg} ${typeStyle.text}`}
                            >
                              {formatTypeLabel(entry.type)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-sm font-semibold">
                            <span
                              className={isPositive ? 'text-[#00e88f]' : 'text-red-400'}
                            >
                              {isPositive ? '+' : ''}
                              {entry.amount}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-xs text-muted-foreground">
                            {entry.balanceAfter}
                          </td>
                          <td className="py-3 px-2 text-xs text-muted-foreground max-w-[200px] truncate">
                            {entry.sourceDetail || '--'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              hasMore={hasMore}
              loading={loading}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Manual Credit Adjustment Dialog                                    */}
      {/* ================================================================== */}
      <Dialog open={adjustOpen} onOpenChange={(open) => { setAdjustOpen(open); if (!open) resetAdjustForm(); }}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Adjust User Credits</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manually add or deduct credits for a user account.
            </p>
          </div>

          {adjustError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {adjustError}
            </div>
          )}

          <div className="space-y-3">
            {/* User search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                User Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={adjustEmail}
                  onChange={(e) => handleUserEmailSearch(e.target.value)}
                  placeholder="Search user by email..."
                  className="pl-9 bg-background"
                />
                {userSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* User search dropdown */}
              {userSearchResults.length > 0 && !adjustUserId && (
                <div className="mt-1 rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{user.email}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {user.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {adjustUserId && (
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    User ID: {adjustUserId}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-[#00e88f] border-[#00e88f]/30">
                    Selected
                  </Badge>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={() => {
                    const current = parseInt(adjustAmount, 10) || 0;
                    if (current > 0) {
                      setAdjustAmount(String(-current));
                    }
                  }}
                  title="Make negative (deduction)"
                >
                  <Minus className="h-4 w-4 text-red-400" />
                </Button>
                <Input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 50 or -10"
                  className="bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={() => {
                    const current = parseInt(adjustAmount, 10) || 0;
                    if (current < 0) {
                      setAdjustAmount(String(-current));
                    }
                  }}
                  title="Make positive (addition)"
                >
                  <Plus className="h-4 w-4 text-[#00e88f]" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Use positive values to add credits, negative to deduct.
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Reason / Note <span className="text-destructive">*</span>
              </label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Compensation for service issue"
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustOpen(false)}
              disabled={adjustSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={adjustSubmitting || !adjustUserId || !adjustAmount || !adjustReason.trim()}
            >
              {adjustSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Submit Adjustment
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ================================================================== */}
      {/* Deduction Confirmation Dialog                                      */}
      {/* ================================================================== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Confirm Credit Deduction</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You are about to deduct{' '}
                <span className="font-semibold text-red-400">
                  {Math.abs(parseInt(adjustAmount, 10) || 0)} credits
                </span>{' '}
                from{' '}
                <span className="font-medium text-foreground">{adjustEmail}</span>.
              </p>
              {adjustReason && (
                <p className="text-sm text-muted-foreground mt-2">
                  Reason: <span className="text-foreground">{adjustReason}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={adjustSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAdjustSubmit}
              disabled={adjustSubmitting}
            >
              {adjustSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Deduction'
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
