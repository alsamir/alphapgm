'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, ArrowDown, ArrowUp } from 'lucide-react';

export function CreditBalance() {
  const { token } = useAuth();
  const [balance, setBalance] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [balanceRes, ledgerRes] = await Promise.all([
          api.getCreditBalance(token),
          api.getCreditLedger(token),
        ]);
        setBalance(balanceRes.data);
        setLedger(ledgerRes.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleTopup = async () => {
    if (!token) return;
    try {
      const res = await api.getCreditBalance(token); // placeholder - would call topup endpoint
      // In real implementation, redirect to Stripe checkout
      alert('Credit top-up would redirect to Stripe checkout');
    } catch (err) {
      console.error('Top-up failed:', err);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading credits...</div>;

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-primary/30">
          <CardContent className="p-6 text-center">
            <Coins className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-4xl font-bold text-primary">{balance?.available ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Available Credits</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{balance?.lifetimeEarned ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Lifetime Earned</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-foreground">{balance?.lifetimeSpent ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Lifetime Spent</div>
          </CardContent>
        </Card>
      </div>

      {/* Top-up Button */}
      <Button onClick={handleTopup} variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Buy 50 Credits — $9.99
      </Button>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    {entry.amount > 0 ? (
                      <ArrowDown className="h-4 w-4 text-green-400" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{entry.sourceDetail || entry.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${entry.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Bal: {entry.balanceAfter}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
