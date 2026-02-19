import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalConverters, activeSubscriptions, totalCreditsSpent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.allData.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.creditLedger.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await this.prisma.user.count({
      where: { createdDate: { gte: thirtyDaysAgo } },
    });

    // Recent searches (approximate from credit consumption)
    const recentSearches = await this.prisma.creditLedger.count({
      where: {
        type: 'CONSUMPTION',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return {
      totalUsers,
      totalConverters,
      activeSubscriptions,
      totalCreditsSpent: Math.abs(totalCreditsSpent._sum.amount || 0),
      recentSignups,
      searchesToday: recentSearches,
    };
  }

  async getRevenueStats() {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });

    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.plan.priceCents || 0), 0);

    return {
      mrr: mrr / 100, // Convert cents to dollars
      activeSubscriptions: subscriptions.length,
      byPlan: subscriptions.reduce((acc: Record<string, number>, sub) => {
        const planName = sub.plan.name;
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async getCreditStats() {
    const [totalDistributed, totalConsumed, totalAvailable, userCount] = await Promise.all([
      this.prisma.creditLedger.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
      this.prisma.creditLedger.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
      this.prisma.creditBalance.aggregate({ _sum: { available: true } }),
      this.prisma.creditBalance.count({ where: { available: { gt: 0 } } }),
    ]);

    const distributed = totalDistributed._sum.amount || 0;
    const consumed = Math.abs(totalConsumed._sum.amount || 0);
    const available = totalAvailable._sum.available || 0;

    return {
      totalDistributed: distributed,
      totalConsumed: consumed,
      totalAvailable: available,
      averagePerUser: userCount > 0 ? available / userCount : 0,
    };
  }

  async getCreditLedger(params: { page: number; limit: number; type?: string; search?: string }) {
    const { page, limit, type, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (search) {
      where.user = { email: { contains: search } };
    }

    const [entries, total] = await Promise.all([
      this.prisma.creditLedger.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit + 1,
      }),
      this.prisma.creditLedger.count({ where }),
    ]);

    const hasMore = entries.length > limit;
    const data = entries.slice(0, limit).map((e) => ({
      id: e.id,
      userId: Number(e.userId),
      userEmail: e.user.email || '',
      type: e.type,
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      sourceDetail: e.sourceDetail || '',
      createdAt: e.createdAt.toISOString(),
    }));

    return { data, page, limit, hasMore };
  }

  async resetUserPassword(userId: number, newPassword?: string) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const password = newPassword || crypto.randomBytes(6).toString('hex'); // 12-char random
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { userId: bigUserId },
      data: { password: hashedPassword },
    });

    return { success: true, temporaryPassword: password };
  }

  async getUserHistory(userId: number) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Credit history
    const creditHistory = await this.prisma.creditLedger.findMany({
      where: { userId: bigUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      credits: creditHistory.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        balanceAfter: e.balanceAfter,
        sourceDetail: e.sourceDetail,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async adjustCredits(userId: number, amount: number, reason: string) {
    if (amount === 0) {
      throw new BadRequestException('Amount must be non-zero');
    }

    const bigUserId = BigInt(userId);

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get or create credit balance
    let balance = await this.prisma.creditBalance.findUnique({ where: { userId: bigUserId } });
    if (!balance) {
      balance = await this.prisma.creditBalance.create({
        data: { userId: bigUserId, available: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      });
    }

    // For deductions, ensure sufficient balance
    if (amount < 0 && balance.available < Math.abs(amount)) {
      throw new BadRequestException(`Insufficient balance. User has ${balance.available} credits.`);
    }

    const newAvailable = balance.available + amount;

    // Update balance and create ledger entry in transaction
    await this.prisma.$transaction([
      this.prisma.creditBalance.update({
        where: { userId: bigUserId },
        data: {
          available: newAvailable,
          ...(amount > 0
            ? { lifetimeEarned: { increment: amount } }
            : { lifetimeSpent: { increment: Math.abs(amount) } }),
        },
      }),
      this.prisma.creditLedger.create({
        data: {
          userId: bigUserId,
          amount,
          balanceAfter: newAvailable,
          type: 'MANUAL',
          sourceDetail: reason,
        },
      }),
    ]);

    return { success: true, newBalance: newAvailable };
  }
}
