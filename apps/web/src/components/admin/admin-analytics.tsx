'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Search, Users, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

const COLORS = {
  primary: '#00e88f',
  rhodium: '#5b9cf5',
  palladium: '#ffd866',
};

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

export function AdminAnalytics() {
  const { token } = useAuth();
  const t = useTranslations('admin');
  const [topConverters, setTopConverters] = useState<any[]>([]);
  const [searchVolume, setSearchVolume] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchAll = async () => {
      try {
        const [tcRes, svRes, auRes] = await Promise.all([
          api.getAdminTopConverters(token),
          api.getAdminSearchVolume(token),
          api.getAdminActiveUsers(token),
        ]);
        setTopConverters(tcRes.data || []);
        setSearchVolume((svRes.data || []).map((d: any) => ({
          ...d,
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })));
        setActiveUsers(auRes.data || []);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Volume Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('searchVolume')}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
              30 days
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {searchVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={searchVolume} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="searches"
                    name="Searches"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#searchGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: COLORS.primary, stroke: '#fff', strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No search data available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Converters */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              {t('topConverters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topConverters.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topConverters.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: string) => value.length > 25 ? value.slice(0, 25) + '...' : value}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="views" name="Views" fill={COLORS.rhodium} radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No converter view data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Active Users */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t('activeUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeUsers.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeUsers.map((user, idx) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm truncate">{user.email}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0 ml-2">
                      {user.totalSpent} credits
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No user activity data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
