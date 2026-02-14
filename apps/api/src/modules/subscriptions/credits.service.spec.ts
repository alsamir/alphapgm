import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CreditsService', () => {
  let service: CreditsService;
  let prisma: PrismaService;

  const mockPrisma = {
    creditBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    creditLedger: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return '';
      if (key === 'NEXT_PUBLIC_APP_URL') return 'http://localhost:3000';
      return '';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return existing balance for user', async () => {
      const mockBalance = {
        userId: BigInt(1),
        available: 50,
        lifetimeEarned: 70,
        lifetimeSpent: 20,
      };

      mockPrisma.creditBalance.findUnique.mockResolvedValue(mockBalance);

      const result = await service.getBalance(BigInt(1));

      expect(result).toEqual(mockBalance);
      expect(mockPrisma.creditBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
      });
    });

    it('should return zero balance when no record exists', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue(null);

      const result = await service.getBalance(BigInt(999));

      expect(result).toEqual({
        userId: 999,
        available: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      });
    });
  });

  describe('getLedger', () => {
    it('should return paginated ledger entries', async () => {
      const mockEntries = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        userId: BigInt(1),
        amount: i % 2 === 0 ? -1 : 10,
        balanceAfter: 20 - i,
        type: i % 2 === 0 ? 'CONSUMPTION' : 'GRANT',
        sourceDetail: `Entry ${i + 1}`,
        createdAt: new Date(),
      }));

      mockPrisma.creditLedger.findMany.mockResolvedValue(mockEntries);

      const result = await service.getLedger(BigInt(1), 1, 20);

      expect(result.data.length).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('should detect hasMore when extra entry returned', async () => {
      const mockEntries = Array.from({ length: 21 }, (_, i) => ({
        id: i + 1,
        userId: BigInt(1),
        amount: -1,
        balanceAfter: 100 - i,
        type: 'CONSUMPTION',
        sourceDetail: `Entry ${i + 1}`,
        createdAt: new Date(),
      }));

      mockPrisma.creditLedger.findMany.mockResolvedValue(mockEntries);

      const result = await service.getLedger(BigInt(1), 1, 20);

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(20);
    });

    it('should correctly calculate skip for pagination', async () => {
      mockPrisma.creditLedger.findMany.mockResolvedValue([]);

      await service.getLedger(BigInt(1), 3, 10);

      expect(mockPrisma.creditLedger.findMany).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
        orderBy: { createdAt: 'desc' },
        skip: 20, // (3-1) * 10
        take: 11, // 10 + 1
      });
    });
  });

  describe('deductCredits', () => {
    it('should successfully deduct credits when sufficient balance', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 50,
        lifetimeEarned: 70,
        lifetimeSpent: 20,
      });
      mockPrisma.$transaction.mockResolvedValue(undefined);

      const result = await service.deductCredits(BigInt(1), 5, 'Converter view');

      expect(result).toEqual({ available: 45 });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // The transaction receives an array of two Prisma client calls
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(transactionArg)).toBe(true);
      expect(transactionArg).toHaveLength(2);

      // Verify the underlying mock methods were called with correct args
      expect(mockPrisma.creditBalance.update).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
        data: {
          available: { decrement: 5 },
          lifetimeSpent: { increment: 5 },
        },
      });
      expect(mockPrisma.creditLedger.create).toHaveBeenCalledWith({
        data: {
          userId: BigInt(1),
          amount: -5,
          balanceAfter: 45,
          type: 'CONSUMPTION',
          sourceDetail: 'Converter view',
        },
      });
    });

    it('should throw ForbiddenException when insufficient credits', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 2,
        lifetimeEarned: 20,
        lifetimeSpent: 18,
      });

      await expect(
        service.deductCredits(BigInt(1), 5, 'Converter view'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deductCredits(BigInt(1), 5, 'Converter view'),
      ).rejects.toThrow('Insufficient credits');
    });

    it('should throw ForbiddenException when no balance record exists', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.deductCredits(BigInt(1), 1, 'Converter view'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deduct exactly the requested amount', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 10,
      });
      mockPrisma.$transaction.mockResolvedValue(undefined);

      const result = await service.deductCredits(BigInt(1), 10, 'Exact deduction');

      expect(result).toEqual({ available: 0 });
    });

    it('should fail when balance equals amount minus one', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 4,
      });

      await expect(
        service.deductCredits(BigInt(1), 5, 'Over limit'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addCredits', () => {
    it('should add credits to existing balance', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 30,
        lifetimeEarned: 50,
        lifetimeSpent: 20,
      });
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: { upsert: jest.fn() },
          creditLedger: { create: jest.fn() },
        };
        return callback(tx);
      });

      const result = await service.addCredits(BigInt(1), 50, 'GRANT', 'Subscription credits');

      expect(result).toEqual({ available: 80 }); // 30 + 50
    });

    it('should create new balance when none exists', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue(null);

      const mockUpsert = jest.fn();
      const mockLedgerCreate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: { upsert: mockUpsert },
          creditLedger: { create: mockLedgerCreate },
        };
        return callback(tx);
      });

      const result = await service.addCredits(BigInt(1), 20, 'GRANT', 'Free signup');

      expect(result).toEqual({ available: 20 }); // 0 + 20
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: BigInt(1) },
          create: expect.objectContaining({
            available: 20,
            lifetimeEarned: 20,
            lifetimeSpent: 0,
          }),
          update: expect.objectContaining({
            available: { increment: 20 },
            lifetimeEarned: { increment: 20 },
          }),
        }),
      );
    });

    it('should record the correct type and source in the ledger', async () => {
      mockPrisma.creditBalance.findUnique.mockResolvedValue({
        userId: BigInt(1),
        available: 10,
      });

      const mockLedgerCreate = jest.fn();
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: { upsert: jest.fn() },
          creditLedger: { create: mockLedgerCreate },
        };
        return callback(tx);
      });

      await service.addCredits(BigInt(1), 150, 'GRANT', 'Starter subscription - monthly credits');

      expect(mockLedgerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: BigInt(1),
          amount: 150,
          balanceAfter: 160, // 10 + 150
          type: 'GRANT',
          sourceDetail: 'Starter subscription - monthly credits',
        }),
      });
    });
  });

  describe('createTopupCheckout', () => {
    it('should throw Error when Stripe is not configured', async () => {
      await expect(
        service.createTopupCheckout(BigInt(1), 1),
      ).rejects.toThrow('Stripe is not configured');
    });
  });
});
