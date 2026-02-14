'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminUsers } from './admin-users';
import { AdminConverters } from './admin-converters';
import { Users, Package, CreditCard, BarChart3, DollarSign, Search, LayoutDashboard } from 'lucide-react';

type AdminTab = 'overview' | 'converters' | 'users';

export function AdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const [statsRes, revenueRes] = await Promise.all([
          api.getAdminDashboard(token),
          api.getAdminRevenue(token),
        ]);
        setStats(statsRes.data);
        setRevenue(revenueRes.data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'converters' as AdminTab, label: 'Converters', icon: Package },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin <span className="text-primary">Panel</span></h1>
        <p className="text-muted-foreground mt-1">Manage your platform</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-4 w-4 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Total Users</span>
                </div>
                <div className="text-2xl font-bold">{stats?.totalUsers ?? '—'}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-xs">Converters</span>
                </div>
                <div className="text-2xl font-bold">{stats?.totalConverters?.toLocaleString() ?? '—'}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">Active Subs</span>
                </div>
                <div className="text-2xl font-bold">{stats?.activeSubscriptions ?? '—'}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">MRR</span>
                </div>
                <div className="text-2xl font-bold text-primary">${revenue?.mrr?.toFixed(2) ?? '0.00'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New signups (30d)</span>
                    <span className="font-medium">{stats?.recentSignups ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Searches today</span>
                    <span className="font-medium">{stats?.searchesToday ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Credits consumed</span>
                    <span className="font-medium">{stats?.totalCreditsSpent ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm">Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                {revenue?.byPlan ? (
                  <div className="space-y-3">
                    {Object.entries(revenue.byPlan).map(([plan, count]) => (
                      <div key={plan} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{plan}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subscriptions yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'converters' && <AdminConverters />}
      {activeTab === 'users' && <AdminUsers />}
    </div>
  );
}
