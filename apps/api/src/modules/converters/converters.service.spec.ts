import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConvertersService } from './converters.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

describe('ConvertersService', () => {
  let service: ConvertersService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrisma = {
    allData: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
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
        ConvertersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ConvertersService>(ConvertersService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  describe('search', () => {
    const mockConverters = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Converter ${i + 1}`,
      nameModified: `converter-${i + 1}`,
      urlPath: `converter-${i + 1}.html`,
      brand: 'Toyota',
      weight: '1.5',
      pt: '2.5',
      pd: '1.2',
      rh: '0.3',
      brandImage: null,
      createdDate: new Date(),
      prices: '150',
      imageUrl: 'http://example.com/img.jpg',
      keywords: `converter ${i + 1}`,
    }));

    it('should return paginated results with default page and limit', async () => {
      mockPrisma.allData.findMany.mockResolvedValue(mockConverters);

      const result = await service.search({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(result.data.length).toBe(5);
      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 21, // limit + 1 for hasMore check
        }),
      );
    });

    it('should respect page and limit parameters', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ page: 3, limit: 10 });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 11, // 10 + 1
        }),
      );
    });

    it('should cap limit at 50 (anti-scraping)', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ limit: 200 });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // min(200, 50) + 1
        }),
      );
    });

    it('should detect hasMore when extra record is returned', async () => {
      // Return 21 items (limit 20 + 1 extra)
      const manyConverters = Array.from({ length: 21 }, (_, i) => ({
        id: i + 1,
        name: `Converter ${i + 1}`,
        nameModified: `converter-${i + 1}`,
        urlPath: `converter-${i + 1}.html`,
        brand: 'Toyota',
        weight: '1.5',
        brandImage: null,
        createdDate: new Date(),
      }));
      mockPrisma.allData.findMany.mockResolvedValue(manyConverters);

      const result = await service.search({});

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(20); // Should trim to limit
    });

    it('should filter by brand when provided', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ brand: 'Honda' });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brand: { equals: 'Honda' },
          }),
        }),
      );
    });

    it('should filter by query string across name, keywords, and nameModified', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ query: 'turbo' });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'turbo' } },
              { keywords: { contains: 'turbo' } },
              { nameModified: { contains: 'turbo' } },
            ],
          }),
        }),
      );
    });

    it('should apply sort order', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ sortBy: 'brand', sortOrder: 'desc' });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { brand: 'desc' },
        }),
      );
    });

    it('should default to name asc when sortBy is unsupported', async () => {
      mockPrisma.allData.findMany.mockResolvedValue([]);

      await service.search({ sortBy: 'price' });

      expect(mockPrisma.allData.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('sanitizeConverter (via search)', () => {
    it('should strip metal data (pt, pd, rh, prices, imageUrl) from list results', async () => {
      const converter = {
        id: 1,
        name: 'Test Converter',
        nameModified: 'test-converter',
        urlPath: 'test-converter.html',
        brand: 'Toyota',
        weight: '1.5',
        pt: '2.5',
        pd: '1.2',
        rh: '0.3',
        prices: '150',
        imageUrl: 'http://example.com/img.jpg',
        brandImage: 'toyota.png',
        createdDate: new Date('2024-01-01'),
        keywords: 'test',
      };

      mockPrisma.allData.findMany.mockResolvedValue([converter]);

      const result = await service.search({});

      const sanitized = result.data[0];
      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('name');
      expect(sanitized).toHaveProperty('nameModified');
      expect(sanitized).toHaveProperty('urlPath');
      expect(sanitized).toHaveProperty('brand');
      expect(sanitized).toHaveProperty('weight');
      expect(sanitized).toHaveProperty('brandImage');
      expect(sanitized).toHaveProperty('createdDate');
      // These should NOT be present in sanitized output
      expect(sanitized).not.toHaveProperty('pt');
      expect(sanitized).not.toHaveProperty('pd');
      expect(sanitized).not.toHaveProperty('rh');
      expect(sanitized).not.toHaveProperty('prices');
      expect(sanitized).not.toHaveProperty('imageUrl');
      expect(sanitized).not.toHaveProperty('keywords');
    });
  });

  describe('findById', () => {
    it('should return a converter when found', async () => {
      const mockConverter = {
        id: 1,
        name: 'Toyota A123',
        brand: 'Toyota',
        pt: '2.5',
        pd: '1.2',
        rh: '0.3',
      };

      mockPrisma.allData.findUnique.mockResolvedValue(mockConverter);

      const result = await service.findById(1);

      expect(result).toEqual(mockConverter);
      expect(mockPrisma.allData.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when converter does not exist', async () => {
      mockPrisma.allData.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        'Converter with ID 999 not found',
      );
    });
  });

  describe('create', () => {
    it('should create a converter and invalidate brands cache', async () => {
      const input = {
        name: 'New Converter XY-100',
        brand: 'Honda',
        pt: '3.0',
        pd: '1.5',
        rh: '0.5',
      };

      const createdConverter = {
        id: 10,
        ...input,
        nameModified: input.name,
        urlPath: 'new-converter-xy-100.html',
        weight: '0',
        keywords: 'new converter xy-100',
        imageUrl: '',
        prices: '0',
        brandImage: null,
        createdDate: new Date(),
      };

      mockPrisma.allData.create.mockResolvedValue(createdConverter);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.create(input);

      expect(result).toEqual(createdConverter);
      expect(mockPrisma.allData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Converter XY-100',
            brand: 'Honda',
            urlPath: 'new-converter-xy-100.html',
          }),
        }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('converter:brands');
    });

    it('should generate a slug-based urlPath from the name', async () => {
      const input = {
        name: 'Toyota DPF-2000 Special!',
        brand: 'Toyota',
      };

      mockPrisma.allData.create.mockResolvedValue({ id: 11, ...input });
      mockRedis.del.mockResolvedValue(undefined);

      await service.create(input);

      expect(mockPrisma.allData.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            urlPath: 'toyota-dpf-2000-special.html',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a converter and invalidate both caches', async () => {
      const existingConverter = {
        id: 1,
        name: 'Old Name',
        brand: 'Toyota',
      };

      mockPrisma.allData.findUnique.mockResolvedValue(existingConverter);
      mockPrisma.allData.update.mockResolvedValue({
        ...existingConverter,
        name: 'Updated Name',
      });
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.update(1, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockRedis.del).toHaveBeenCalledWith('converter:brands');
      expect(mockRedis.del).toHaveBeenCalledWith('converter:1');
    });

    it('should throw NotFoundException when updating non-existent converter', async () => {
      mockPrisma.allData.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a converter and invalidate caches', async () => {
      const existingConverter = { id: 5, name: 'To Delete', brand: 'Ford' };

      mockPrisma.allData.findUnique.mockResolvedValue(existingConverter);
      mockPrisma.allData.delete.mockResolvedValue(existingConverter);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.delete(5);

      expect(result).toEqual({ success: true, message: 'Converter deleted' });
      expect(mockPrisma.allData.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('converter:brands');
      expect(mockRedis.del).toHaveBeenCalledWith('converter:5');
    });

    it('should throw NotFoundException when deleting non-existent converter', async () => {
      mockPrisma.allData.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBrands', () => {
    it('should return cached brands when available', async () => {
      const cachedBrands = [
        { name: 'Honda', count: 10 },
        { name: 'Toyota', count: 20 },
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedBrands));

      const result = await service.getBrands();

      expect(result).toEqual(cachedBrands);
      expect(mockPrisma.allData.groupBy).not.toHaveBeenCalled();
    });

    it('should query database and cache result when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.allData.groupBy.mockResolvedValue([
        { brand: 'BMW', _count: { id: 5 } },
        { brand: 'Ford', _count: { id: 15 } },
      ]);
      mockRedis.set.mockResolvedValue(undefined);

      const result = await service.getBrands();

      expect(result).toEqual([
        { name: 'BMW', count: 5 },
        { name: 'Ford', count: 15 },
      ]);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'converter:brands',
        expect.any(String),
        3600,
      );
    });
  });
});
