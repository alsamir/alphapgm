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
import { RecentSearches } from './recent-searches';
import { AiHistory } from './ai-history';
import { PriceLists } from './price-lists';
import {
  Coins,
  CreditCard,
  User,
  LayoutDashboard,
  Search,
  Bot,
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Tab = 'overview' | 'profile' | 'subscription' | 'credits' | 'searches' | 'ai-history' | 'pricelists';

export function DashboardContent() {
  const { user, token } = useAuth();
  const t = useTranslations('dashboard');
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
    { id: 'overview' as Tab, label: t('overview'), icon: LayoutDashboard },
    { id: 'profile' as Tab, label: t('profile'), icon: User },
    { id: 'subscription' as Tab, label: t('subscription'), icon: CreditCard },
    { id: 'credits' as Tab, label: t('credits'), icon: Coins },
    { id: 'searches' as Tab, label: t('searches'), icon: Search },
    { id: 'ai-history' as Tab, label: t('aiHistory'), icon: Bot },
    { id: 'pricelists' as Tab, label: t('priceLists'), icon: FileText },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('welcomeBack', { name: user?.username || t('defaultUser') })}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 ${
              activeTab === tab.id ? 'bg-secondary text-foreground' : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab profile={profile} loading={loading} onNavigate={setActiveTab} />}
      {activeTab === 'profile' && <ProfileSettings profile={profile} />}
      {activeTab === 'subscription' && <SubscriptionCard profile={profile} />}
      {activeTab === 'credits' && <CreditBalance />}
      {activeTab === 'searches' && <RecentSearches />}
      {activeTab === 'ai-history' && <AiHistory />}
      {activeTab === 'pricelists' && <PriceLists />}
    </div>
  );
}

/* ─── Overview Tab ──────────────────────────────────────────────────────── */

function OverviewTab({
  profile,
  loading,
  onNavigate,
}: {
  profile: any;
  loading: boolean;
  onNavigate: (tab: Tab) => void;
}) {
  const t = useTranslations('dashboard');

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const available = profile?.credits?.available ?? 0;
  const lifetimeSpent = profile?.credits?.lifetimeSpent ?? 0;
  const planName = profile?.subscription?.plan?.name ?? 'Free';
  const planStatus = profile?.subscription?.status;
  const renewDate = profile?.subscription?.currentPeriodEnd;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Credit Balance Card */}
        <Card className="bg-card border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => onNavigate('credits')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-primary" />
              {t('creditsAvailable')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{available}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('creditsUsedTotal', { count: lifetimeSpent })}
            </p>
            {/* Mini usage bar */}
            {profile?.credits?.lifetimeEarned > 0 && (
              <div className="w-full h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((lifetimeSpent / profile.credits.lifetimeEarned) * 100))}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card className="bg-card border-border hover:border-border/80 transition-colors cursor-pointer"
          onClick={() => onNavigate('subscription')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              {t('currentPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{planName}</div>
            <div className="flex items-center gap-2 mt-1">
              {planStatus && (
                <Badge
                  variant={planStatus === 'active' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {planStatus}
                </Badge>
              )}
              {renewDate && (
                <span className="text-xs text-muted-foreground">
                  {t('renews', { date: new Date(renewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Card */}
        <Card className="bg-card border-border hover:border-border/80 transition-colors cursor-pointer"
          onClick={() => onNavigate('profile')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              {t('account')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">{profile?.email}</div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {profile?.roles?.map((role: string) => (
                <Badge key={role} variant="outline" className="text-[10px]">
                  {role.replace('ROLE_', '')}
                </Badge>
              ))}
            </div>
            {profile?.settings?.discount > 0 && (
              <div className="mt-2">
                <Badge variant="accent" className="text-[10px]">
                  {t('discountBadge', { percent: profile.settings.discount })}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {t('quickActions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              asChild
            >
              <Link href="/">
                <Search className="h-5 w-5 text-primary" />
                <span className="text-xs">{t('searchConverters')}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('credits')}
            >
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-xs">{t('buyCredits')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('ai-history')}
            >
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-xs">{t('aiHistory')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onNavigate('subscription')}
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs">{t('upgradePlan')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Searches Preview */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                {t('recentSearches')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onNavigate('searches')}
              >
                {t('viewAll')}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentSearchesPreview />
          </CardContent>
        </Card>

        {/* AI History Preview */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                {t('recentAiChats')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onNavigate('ai-history')}
              >
                {t('viewAll')}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AiHistoryPreview />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Overview Sub-components ───────────────────────────────────────────── */

function RecentSearchesPreview() {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!token) return;
      try {
        const res = await api.getCreditLedger(token);
        const all = res.data?.data || [];
        const consumptions = all
          .filter((e: any) => e.amount < 0 && e.type !== 'AI_QUERY')
          .slice(0, 3);
        setEntries(consumptions);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t('noRecentSearches')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry: any) => (
        <div key={entry.id} className="flex items-center justify-between py-1.5">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {entry.sourceDetail || t('converterLookup')}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <span className="text-xs text-red-400 font-medium flex-shrink-0 ml-2">
            {entry.amount}
          </span>
        </div>
      ))}
    </div>
  );
}

function AiHistoryPreview() {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!token) return;
      try {
        const res = await api.getAiHistory(token);
        setChats((res.data || []).slice(0, 3));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t('noAiConversations')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat: any) => {
        const firstMsg = chat.messages?.find((m: any) => m.role === 'user');
        const preview = firstMsg?.content || t('chat');
        return (
          <div key={chat.id} className="flex items-center justify-between py-1.5">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {preview.length > 60 ? preview.substring(0, 60) + '...' : preview}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-2">
              {t('messageCount', { count: chat.messages?.length || 0 })}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
