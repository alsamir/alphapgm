import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: PrismaService;

  const mockPrisma = {
    plan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    creditBalance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    creditLedger: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: '', // Empty so Stripe client is not created
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      };
      return config[key] || '';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPlans', () => {
    it('should return all active plans sorted by price ascending', async () => {
      const mockPlans = [
        { id: 1, slug: 'free', name: 'Free', priceCents: 0, isActive: true, monthlyCredits: 0 },
        { id: 2, slug: 'starter', name: 'Starter', priceCents: 1999, isActive: true, monthlyCredits: 150 },
        { id: 3, slug: 'pro', name: 'Pro', priceCents: 3999, isActive: true, monthlyCredits: 500 },
      ];

      mockPrisma.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getPlans();

      expect(result).toEqual(mockPlans);
      expect(result.length).toBe(3);
      expect(mockPrisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { priceCents: 'asc' },
      });
    });

    it('should return empty array when no active plans exist', async () => {
      mockPrisma.plan.findMany.mockResolvedValue([]);

      const result = await service.getPlans();

      expect(result).toEqual([]);
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription with plan details', async () => {
      const mockSub = {
        id: 1,
        userId: BigInt(1),
        planId: 2,
        status: 'active',
        plan: { id: 2, slug: 'starter', name: 'Starter' },
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);

      const result = await service.getUserSubscription(BigInt(1));

      expect(result).toEqual(mockSub);
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
        include: { plan: true },
      });
    });

    it('should return null when user has no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getUserSubscription(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw Error when Stripe is not configured', async () => {
      // Stripe is not configured because STRIPE_SECRET_KEY is empty
      await expect(
        service.createCheckoutSession(BigInt(1), 'pro'),
      ).rejects.toThrow('Stripe is not configured');
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should process a new subscription with monthly credits', async () => {
      const mockPlan = { id: 2, name: 'Starter', monthlyCredits: 150, slug: 'starter' };

      mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          subscription: { upsert: jest.fn() },
          creditBalance: {
            findUnique: jest.fn().mockResolvedValue({ available: 10 }),
            upsert: jest.fn(),
          },
          creditLedger: { create: jest.fn() },
        };
        return callback(tx);
      });

      const stripeSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        metadata: { userId: '1', planId: '2' },
      } as any;

      await service.handleSubscriptionCreated(stripeSubscription);

      expect(mockPrisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip when plan is not found', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue(null);

      const stripeSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        metadata: { userId: '1', planId: '999' },
      } as any;

      await service.handleSubscriptionCreated(stripeSubscription);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('should update subscription status and period dates', async () => {
      const existingSub = { id: 1, providerSubscriptionId: 'sub_abc' };
      mockPrisma.subscription.findFirst.mockResolvedValue(existingSub);
      mockPrisma.subscription.update.mockResolvedValue({});

      const now = Math.floor(Date.now() / 1000);
      const stripeSubscription = {
        id: 'sub_abc',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: now + 30 * 86400,
      } as any;

      await service.handleSubscriptionUpdated(stripeSubscription);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      });
    });

    it('should do nothing when subscription is not found', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await service.handleSubscriptionUpdated({
        id: 'sub_nonexistent',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: 0,
        current_period_end: 0,
      } as any);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should mark subscription as canceled', async () => {
      const existingSub = { id: 1, providerSubscriptionId: 'sub_del' };
      mockPrisma.subscription.findFirst.mockResolvedValue(existingSub);
      mockPrisma.subscription.update.mockResolvedValue({});

      await service.handleSubscriptionDeleted({
        id: 'sub_del',
        metadata: {},
      } as any);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'canceled' },
      });
    });

    it('should do nothing when subscription is not found during deletion', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await service.handleSubscriptionDeleted({
        id: 'sub_unknown',
        metadata: {},
      } as any);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should throw Error when Stripe is not configured', async () => {
      await expect(service.cancelSubscription(BigInt(1))).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });
});
