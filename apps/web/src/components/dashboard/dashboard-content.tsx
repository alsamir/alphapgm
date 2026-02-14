'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditBalance } from './credit-balance';
import { ProfileSettings } from './profile-settings';
import { SubscriptionCard } from './subscription-card';
import { Coins, CreditCard, User, Settings, History } from 'lucide-react';

type Tab = 'overview' | 'profile' | 'subscription' | 'credits';

export function DashboardContent() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await api.getProfile(token);
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: History },
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'subscription' as Tab, label: 'Subscription', icon: CreditCard },
    { id: 'credits' as Tab, label: 'Credits', icon: Coins },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.username || 'User'}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0"
          >
            <tab.icon className="h-4 w-4 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{profile?.credits?.available ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {profile?.credits?.lifetimeSpent ?? 0} credits used total
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile?.subscription?.plan?.name ?? 'Free'}</div>
              {profile?.subscription?.status && (
                <Badge variant="secondary" className="mt-1">{profile.subscription.status}</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{user?.email}</div>
              <div className="flex gap-1 mt-1">
                {profile?.roles?.map((role: string) => (
                  <Badge key={role} variant="outline" className="text-xs">{role.replace('ROLE_', '')}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'profile' && <ProfileSettings profile={profile} />}
      {activeTab === 'subscription' && <SubscriptionCard profile={profile} />}
      {activeTab === 'credits' && <CreditBalance />}
    </div>
  );
}
