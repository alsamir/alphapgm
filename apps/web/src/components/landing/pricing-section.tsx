'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    slug: 'free',
    name: 'Free',
    price: 0,
    credits: '20 on signup',
    description: 'Get started with basic access',
    features: ['Search converter catalogue', 'Price range estimates', '3 AI queries', 'Brand browsing'],
    popular: false,
  },
  {
    slug: 'starter',
    name: 'Starter',
    price: 19.99,
    credits: '150 / month',
    description: 'For individual buyers & sellers',
    features: ['Everything in Free', 'Exact pricing data', 'Full metal breakdown', 'Credit top-ups available', 'Email support'],
    popular: false,
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: 39.99,
    credits: '500 / month',
    description: 'For professionals & businesses',
    features: ['Everything in Starter', 'Unlimited AI queries', 'Price history access', 'Saved searches', 'Priority support'],
    popular: true,
  },
  {
    slug: 'business',
    name: 'Business',
    price: 69.99,
    credits: 'Unlimited',
    description: 'For high-volume operations',
    features: ['Everything in Pro', 'API access', 'Bulk export', 'Team features', 'Dedicated support', 'Custom integrations'],
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-20 bg-card/20" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-muted-foreground">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`h-full flex flex-col ${plan.popular ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/50'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.popular && <Badge>Most Popular</Badge>}
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-primary font-medium">{plan.credits}</span>
                    <span className="text-muted-foreground"> credits</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/register" className="w-full">
                    <Button variant={plan.popular ? 'default' : 'outline'} className="w-full">
                      {plan.price === 0 ? 'Get Started' : 'Subscribe'}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
