import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CREDITS } from '@catapp/shared-utils';
const geoip = require('geoip-lite');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async verifyTurnstileToken(token: string): Promise<boolean> {
    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret || secret === 'placeholder') {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Turnstile secret not configured in production — blocking request');
        return false;
      }
      this.logger.warn('Turnstile secret not configured, skipping verification (dev only)');
      return true;
    }

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      this.logger.error('Turnstile verification failed', error);
      return false;
    }
  }

  async register(data: { email: string; username: string; password: string; firstName?: string; lastName?: string; name?: string; phone?: string; turnstileToken?: string }) {
    if (data.turnstileToken) {
      const valid = await this.verifyTurnstileToken(data.turnstileToken);
      if (!valid) throw new BadRequestException('Bot verification failed');
    }
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
      const firstName = data.firstName || null;
      const lastName = data.lastName || null;
      const fullName = data.name || [firstName, lastName].filter(Boolean).join(' ') || null;

      const newUser = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          name: fullName,
          firstName,
          lastName,
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
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
      tokens,
    };
  }

  async login(email: string, password: string, turnstileToken?: string, ipAddress?: string, userAgent?: string) {
    if (turnstileToken) {
      const valid = await this.verifyTurnstileToken(turnstileToken);
      if (!valid) throw new BadRequestException('Bot verification failed');
    }

    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
        settings: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last access + IP geolocation
    const geo = ipAddress ? geoip.lookup(ipAddress) : null;
    const country = geo?.country || null;
    const city = geo?.city || null;

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        lastAccess: new Date(),
        lastIp: ipAddress || null,
        lastCountry: country,
        lastCity: city,
      },
    });

    // Record activity for analytics
    await this.prisma.userActivity.create({
      data: {
        userId: user.userId,
        action: 'login',
        ipAddress: ipAddress || null,
        country,
        city,
        userAgent: userAgent?.substring(0, 500) || null,
      },
    }).catch(() => {}); // Non-critical

    const roles = user.roles.map((ur) => ur.role.name!);
    const planSlug = user.subscription?.plan?.slug || 'free';
    const tokens = await this.generateTokens(user.userId, user.email!, user.username!, roles, planSlug);

    return {
      user: {
        id: Number(user.userId),
        email: user.email,
        username: user.username,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        language: user.settings[0]?.language || 'en',
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

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        roles: { include: { role: true } },
        subscription: { include: { plan: true } },
        settings: true,
      },
    });

    if (!user) return null;

    return {
      userId: Number(user.userId),
      email: user.email,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((ur) => ur.role.name),
      planSlug: user.subscription?.plan?.slug || 'free',
      language: user.settings[0]?.language || 'en',
    };
  }
}
