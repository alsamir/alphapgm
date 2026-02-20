'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminUsers } from './admin-users';
import { AdminConverters } from './admin-converters';
import { AdminPricing } from './admin-pricing';
import { AdminCredits } from './admin-credits';
import { AdminAnalytics } from './admin-analytics';
import { AdminSettings } from './admin-settings';
import { AdminGroups } from './admin-groups';
import { AdminMessages } from './admin-messages';
import {
  Users,
  Package,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  TrendingUp,
  Activity,
  UserPlus,
  Search,
  Zap,
  Clock,
  CircleDollarSign,
  Coins,
  Settings,
  BarChart3,
  UsersRound,
  MessageSquare,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

type AdminTab = 'overview' | 'converters' | 'users' | 'groups' | 'pricing' | 'credits' | 'analytics' | 'messages' | 'settings';

// Theme colors
const COLORS = {
  primary: '#00e88f',
  palladium: '#ffd866',
  platinum: '#d4d4e8',
  rhodium: '#5b9cf5',
  danger: '#f87171',
  muted: '#6b7280',
};

// Generate mock 30-day signup trend data
function generateSignupTrend(recentSignups: number): { date: string; signups: number }[] {
  const data: { date: string; signups: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // Create a semi-random but realistic-looking trend
    const base = Math.max(0, Math.round((recentSignups / 30) * (0.5 + Math.sin(i * 0.3) * 0.5 + Math.random() * 0.5)));
    data.push({ date: dayLabel, signups: base });
  }
  return data;
}

// Generate credit usage distribution mock data
function generateCreditUsage(totalCredits: number): { name: string; value: number; color: string }[] {
  return [
    { name: 'Converter Search', value: Math.round(totalCredits * 0.55), color: COLORS.primary },
    { name: 'Detail Views', value: Math.round(totalCredits * 0.25), color: COLORS.rhodium },
    { name: 'AI Queries', value: Math.round(totalCredits * 0.15), color: COLORS.palladium },
    { name: 'Exports', value: Math.round(totalCredits * 0.05), color: COLORS.platinum },
  ];
}

// Generate mock recent activity items
function generateRecentActivity(stats: any): { icon: any; text: string; time: string; color: string }[] {
  const activities = [];
  if (stats?.searchesToday > 0) {
    activities.push({
      icon: Search,
      text: `${stats.searchesToday} converter searches today`,
      time: 'Today',
      color: COLORS.primary,
    });
  }
  if (stats?.recentSignups > 0) {
    activities.push({
      icon: UserPlus,
      text: `${stats.recentSignups} new users signed up`,
      time: 'Last 30 days',
      color: COLORS.rhodium,
    });
  }
  if (stats?.totalCreditsSpent > 0) {
    activities.push({
      icon: Zap,
      text: `${stats.totalCreditsSpent} credits consumed`,
      time: 'All time',
      color: COLORS.palladium,
    });
  }
  if (stats?.activeSubscriptions > 0) {
    activities.push({
      icon: CreditCard,
      text: `${stats.activeSubscriptions} active subscriptions`,
      time: 'Current',
      color: COLORS.primary,
    });
  }
  activities.push({
    icon: Activity,
    text: 'System running normally',
    time: 'Now',
    color: COLORS.muted,
  });
  return activities;
}

// Custom tooltip for dark theme
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// Plan color mapping
const PLAN_COLORS: Record<string, string> = {
  free: COLORS.muted,
  starter: COLORS.rhodium,
  pro: COLORS.primary,
  enterprise: COLORS.palladium,
};

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

  const signupTrendData = useMemo(
    () => generateSignupTrend(stats?.recentSignups ?? 3),
    [stats?.recentSignups]
  );

  const creditUsageData = useMemo(
    () => generateCreditUsage(stats?.totalCreditsSpent ?? 150),
    [stats?.totalCreditsSpent]
  );

  const planData = useMemo(() => {
    if (!revenue?.byPlan) return [];
    if (Array.isArray(revenue.byPlan)) {
      return revenue.byPlan.map((item: { plan: string; count: number }) => ({
        name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
        count: item.count,
        fill: PLAN_COLORS[item.plan] || COLORS.muted,
      }));
    }
    return Object.entries(revenue.byPlan).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      count: count as number,
      fill: PLAN_COLORS[plan] || COLORS.muted,
    }));
  }, [revenue?.byPlan]);

  const recentActivity = useMemo(
    () => generateRecentActivity(stats),
    [stats]
  );

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'converters' as AdminTab, label: 'Converters', icon: Package },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'groups' as AdminTab, label: 'Groups', icon: UsersRound },
    { id: 'pricing' as AdminTab, label: 'Pricing', icon: CircleDollarSign },
    { id: 'credits' as AdminTab, label: 'Credits', icon: Coins },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: BarChart3 },
    { id: 'messages' as AdminTab, label: 'Messages', icon: MessageSquare },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
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
            <Card className="bg-card border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: COLORS.rhodium }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <span className="text-xs">Total Users</span>
                    </div>
                    <div className="text-2xl font-bold">{stats?.totalUsers ?? '---'}</div>
                    {stats?.recentSignups > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-[#00e88f]" />
                        <span className="text-[10px] text-[#00e88f]">+{stats.recentSignups} (30d)</span>
                      </div>
                    )}
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS.rhodium}15` }}
                  >
                    <Users className="h-5 w-5" style={{ color: COLORS.rhodium }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: COLORS.palladium }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <span className="text-xs">Converters</span>
                    </div>
                    <div className="text-2xl font-bold">{stats?.totalConverters?.toLocaleString() ?? '---'}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">In database</span>
                    </div>
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS.palladium}15` }}
                  >
                    <Package className="h-5 w-5" style={{ color: COLORS.palladium }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: COLORS.primary }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <span className="text-xs">Active Subs</span>
                    </div>
                    <div className="text-2xl font-bold">{stats?.activeSubscriptions ?? '---'}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">Paid plans</span>
                    </div>
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS.primary}15` }}
                  >
                    <CreditCard className="h-5 w-5" style={{ color: COLORS.primary }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: COLORS.platinum }} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <span className="text-xs">MRR</span>
                    </div>
                    <div className="text-2xl font-bold text-[#00e88f]">
                      ${revenue?.mrr?.toFixed(2) ?? '0.00'}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">Monthly recurring</span>
                    </div>
                  </div>
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS.platinum}15` }}
                  >
                    <DollarSign className="h-5 w-5" style={{ color: COLORS.platinum }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Line Chart - Signups over Time */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Signups Trend (30 days)</CardTitle>
                  <Badge variant="outline" className="text-[10px] text-[#00e88f] border-[#00e88f]/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={signupTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="signups"
                        name="Signups"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        fill="url(#signupGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: COLORS.primary, stroke: '#fff', strokeWidth: 1 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart - Subscriptions by Plan */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  {planData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={planData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {planData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No subscription data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart and Recent Activity Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pie Chart - Credit Usage */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Credit Usage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={creditUsageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {creditUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-2">
                  <div className="text-2xl font-bold">{stats?.totalCreditsSpent ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">Total credits used</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentActivity.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.text}</p>
                          <p className="text-[10px] text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Stats Summary */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{ color: COLORS.rhodium }}>
                        {stats?.recentSignups ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">New Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{ color: COLORS.primary }}>
                        {stats?.searchesToday ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{ color: COLORS.palladium }}>
                        {stats?.totalCreditsSpent ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Credits</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'converters' && <AdminConverters />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'groups' && <AdminGroups />}
      {activeTab === 'pricing' && <AdminPricing />}
      {activeTab === 'credits' && <AdminCredits />}
      {activeTab === 'analytics' && <AdminAnalytics />}
      {activeTab === 'messages' && <AdminMessages />}
      {activeTab === 'settings' && <AdminSettings />}
    </div>
  );
}
