import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey !== 'sk_test_...') {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });
    }
  }

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
    });
  }

  async getUserSubscription(userId: bigint) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  async createCheckoutSession(userId: bigint, planSlug: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan || !plan.stripePriceId) {
      throw new NotFoundException('Plan not found or not configured for billing');
    }

    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email || undefined,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${this.configService.get('NEXT_PUBLIC_APP_URL')}/dashboard?subscription=success`,
      cancel_url: `${this.configService.get('NEXT_PUBLIC_APP_URL')}/pricing?subscription=canceled`,
      metadata: {
        userId: userId.toString(),
        planId: plan.id.toString(),
      },
    });

    return { url: session.url };
  }

  async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
    const metadata = stripeSubscription.metadata;
    const userId = BigInt(metadata.userId);
    const planId = parseInt(metadata.planId);

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    await this.prisma.$transaction(async (tx) => {
      // Upsert subscription
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          status: stripeSubscription.status,
          provider: 'stripe',
          providerSubscriptionId: stripeSubscription.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
        update: {
          planId,
          status: stripeSubscription.status,
          providerSubscriptionId: stripeSubscription.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
      });

      // Grant monthly credits
      if (plan.monthlyCredits > 0) {
        const balance = await tx.creditBalance.findUnique({ where: { userId } });
        const currentBalance = balance?.available || 0;
        const newBalance = currentBalance + plan.monthlyCredits;

        await tx.creditBalance.upsert({
          where: { userId },
          create: {
            userId,
            available: plan.monthlyCredits,
            lifetimeEarned: plan.monthlyCredits,
            lifetimeSpent: 0,
          },
          update: {
            available: { increment: plan.monthlyCredits },
            lifetimeEarned: { increment: plan.monthlyCredits },
          },
        });

        await tx.creditLedger.create({
          data: {
            userId,
            amount: plan.monthlyCredits,
            balanceAfter: newBalance,
            type: 'GRANT',
            sourceDetail: `${plan.name} subscription - monthly credits`,
          },
        });
      }
    });

    this.logger.log(`Subscription created for user ${userId}, plan ${plan.name}`);
  }

  async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const sub = await this.prisma.subscription.findFirst({
      where: { providerSubscriptionId: stripeSubscription.id },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: stripeSubscription.status,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });
  }

  async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const sub = await this.prisma.subscription.findFirst({
      where: { providerSubscriptionId: stripeSubscription.id },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'canceled' },
    });
  }

  async cancelSubscription(userId: bigint) {
    if (!this.stripe) throw new Error('Stripe is not configured');

    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub || !sub.providerSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    await this.stripe.subscriptions.update(sub.providerSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    return { message: 'Subscription will be canceled at end of billing period' };
  }
}
