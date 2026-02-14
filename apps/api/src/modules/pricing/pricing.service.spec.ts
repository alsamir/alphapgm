import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

// Mock the shared-utils module
jest.mock('@catapp/shared-utils', () => ({
  parseDecimalString: (value: string): number => {
    if (!value || value.trim() === '') return 0;
    return parseFloat(value.replace(',', '.')) || 0;
  },
  calculateConverterPrice: jest.fn((input: any) => {
    const TROY_OZ_PER_GRAM = 1 / 31.1035;
    const ptPricePerGram = input.ptSpotPrice * TROY_OZ_PER_GRAM;
    const pdPricePerGram = input.pdSpotPrice * TROY_OZ_PER_GRAM;
    const rhPricePerGram = input.rhSpotPrice * TROY_OZ_PER_GRAM;

    const ptValue = input.ptContent * input.weight * ptPricePerGram * (input.recoveryPt / 100);
    const pdValue = input.pdContent * input.weight * pdPricePerGram * (input.recoveryPd / 100);
    const rhValue = input.rhContent * input.weight * rhPricePerGram * (input.recoveryRh / 100);

    const grossValue = ptValue + pdValue + rhValue;
    const discountAmount = grossValue * (input.discount / 100);
    const finalPrice = grossValue - discountAmount;

    return {
      ptValue: Math.round(ptValue * 100) / 100,
      pdValue: Math.round(pdValue * 100) / 100,
      rhValue: Math.round(rhValue * 100) / 100,
      grossValue: Math.round(grossValue * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }),
}));

describe('PricingService', () => {
  let service: PricingService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrisma = {
    priceMetals: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pricePercentage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  describe('getMetalPrices', () => {
    const mockMetals = [
      {
        id: 1,
        name: 'Platinum',
        price: 950,
        date: new Date('2024-06-01'),
        currency: { currencyCodes: 'USD' },
      },
      {
        id: 2,
        name: 'Palladium',
        price: 1050,
        date: new Date('2024-06-01'),
        currency: { currencyCodes: 'USD' },
      },
      {
        id: 3,
        name: 'Rhodium',
        price: 4500,
        date: new Date('2024-06-01'),
        currency: { currencyCodes: 'USD' },
      },
    ];

    it('should return cached metal prices when available', async () => {
      const cachedPrices = {
        platinum: { id: 1, name: 'Platinum', price: 950, currency: 'USD' },
        palladium: { id: 2, name: 'Palladium', price: 1050, currency: 'USD' },
        rhodium: { id: 3, name: 'Rhodium', price: 4500, currency: 'USD' },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrices));

      const result = await service.getMetalPrices();

      expect(result).toEqual(cachedPrices);
      expect(mockPrisma.priceMetals.findMany).not.toHaveBeenCalled();
    });

    it('should query database when cache is empty and cache the result', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.priceMetals.findMany.mockResolvedValue(mockMetals);
      mockRedis.set.mockResolvedValue(undefined);

      const result = await service.getMetalPrices();

      expect(result.platinum).toBeDefined();
      expect(result.platinum.price).toBe(950);
      expect(result.platinum.name).toBe('Platinum');
      expect(result.palladium.price).toBe(1050);
      expect(result.rhodium.price).toBe(4500);
      expect(result.updatedAt).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'pricing:metals',
        expect.any(String),
        300,
      );
    });

    it('should handle metals with missing currency gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.priceMetals.findMany.mockResolvedValue([
        { id: 1, name: 'Platinum', price: 900, date: new Date(), currency: null },
      ]);

      const result = await service.getMetalPrices();

      expect(result.platinum.currency).toBe('USD'); // default fallback
    });

    it('should handle metals with null price', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.priceMetals.findMany.mockResolvedValue([
        { id: 1, name: 'Platinum', price: null, date: new Date(), currency: { currencyCodes: 'USD' } },
      ]);

      const result = await service.getMetalPrices();

      expect(result.platinum.price).toBe(0);
    });

    it('should correctly categorize metals by name substring matching', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.priceMetals.findMany.mockResolvedValue([
        { id: 1, name: 'Platinum (spot)', price: 900, date: new Date(), currency: { currencyCodes: 'EUR' } },
        { id: 2, name: 'Palladium (spot)', price: 1100, date: new Date(), currency: { currencyCodes: 'EUR' } },
        { id: 3, name: 'Rhodium (spot)', price: 5000, date: new Date(), currency: { currencyCodes: 'EUR' } },
      ]);

      const result = await service.getMetalPrices();

      expect(result.platinum).toBeDefined();
      expect(result.palladium).toBeDefined();
      expect(result.rhodium).toBeDefined();
    });
  });

  describe('getPercentages', () => {
    it('should return existing percentages from the database', async () => {
      const mockPercentage = { id: 1, pt: 85, pd: 80, rh: 75 };
      mockPrisma.pricePercentage.findFirst.mockResolvedValue(mockPercentage);

      const result = await service.getPercentages();

      expect(result).toEqual(mockPercentage);
    });

    it('should return default values when no percentage record exists', async () => {
      mockPrisma.pricePercentage.findFirst.mockResolvedValue(null);

      const result = await service.getPercentages();

      expect(result).toEqual({ id: 1, pt: 0, pd: 0, rh: 0 });
    });
  });

  describe('calculatePrice', () => {
    const mockConverter = {
      pt: '2.5',
      pd: '1.2',
      rh: '0.3',
      weight: '1.5',
    };

    beforeEach(() => {
      // Mock getMetalPrices and getPercentages
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.priceMetals.findMany.mockResolvedValue([
        { id: 1, name: 'Platinum', price: 950, date: new Date(), currency: { currencyCodes: 'USD' } },
        { id: 2, name: 'Palladium', price: 1050, date: new Date(), currency: { currencyCodes: 'USD' } },
        { id: 3, name: 'Rhodium', price: 4500, date: new Date(), currency: { currencyCodes: 'USD' } },
      ]);
      mockPrisma.pricePercentage.findFirst.mockResolvedValue({ id: 1, pt: 85, pd: 80, rh: 75 });
      mockRedis.set.mockResolvedValue(undefined);
    });

    it('should calculate price with all three metals', async () => {
      const result = await service.calculatePrice(mockConverter);

      expect(result.ptContent).toBe(2.5);
      expect(result.pdContent).toBe(1.2);
      expect(result.rhContent).toBe(0.3);
      expect(result.weight).toBe(1.5);
      expect(result.ptPrice).toBe(950);
      expect(result.pdPrice).toBe(1050);
      expect(result.rhPrice).toBe(4500);
      expect(result.recoveryPt).toBe(85);
      expect(result.recoveryPd).toBe(80);
      expect(result.recoveryRh).toBe(75);
      expect(result.currency).toBe('USD');
      expect(typeof result.finalPrice).toBe('number');
      expect(typeof result.grossValue).toBe('number');
      expect(result.finalPrice).toBeGreaterThan(0);
    });

    it('should apply user discount correctly', async () => {
      const resultNoDiscount = await service.calculatePrice(mockConverter, 0);
      const resultWithDiscount = await service.calculatePrice(mockConverter, 10);

      expect(resultWithDiscount.discount).toBeGreaterThan(0);
      expect(resultWithDiscount.finalPrice).toBeLessThan(resultNoDiscount.grossValue);
    });

    it('should handle converter with zero metal content', async () => {
      const emptyConverter = {
        pt: '0',
        pd: '0',
        rh: '0',
        weight: '1.0',
      };

      const result = await service.calculatePrice(emptyConverter);

      expect(result.ptContent).toBe(0);
      expect(result.pdContent).toBe(0);
      expect(result.rhContent).toBe(0);
      expect(result.finalPrice).toBe(0);
      expect(result.grossValue).toBe(0);
    });

    it('should handle converter with comma-separated decimal values', async () => {
      const commaConverter = {
        pt: '2,5',
        pd: '1,2',
        rh: '0,3',
        weight: '1,5',
      };

      const result = await service.calculatePrice(commaConverter);

      expect(result.ptContent).toBe(2.5);
      expect(result.pdContent).toBe(1.2);
      expect(result.rhContent).toBe(0.3);
      expect(result.weight).toBe(1.5);
    });

    it('should handle missing metal prices gracefully', async () => {
      mockPrisma.priceMetals.findMany.mockResolvedValue([]);

      const result = await service.calculatePrice(mockConverter);

      expect(result.ptPrice).toBe(0);
      expect(result.pdPrice).toBe(0);
      expect(result.rhPrice).toBe(0);
    });

    it('should default discount to 0 when not provided', async () => {
      const result = await service.calculatePrice(mockConverter);

      expect(result.discount).toBe(0);
      expect(result.finalPrice).toBe(result.grossValue);
    });
  });

  describe('updateMetalPrice', () => {
    it('should update metal price and invalidate cache', async () => {
      const updated = { id: 1, name: 'Platinum', price: 1000, date: new Date() };
      mockPrisma.priceMetals.update.mockResolvedValue(updated);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.updateMetalPrice(1, 1000);

      expect(result.price).toBe(1000);
      expect(mockRedis.del).toHaveBeenCalledWith('pricing:metals');
    });
  });

  describe('updatePercentages', () => {
    it('should update existing percentages', async () => {
      const existing = { id: 1, pt: 80, pd: 75, rh: 70 };
      const updated = { id: 1, pt: 85, pd: 80, rh: 75 };

      mockPrisma.pricePercentage.findFirst.mockResolvedValue(existing);
      mockPrisma.pricePercentage.update.mockResolvedValue(updated);

      const result = await service.updatePercentages({ pt: 85, pd: 80, rh: 75 });

      expect(result).toEqual(updated);
      expect(mockPrisma.pricePercentage.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { pt: 85, pd: 80, rh: 75 },
      });
    });

    it('should create new percentages when none exist', async () => {
      mockPrisma.pricePercentage.findFirst.mockResolvedValue(null);
      const created = { id: 1, pt: 85, pd: 80, rh: 75 };
      mockPrisma.pricePercentage.create.mockResolvedValue(created);

      const result = await service.updatePercentages({ pt: 85, pd: 80, rh: 75 });

      expect(result).toEqual(created);
      expect(mockPrisma.pricePercentage.create).toHaveBeenCalledWith({
        data: { pt: 85, pd: 80, rh: 75 },
      });
    });
  });

  describe('fetchMetalPrices (cron)', () => {
    it('should invalidate the metal price cache', async () => {
      mockRedis.del.mockResolvedValue(undefined);

      await service.fetchMetalPrices();

      expect(mockRedis.del).toHaveBeenCalledWith('pricing:metals');
    });
  });
});
