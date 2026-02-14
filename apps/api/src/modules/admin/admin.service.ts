import { Injectable } from '@nestjs/common';
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
}
