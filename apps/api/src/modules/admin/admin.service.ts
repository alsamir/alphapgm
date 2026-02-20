import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // ===== Dashboard =====

  async getDashboardStats() {
    const [totalUsers, totalConverters, activeSubscriptions, totalCreditsSpent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.allData.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.creditLedger.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await this.prisma.user.count({
      where: { createdDate: { gte: thirtyDaysAgo } },
    });

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
      mrr: mrr / 100,
      activeSubscriptions: subscriptions.length,
      byPlan: subscriptions.reduce((acc: Record<string, number>, sub) => {
        const planName = sub.plan.name;
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  // ===== Credits =====

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
      sourceId: (e as any).sourceId ?? null,
      createdAt: e.createdAt.toISOString(),
    }));

    return { data, page, limit, hasMore };
  }

  async adjustCredits(userId: number, amount: number, reason: string) {
    if (amount === 0) {
      throw new BadRequestException('Amount must be non-zero');
    }

    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let balance = await this.prisma.creditBalance.findUnique({ where: { userId: bigUserId } });
    if (!balance) {
      balance = await this.prisma.creditBalance.create({
        data: { userId: bigUserId, available: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      });
    }

    if (amount < 0 && balance.available < Math.abs(amount)) {
      throw new BadRequestException(`Insufficient balance. User has ${balance.available} credits.`);
    }

    const newAvailable = balance.available + amount;

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

  // ===== User CRUD =====

  async createUser(data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    roleId?: number;
    statusId?: number;
  }) {
    // Check uniqueness
    const existingEmail = await this.prisma.user.findFirst({ where: { email: data.email } });
    if (existingEmail) {
      throw new BadRequestException('Email already in use');
    }
    const existingUsername = await this.prisma.user.findFirst({ where: { username: data.username } });
    if (existingUsername) {
      throw new BadRequestException('Username already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.username;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          name: fullName,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          phone: data.phone || null,
          statusId: data.statusId || 1,
          createdDate: new Date(),
          emailVerified: true, // Admin-created users are pre-verified
        },
      });

      await tx.userRole.create({
        data: { userId: newUser.userId, roleId: data.roleId || 1 },
      });

      await tx.creditBalance.create({
        data: { userId: newUser.userId, available: 20, lifetimeEarned: 20, lifetimeSpent: 0 },
      });

      await tx.creditLedger.create({
        data: {
          userId: newUser.userId,
          amount: 20,
          balanceAfter: 20,
          type: 'SIGNUP_BONUS',
          sourceDetail: 'Admin-created account signup bonus',
        },
      });

      await tx.settingUser.create({
        data: { userId: newUser.userId, discount: 0, restDiscount: false, currencyId: 1, language: 'en' },
      });

      return newUser;
    });

    return {
      id: Number(user.userId),
      email: user.email,
      username: user.username,
      name: user.name,
    };
  }

  async updateUser(userId: number, data: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check uniqueness for email/username changes
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findFirst({ where: { email: data.email, NOT: { userId: bigUserId } } });
      if (existing) throw new BadRequestException('Email already in use');
    }
    if (data.username && data.username !== user.username) {
      const existing = await this.prisma.user.findFirst({ where: { username: data.username, NOT: { userId: bigUserId } } });
      if (existing) throw new BadRequestException('Username already in use');
    }

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (data.firstName !== undefined || data.lastName !== undefined) {
      const fn = data.firstName ?? user.firstName;
      const ln = data.lastName ?? user.lastName;
      updateData.name = [fn, ln].filter(Boolean).join(' ') || null;
    }

    const updated = await this.prisma.user.update({
      where: { userId: bigUserId },
      data: updateData,
    });

    return {
      id: Number(updated.userId),
      email: updated.email,
      username: updated.username,
      name: updated.name,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    };
  }

  async deleteUser(userId: number) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hard delete with cascading
    await this.prisma.$transaction([
      this.prisma.creditLedger.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.creditBalance.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.settingUser.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.userRole.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.priceListItem.deleteMany({
        where: { priceList: { userId: bigUserId } },
      }),
      this.prisma.priceList.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.aiChat.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.subscription.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.userGroupMember.deleteMany({ where: { userId: bigUserId } }),
      this.prisma.adminMessage.deleteMany({ where: { sentBy: bigUserId } }),
      this.prisma.user.delete({ where: { userId: bigUserId } }),
    ]);

    return { success: true };
  }

  async resetUserPassword(userId: number, newPassword?: string) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const password = newPassword || crypto.randomBytes(16).toString('hex');
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
        sourceId: e.sourceId ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async updateUserDiscount(userId: number, discount: number) {
    const bigUserId = BigInt(userId);
    const user = await this.prisma.user.findUnique({ where: { userId: bigUserId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const settings = await this.prisma.settingUser.findFirst({ where: { userId: bigUserId } });
    if (settings) {
      await this.prisma.settingUser.update({
        where: { id: settings.id },
        data: { discount },
      });
    } else {
      await this.prisma.settingUser.create({
        data: { userId: bigUserId, discount, restDiscount: false, currencyId: 1, language: 'en' },
      });
    }

    return { success: true, discount };
  }

  async getUserPriceLists(userId: number) {
    const bigUserId = BigInt(userId);
    const lists = await this.prisma.priceList.findMany({
      where: { userId: bigUserId },
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
    });

    const allConverterIds = lists.flatMap((l) => l.items.map((i) => i.converterId));
    const converters = allConverterIds.length > 0
      ? await this.prisma.allData.findMany({
          where: { id: { in: allConverterIds } },
          select: { id: true, name: true, brand: true },
        })
      : [];
    const converterMap = new Map(converters.map((c) => [c.id, c]));

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      status: list.status,
      itemCount: list.items.length,
      total: list.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
      items: list.items.map((item) => {
        const conv = converterMap.get(item.converterId);
        return {
          id: item.id,
          converterId: item.converterId,
          converterName: conv?.name || 'Unknown',
          converterBrand: conv?.brand || 'Unknown',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };
      }),
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    }));
  }

  // ===== User Groups =====

  async createGroup(data: { name: string; description?: string; color?: string }) {
    const group = await this.prisma.userGroup.create({ data });
    return { id: group.id, name: group.name, description: group.description, color: group.color };
  }

  async listGroups() {
    const groups = await this.prisma.userGroup.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async updateGroup(id: number, data: { name?: string; description?: string; color?: string }) {
    const group = await this.prisma.userGroup.update({ where: { id }, data });
    return { id: group.id, name: group.name, description: group.description, color: group.color };
  }

  async deleteGroup(id: number) {
    await this.prisma.userGroup.delete({ where: { id } });
    return { success: true };
  }

  async addGroupMembers(groupId: number, userIds: number[]) {
    const data = userIds.map((uid) => ({
      groupId,
      userId: BigInt(uid),
    }));
    // Use skipDuplicates to avoid errors if already a member
    await this.prisma.userGroupMember.createMany({ data, skipDuplicates: true });
    return { success: true, added: userIds.length };
  }

  async removeGroupMembers(groupId: number, userIds: number[]) {
    await this.prisma.userGroupMember.deleteMany({
      where: { groupId, userId: { in: userIds.map((id) => BigInt(id)) } },
    });
    return { success: true };
  }

  async getGroupMembers(groupId: number) {
    const members = await this.prisma.userGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { userId: true, email: true, username: true, name: true },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
    return members.map((m) => ({
      userId: Number(m.user.userId),
      email: m.user.email,
      username: m.user.username,
      name: m.user.name,
      addedAt: m.addedAt.toISOString(),
    }));
  }

  // ===== Messaging =====

  async sendMessage(data: {
    subject: string;
    body: string;
    channel: string;
    targetType: string;
    targetId?: number;
    userIds?: number[];
  }, senderId: number) {
    // Resolve recipients
    let recipients: { userId: bigint; email: string }[] = [];

    if (data.targetType === 'all') {
      const users = await this.prisma.user.findMany({
        where: { statusId: 1 },
        select: { userId: true, email: true },
      });
      recipients = users.filter((u) => u.email).map((u) => ({ userId: u.userId, email: u.email! }));
    } else if (data.targetType === 'group' && data.targetId) {
      const members = await this.prisma.userGroupMember.findMany({
        where: { groupId: data.targetId },
        include: { user: { select: { userId: true, email: true } } },
      });
      recipients = members
        .filter((m) => m.user.email)
        .map((m) => ({ userId: m.user.userId, email: m.user.email! }));
    } else if (data.targetType === 'users' && data.userIds?.length) {
      const users = await this.prisma.user.findMany({
        where: { userId: { in: data.userIds.map((id) => BigInt(id)) } },
        select: { userId: true, email: true },
      });
      recipients = users.filter((u) => u.email).map((u) => ({ userId: u.userId, email: u.email! }));
    }

    // Create message record
    const message = await this.prisma.adminMessage.create({
      data: {
        subject: data.subject,
        body: data.body,
        channel: data.channel || 'email',
        targetType: data.targetType,
        targetId: data.targetId || null,
        sentBy: BigInt(senderId),
        recipientCount: recipients.length,
        status: 'sending',
      },
    });

    // Send emails
    if (data.channel === 'email') {
      let failCount = 0;
      for (const recipient of recipients) {
        try {
          await this.mailService.sendCustomEmail(recipient.email, data.subject, data.body);
        } catch {
          failCount++;
        }
      }
      await this.prisma.adminMessage.update({
        where: { id: message.id },
        data: { status: failCount === 0 ? 'sent' : failCount === recipients.length ? 'failed' : 'partial' },
      });
    } else {
      await this.prisma.adminMessage.update({
        where: { id: message.id },
        data: { status: 'sent' },
      });
    }

    return {
      id: message.id,
      recipientCount: recipients.length,
      status: 'sent',
    };
  }

  async listMessages(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const messages = await this.prisma.adminMessage.findMany({
      include: { sender: { select: { email: true } } },
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit).map((m) => ({
      id: m.id,
      subject: m.subject,
      channel: m.channel,
      targetType: m.targetType,
      targetId: m.targetId,
      recipientCount: m.recipientCount,
      status: m.status,
      sentBy: m.sender.email,
      sentAt: m.sentAt.toISOString(),
    }));

    return { data, page, limit, hasMore };
  }

  async getMessageDetail(id: number) {
    const message = await this.prisma.adminMessage.findUnique({
      where: { id },
      include: { sender: { select: { email: true } } },
    });
    if (!message) throw new BadRequestException('Message not found');

    return {
      id: message.id,
      subject: message.subject,
      body: message.body,
      channel: message.channel,
      targetType: message.targetType,
      targetId: message.targetId,
      recipientCount: message.recipientCount,
      status: message.status,
      sentBy: message.sender.email,
      sentAt: message.sentAt.toISOString(),
    };
  }

  // ===== Analytics =====

  async getTopConverters(limit: number = 20) {
    limit = Math.min(Math.max(1, limit), 100);
    const results: any[] = await this.prisma.$queryRaw`
      SELECT cl.source_id AS sourceId, COUNT(*) AS viewCount,
             ad.name, ad.brand
      FROM credit_ledger cl
      JOIN all_data ad ON ad.id = cl.source_id
      WHERE cl.source_id IS NOT NULL AND cl.type = 'CONSUMPTION'
      GROUP BY cl.source_id, ad.name, ad.brand
      ORDER BY viewCount DESC
      LIMIT ${limit}
    `;
    return results.map((r) => ({
      sourceId: Number(r.sourceId),
      name: r.name,
      brand: r.brand,
      viewCount: Number(r.viewCount),
    }));
  }

  async getSearchVolume(days: number = 30) {
    days = Math.min(Math.max(1, days), 365);
    const results: any[] = await this.prisma.$queryRaw`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM credit_ledger
      WHERE type = 'CONSUMPTION'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    return results.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: Number(r.count),
    }));
  }

  async getActiveUsers(limit: number = 20) {
    limit = Math.min(Math.max(1, limit), 100);
    const results: any[] = await this.prisma.$queryRaw`
      SELECT cl.user_id AS userId, u.email, u.username,
             COUNT(*) AS searchCount, SUM(ABS(cl.amount)) AS totalSpent
      FROM credit_ledger cl
      JOIN user u ON u.user_id = cl.user_id
      WHERE cl.amount < 0
      GROUP BY cl.user_id, u.email, u.username
      ORDER BY totalSpent DESC
      LIMIT ${limit}
    `;
    return results.map((r) => ({
      userId: Number(r.userId),
      email: r.email,
      username: r.username,
      searchCount: Number(r.searchCount),
      totalSpent: Number(r.totalSpent),
    }));
  }

  async getActivityByCountry(days: number = 30) {
    days = Math.min(Math.max(1, days), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const results: any[] = await this.prisma.$queryRaw`
      SELECT country, COUNT(*) AS count, COUNT(DISTINCT user_id) AS uniqueUsers
      FROM user_activity
      WHERE created_at >= ${since} AND country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY count DESC
    `;
    return results.map((r) => ({
      country: r.country,
      count: Number(r.count),
      uniqueUsers: Number(r.uniqueUsers),
    }));
  }

  async getUserLocations(limit: number = 50) {
    limit = Math.min(Math.max(1, limit), 200);
    const users = await this.prisma.user.findMany({
      where: {
        lastCountry: { not: null },
      },
      select: {
        userId: true,
        email: true,
        username: true,
        lastIp: true,
        lastCountry: true,
        lastCity: true,
        lastAccess: true,
      },
      orderBy: { lastAccess: 'desc' },
      take: limit,
    });
    return users.map((u) => ({
      userId: Number(u.userId),
      email: u.email,
      username: u.username,
      country: u.lastCountry,
      city: u.lastCity,
      lastAccess: u.lastAccess?.toISOString() || null,
    }));
  }

  async getAiImageUploads(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const uploads = await this.prisma.aiImageUpload.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit + 1,
      include: {
        user: { select: { email: true, username: true } },
      },
    });

    const hasMore = uploads.length > limit;
    const data = (hasMore ? uploads.slice(0, limit) : uploads).map((u) => ({
      id: u.id,
      userId: Number(u.userId),
      email: u.user.email,
      username: u.user.username,
      imagePath: u.imagePath,
      result: u.result,
      ipAddress: u.ipAddress,
      createdAt: u.createdAt.toISOString(),
    }));

    return { data, page, hasMore };
  }
}
