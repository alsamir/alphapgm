'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

interface Props {
  profile: any;
}

const plans = [
  { slug: 'starter', name: 'Starter', price: 19.99, credits: 150 },
  { slug: 'pro', name: 'Pro', price: 39.99, credits: 500 },
  { slug: 'business', name: 'Business', price: 69.99, credits: -1 },
];

export function SubscriptionCard({ profile }: Props) {
  const { token } = useAuth();
  const currentPlan = profile?.subscription?.plan?.slug || 'free';

  const handleUpgrade = async (planSlug: string) => {
    if (!token) return;
    try {
      const res = await api.createCheckout(planSlug, token);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">{profile?.subscription?.plan?.name || 'Free'}</div>
            {profile?.subscription?.status && (
              <Badge variant={profile.subscription.status === 'active' ? 'default' : 'secondary'}>
                {profile.subscription.status}
              </Badge>
            )}
          </div>
          {profile?.subscription?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground mt-2">
              Renews on {new Date(profile.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.slug} className={`bg-card ${currentPlan === plan.slug ? 'border-primary/50' : 'border-border'}`}>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <div className="text-3xl font-bold mt-2">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.credits === -1 ? 'Unlimited' : plan.credits} credits/month
              </p>
              {currentPlan === plan.slug ? (
                <Badge className="mt-4">Current Plan</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => handleUpgrade(plan.slug)}
                >
                  Upgrade <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
