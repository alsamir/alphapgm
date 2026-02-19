import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CREDITS } from '@catapp/shared-utils';
import Stripe from 'stripe';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
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

  async getBalance(userId: bigint) {
    const balance = await this.prisma.creditBalance.findUnique({ where: { userId } });
    if (!balance) {
      return { userId: Number(userId), available: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
    }
    return {
      userId: Number(balance.userId),
      available: balance.available,
      lifetimeEarned: balance.lifetimeEarned,
      lifetimeSpent: balance.lifetimeSpent,
    };
  }

  async getLedger(userId: bigint, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const entries = await this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit + 1,
    });

    const hasMore = entries.length > limit;
    const data = (hasMore ? entries.slice(0, limit) : entries).map((e) => ({
      id: e.id,
      userId: Number(e.userId),
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      type: e.type,
      sourceDetail: e.sourceDetail,
      createdAt: e.createdAt.toISOString(),
    }));
    return {
      data,
      page,
      limit,
      hasMore,
    };
  }

  async deductCredits(userId: bigint, amount: number, source: string) {
    const balance = await this.prisma.creditBalance.findUnique({ where: { userId } });
    if (!balance || balance.available < amount) {
      throw new ForbiddenException('Insufficient credits');
    }

    const newBalance = balance.available - amount;

    await this.prisma.$transaction([
      this.prisma.creditBalance.update({
        where: { userId },
        data: {
          available: { decrement: amount },
          lifetimeSpent: { increment: amount },
        },
      }),
      this.prisma.creditLedger.create({
        data: {
          userId,
          amount: -amount,
          balanceAfter: newBalance,
          type: 'CONSUMPTION',
          sourceDetail: source,
        },
      }),
    ]);

    return { available: newBalance };
  }

  async addCredits(userId: bigint, amount: number, type: string, source: string) {
    const balance = await this.prisma.creditBalance.findUnique({ where: { userId } });
    const currentBalance = balance?.available || 0;
    const newBalance = currentBalance + amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.creditBalance.upsert({
        where: { userId },
        create: {
          userId,
          available: amount,
          lifetimeEarned: amount,
          lifetimeSpent: 0,
        },
        update: {
          available: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      });

      await tx.creditLedger.create({
        data: {
          userId,
          amount,
          balanceAfter: newBalance,
          type,
          sourceDetail: source,
        },
      });
    });

    return { available: newBalance };
  }

  async createTopupCheckout(userId: bigint, quantity: number = 1) {
    if (!this.stripe) throw new Error('Stripe is not configured');

    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new ForbiddenException('User not found');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${CREDITS.TOPUP_AMOUNT * quantity} Credits`,
            description: 'Catalyser credit top-up (no expiry)',
          },
          unit_amount: CREDITS.TOPUP_PRICE_CENTS,
        },
        quantity,
      }],
      success_url: `${this.configService.get('NEXT_PUBLIC_APP_URL')}/dashboard?topup=success`,
      cancel_url: `${this.configService.get('NEXT_PUBLIC_APP_URL')}/dashboard?topup=canceled`,
      metadata: {
        userId: userId.toString(),
        credits: (CREDITS.TOPUP_AMOUNT * quantity).toString(),
        type: 'credit_topup',
      },
    });

    return { url: session.url };
  }
}
