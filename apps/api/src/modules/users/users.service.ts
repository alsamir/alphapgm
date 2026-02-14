import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        roles: { include: { role: true } },
        settings: { include: { currency: true } },
        subscription: { include: { plan: true } },
        creditBalance: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: Number(user.userId),
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdDate,
      roles: user.roles.map((ur) => ur.role.name),
      settings: user.settings[0] ? {
        discount: user.settings[0].discount,
        restDiscount: user.settings[0].restDiscount,
        currency: user.settings[0].currency,
      } : null,
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      } : null,
      credits: user.creditBalance ? {
        available: user.creditBalance.available,
        lifetimeEarned: user.creditBalance.lifetimeEarned,
        lifetimeSpent: user.creditBalance.lifetimeSpent,
      } : { available: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
    };
  }

  async updateProfile(userId: bigint, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });
  }

  async updateSettings(userId: bigint, data: { discount?: number; currencyId?: number; restDiscount?: boolean }) {
    const settings = await this.prisma.settingUser.findFirst({ where: { userId } });
    if (settings) {
      return this.prisma.settingUser.update({
        where: { id: settings.id },
        data,
      });
    }
    return this.prisma.settingUser.create({
      data: { userId, discount: data.discount || 0, restDiscount: data.restDiscount || false, currencyId: data.currencyId || 1 },
    });
  }

  async listUsers(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search } },
        { username: { contains: params.search } },
        { name: { contains: params.search } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
        creditBalance: true,
        status: true,
      },
      skip,
      take: limit + 1,
      orderBy: { userId: 'desc' },
    });

    const hasMore = users.length > limit;
    const data = (hasMore ? users.slice(0, limit) : users).map((u) => ({
      id: Number(u.userId),
      email: u.email,
      username: u.username,
      name: u.name,
      status: u.status?.descEn,
      roles: u.roles.map((ur) => ur.role.name),
      plan: u.subscription?.plan?.name || 'Free',
      credits: u.creditBalance?.available || 0,
      createdAt: u.createdDate,
      lastAccess: u.lastAccess,
    }));

    return { data, page, limit, hasMore };
  }

  async updateUserRole(userId: bigint, roleId: number) {
    // Remove existing roles and add new one
    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.prisma.userRole.create({ data: { userId, roleId } });
    return { success: true };
  }

  async updateUserStatus(userId: bigint, statusId: number) {
    return this.prisma.user.update({
      where: { userId },
      data: { statusId },
    });
  }
}
