import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CREDITS } from '@catapp/shared-utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(data: { email: string; username: string; password: string; name?: string; phone?: string }) {
    // Check if email or username already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === data.email ? 'Email already registered' : 'Username already taken',
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Get the USER role
    const userRole = await this.prisma.role.findFirst({ where: { name: 'ROLE_USER' } });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          name: data.name || null,
          phone: data.phone || null,
          statusId: 1, // Active
          createdDate: new Date(),
          lastAccess: new Date(),
        },
      });

      // Assign USER role
      if (userRole) {
        await tx.userRole.create({
          data: { userId: newUser.userId, roleId: userRole.id },
        });
      }

      // Create credit balance with free signup credits
      await tx.creditBalance.create({
        data: {
          userId: newUser.userId,
          available: CREDITS.FREE_SIGNUP_CREDITS,
          lifetimeEarned: CREDITS.FREE_SIGNUP_CREDITS,
          lifetimeSpent: 0,
        },
      });

      // Record credit grant in ledger
      await tx.creditLedger.create({
        data: {
          userId: newUser.userId,
          amount: CREDITS.FREE_SIGNUP_CREDITS,
          balanceAfter: CREDITS.FREE_SIGNUP_CREDITS,
          type: 'GRANT',
          sourceDetail: 'Free signup credits',
        },
      });

      // Create user settings
      await tx.settingUser.create({
        data: {
          userId: newUser.userId,
          discount: 0,
          restDiscount: false,
          currencyId: 1, // USD default
        },
      });

      return newUser;
    });

    const roles = userRole ? [userRole.name!] : ['ROLE_USER'];
    const tokens = await this.generateTokens(user.userId, user.email!, user.username!, roles, 'free');

    return {
      user: {
        id: Number(user.userId),
        email: user.email,
        username: user.username,
        name: user.name,
        roles,
      },
      tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last access
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { lastAccess: new Date() },
    });

    const roles = user.roles.map((ur) => ur.role.name!);
    const planSlug = user.subscription?.plan?.slug || 'free';
    const tokens = await this.generateTokens(user.userId, user.email!, user.username!, roles, planSlug);

    return {
      user: {
        id: Number(user.userId),
        email: user.email,
        username: user.username,
        name: user.name,
        roles,
      },
      tokens,
    };
  }

  async refreshTokens(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roles.map((ur) => ur.role.name!);
    const planSlug = user.subscription?.plan?.slug || 'free';
    return this.generateTokens(user.userId, user.email!, user.username!, roles, planSlug);
  }

  private async generateTokens(userId: bigint, email: string, username: string, roles: string[], planSlug: string) {
    const payload = {
      sub: Number(userId),
      email,
      username,
      roles,
      planSlug,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!user) return null;

    return {
      userId: Number(user.userId),
      email: user.email,
      username: user.username,
      name: user.name,
      roles: user.roles.map((ur) => ur.role.name),
      planSlug: user.subscription?.plan?.slug || 'free',
    };
  }
}
