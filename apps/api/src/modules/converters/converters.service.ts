import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ConvertersService {
  private readonly logger = new Logger(ConvertersService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async search(params: {
    query?: string;
    brand?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50); // Max 50 - anti-scraping
    const skip = (page - 1) * limit;

    const where: Prisma.AllDataWhereInput = {};

    if (params.brand) {
      where.brand = { equals: params.brand };
    }

    if (params.query) {
      where.OR = [
        { name: { contains: params.query } },
        { keywords: { contains: params.query } },
        { nameModified: { contains: params.query } },
      ];
    }

    const orderBy: Prisma.AllDataOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'name';
    if (sortField === 'name' || sortField === 'brand') {
      orderBy[sortField] = params.sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const data = await this.prisma.allData.findMany({
      where,
      orderBy,
      skip,
      take: limit + 1, // Fetch one extra to check if there's more (no total count exposed - anti-scraping)
    });

    const hasMore = data.length > limit;
    const results = hasMore ? data.slice(0, limit) : data;

    return {
      data: results.map(this.sanitizeConverter),
      page,
      limit,
      hasMore,
    };
  }

  async findById(id: number) {
    const converter = await this.prisma.allData.findUnique({ where: { id } });
    if (!converter) {
      throw new NotFoundException(`Converter with ID ${id} not found`);
    }
    return converter;
  }

  async getBrands() {
    // Try cache first
    const cached = await this.redis.get('converter:brands');
    if (cached) return JSON.parse(cached);

    const brands = await this.prisma.allData.groupBy({
      by: ['brand'],
      _count: { id: true },
      orderBy: { brand: 'asc' },
    });

    // Get one brandImage per brand
    const brandImages = await this.prisma.allData.findMany({
      where: { brandImage: { not: null } },
      distinct: ['brand'],
      select: { brand: true, brandImage: true },
    });
    const imageMap = new Map(brandImages.map((b) => [b.brand, b.brandImage]));

    const result = brands.map((b) => ({
      name: b.brand,
      count: b._count.id,
      brandImage: imageMap.get(b.brand) || null,
    }));

    // Cache for 1 hour
    await this.redis.set('converter:brands', JSON.stringify(result), 3600);

    return result;
  }

  async create(data: {
    name: string;
    brand: string;
    nameModified?: string;
    urlPath?: string;
    weight?: string;
    pt?: string;
    pd?: string;
    rh?: string;
    keywords?: string;
    imageUrl?: string;
    brandImage?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const converter = await this.prisma.allData.create({
      data: {
        name: data.name,
        nameModified: data.nameModified || data.name,
        urlPath: data.urlPath || `${slug}.html`,
        brand: data.brand,
        weight: data.weight || '0',
        pt: data.pt || '0',
        pd: data.pd || '0',
        rh: data.rh || '0',
        keywords: data.keywords || data.name.toLowerCase(),
        imageUrl: data.imageUrl || '',
        prices: '0',
        brandImage: data.brandImage || null,
        createdDate: new Date(),
      },
    });

    // Invalidate brands cache
    await this.redis.del('converter:brands');

    return converter;
  }

  async update(id: number, data: Partial<{
    name: string;
    nameModified: string;
    urlPath: string;
    brand: string;
    weight: string;
    pt: string;
    pd: string;
    rh: string;
    keywords: string;
    imageUrl: string;
    brandImage: string;
  }>) {
    await this.findById(id); // Throws if not found

    const converter = await this.prisma.allData.update({
      where: { id },
      data,
    });

    // Invalidate caches
    await this.redis.del('converter:brands');
    await this.redis.del(`converter:${id}`);

    return converter;
  }

  async delete(id: number) {
    await this.findById(id); // Throws if not found
    await this.prisma.allData.delete({ where: { id } });
    await this.redis.del('converter:brands');
    await this.redis.del(`converter:${id}`);
    return { success: true, message: 'Converter deleted' };
  }

  async importCsv(records: Array<Record<string, string>>) {
    let imported = 0;
    let errors = 0;

    for (const record of records) {
      try {
        await this.prisma.allData.create({
          data: {
            name: record.name || '',
            nameModified: record.name_modified || record.name || '',
            urlPath: record.url_path || '',
            brand: record.brand || '',
            weight: record.weight || '0',
            pt: record.pt || '0',
            pd: record.pd || '0',
            rh: record.rh || '0',
            keywords: record.keywords || '',
            imageUrl: record.image_url || '',
            prices: record.prices || '0',
            brandImage: record.brand_image || null,
            createdDate: new Date(),
          },
        });
        imported++;
      } catch (e) {
        errors++;
        this.logger.warn(`Import error for record: ${record.name}: ${e}`);
      }
    }

    await this.redis.del('converter:brands');
    return { imported, errors, total: records.length };
  }

  async getUserDiscount(userId: bigint): Promise<number> {
    const settings = await this.prisma.settingUser.findFirst({ where: { userId } });
    return settings?.discount || 0;
  }

  private sanitizeConverter(converter: any) {
    return {
      id: converter.id,
      name: converter.name,
      nameModified: converter.nameModified,
      urlPath: converter.urlPath,
      brand: converter.brand,
      weight: converter.weight,
      imageUrl: converter.imageUrl || null,
      brandImage: converter.brandImage,
      createdDate: converter.createdDate,
      // Note: pt, pd, rh, prices are NOT exposed in public list views
      // They require auth + credit deduction (detail view)
    };
  }

  async searchFull(params: {
    query?: string;
    brand?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AllDataWhereInput = {};
    if (params.brand) {
      where.brand = { equals: params.brand };
    }
    if (params.query) {
      where.OR = [
        { name: { contains: params.query } },
        { keywords: { contains: params.query } },
        { nameModified: { contains: params.query } },
      ];
    }

    const orderBy: Prisma.AllDataOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'name';
    if (sortField === 'name' || sortField === 'brand') {
      orderBy[sortField] = params.sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [data, total] = await Promise.all([
      this.prisma.allData.findMany({ where, orderBy, skip, take: limit + 1 }),
      this.prisma.allData.count({ where }),
    ]);

    const hasMore = data.length > limit;
    const results = hasMore ? data.slice(0, limit) : data;

    return {
      data: results.map((c) => ({
        id: c.id,
        name: c.name,
        nameModified: c.nameModified,
        urlPath: c.urlPath,
        brand: c.brand,
        weight: c.weight,
        pt: c.pt,
        pd: c.pd,
        rh: c.rh,
        keywords: c.keywords,
        imageUrl: c.imageUrl || null,
        brandImage: c.brandImage,
      })),
      page,
      limit,
      hasMore,
      total,
    };
  }
}
