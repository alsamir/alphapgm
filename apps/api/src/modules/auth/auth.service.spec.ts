import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    creditBalance: {
      create: jest.fn(),
    },
    creditLedger: {
      create: jest.fn(),
    },
    settingUser: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginEmail = 'user@example.com';
    const loginPassword = 'password123';

    const mockUser = {
      userId: BigInt(1),
      email: loginEmail,
      username: 'testuser',
      password: '$2b$12$hashedpassword',
      name: 'Test User',
      roles: [{ role: { name: 'ROLE_USER' } }],
      subscription: { plan: { slug: 'free' } },
    };

    it('should successfully login with valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      const result = await service.login(loginEmail, loginPassword);

      expect(result.user.email).toBe(loginEmail);
      expect(result.user.username).toBe('testuser');
      expect(result.user.roles).toEqual(['ROLE_USER']);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUser.userId },
          data: expect.objectContaining({ lastAccess: expect.any(Date) }),
        }),
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginEmail, loginPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginEmail, loginPassword)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(service.login(loginEmail, loginPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginEmail, loginPassword)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract planSlug from user subscription', async () => {
      const userWithPro = {
        ...mockUser,
        subscription: { plan: { slug: 'pro' } },
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithPro);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(userWithPro);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      await service.login(loginEmail, loginPassword);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ planSlug: 'pro' }),
      );
    });

    it('should default planSlug to "free" when no subscription exists', async () => {
      const userNoSub = { ...mockUser, subscription: null };
      mockPrisma.user.findFirst.mockResolvedValue(userNoSub);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(userNoSub);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      await service.login(loginEmail, loginPassword);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ planSlug: 'free' }),
      );
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'password123',
      name: 'New User',
    };

    const mockRole = { id: 1, name: 'ROLE_USER' };

    it('should successfully register a new user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');

      const createdUser = {
        userId: BigInt(2),
        email: registerData.email,
        username: registerData.username,
        name: registerData.name,
        password: '$2b$12$hashedpassword',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(createdUser) },
          userRole: { create: jest.fn() },
          creditBalance: { create: jest.fn() },
          creditLedger: { create: jest.fn() },
          settingUser: { create: jest.fn() },
        };
        return callback(tx);
      });

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      const result = await service.register(registerData);

      expect(result.user.email).toBe(registerData.email);
      expect(result.user.username).toBe(registerData.username);
      expect(result.user.name).toBe(registerData.name);
      expect(result.user.roles).toEqual(['ROLE_USER']);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        email: registerData.email,
        username: 'otheruser',
      });

      await expect(service.register(registerData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerData)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw ConflictException when username already taken', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        email: 'other@example.com',
        username: registerData.username,
      });

      await expect(service.register(registerData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerData)).rejects.toThrow(
        'Username already taken',
      );
    });

    it('should hash password with salt rounds of 12', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              userId: BigInt(2),
              email: registerData.email,
              username: registerData.username,
              name: registerData.name,
            }),
          },
          userRole: { create: jest.fn() },
          creditBalance: { create: jest.fn() },
          creditLedger: { create: jest.fn() },
          settingUser: { create: jest.fn() },
        };
        return callback(tx);
      });

      mockJwtService.signAsync.mockResolvedValue('token');
      mockConfigService.get.mockReturnValue('secret');

      await service.register(registerData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should create credit balance with free signup credits during registration', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      const mockCreditBalanceCreate = jest.fn();
      const mockCreditLedgerCreate = jest.fn();

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              userId: BigInt(2),
              email: registerData.email,
              username: registerData.username,
              name: registerData.name,
            }),
          },
          userRole: { create: jest.fn() },
          creditBalance: { create: mockCreditBalanceCreate },
          creditLedger: { create: mockCreditLedgerCreate },
          settingUser: { create: jest.fn() },
        };
        return callback(tx);
      });

      mockJwtService.signAsync.mockResolvedValue('token');
      mockConfigService.get.mockReturnValue('secret');

      await service.register(registerData);

      expect(mockCreditBalanceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            available: 20,
            lifetimeEarned: 20,
            lifetimeSpent: 0,
          }),
        }),
      );

      expect(mockCreditLedgerCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 20,
            balanceAfter: 20,
            type: 'GRANT',
          }),
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for a valid user', async () => {
      const mockUser = {
        userId: BigInt(1),
        email: 'user@example.com',
        username: 'testuser',
        roles: [{ role: { name: 'ROLE_USER' } }],
        subscription: { plan: { slug: 'starter' } },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockConfigService.get.mockReturnValue('refresh-secret');

      const result = await service.refreshTokens(BigInt(1));

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException when user not found during refresh', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(BigInt(999))).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(BigInt(999))).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data for a valid userId', async () => {
      const mockUser = {
        userId: BigInt(1),
        email: 'user@example.com',
        username: 'testuser',
        name: 'Test User',
        roles: [{ role: { name: 'ROLE_USER' } }],
        subscription: { plan: { slug: 'pro' } },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(1);

      expect(result).toEqual({
        userId: 1,
        email: 'user@example.com',
        username: 'testuser',
        name: 'Test User',
        roles: ['ROLE_USER'],
        planSlug: 'pro',
      });
    });

    it('should return null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(999);

      expect(result).toBeNull();
    });
  });

  describe('generateTokens (via login)', () => {
    it('should generate both access and refresh tokens with correct payload', async () => {
      const mockUser = {
        userId: BigInt(5),
        email: 'jwt@test.com',
        username: 'jwtuser',
        password: '$2b$12$hashed',
        name: 'JWT User',
        roles: [
          { role: { name: 'ROLE_USER' } },
          { role: { name: 'ROLE_ADMIN' } },
        ],
        subscription: { plan: { slug: 'business' } },
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'my-refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return defaultValue;
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login('jwt@test.com', 'password');

      // Access token call (first)
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 5,
        email: 'jwt@test.com',
        username: 'jwtuser',
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        planSlug: 'business',
      });

      // Refresh token call (second) with separate secret and expiry
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 5,
          email: 'jwt@test.com',
          username: 'jwtuser',
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          planSlug: 'business',
        },
        expect.objectContaining({
          secret: 'my-refresh-secret',
        }),
      );
    });
  });
});
