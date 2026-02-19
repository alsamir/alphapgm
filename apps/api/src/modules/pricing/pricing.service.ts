import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { parseDecimalString, calculateConverterPrice } from '@catapp/shared-utils';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getMetalPrices() {
    // Try cache first
    const cached = await this.redis.get('pricing:metals');
    if (cached) return JSON.parse(cached);

    const metals = await this.prisma.priceMetals.findMany({
      include: { currency: true },
      orderBy: { id: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const metal of metals) {
      const key = metal.name?.toLowerCase() || '';
      if (key.includes('plat') || key === 'xpt') {
        result.platinum = { id: metal.id, name: 'Platinum', price: metal.price || 0, currency: metal.currency?.currencyCodes || 'USD', date: metal.date };
      } else if (key.includes('pallad') || key === 'xpd') {
        result.palladium = { id: metal.id, name: 'Palladium', price: metal.price || 0, currency: metal.currency?.currencyCodes || 'USD', date: metal.date };
      } else if (key.includes('rhod') || key === 'xrh') {
        result.rhodium = { id: metal.id, name: 'Rhodium', price: metal.price || 0, currency: metal.currency?.currencyCodes || 'USD', date: metal.date };
      }
    }
    result.updatedAt = new Date();

    // Cache for 5 minutes
    await this.redis.set('pricing:metals', JSON.stringify(result), 300);

    return result;
  }

  async getPercentages() {
    const percentage = await this.prisma.pricePercentage.findFirst({ orderBy: { id: 'asc' } });
    return percentage || { id: 1, pt: 0, pd: 0, rh: 0 };
  }

  async updatePercentages(data: { pt: number; pd: number; rh: number }) {
    const existing = await this.prisma.pricePercentage.findFirst({ orderBy: { id: 'asc' } });
    if (existing) {
      return this.prisma.pricePercentage.update({
        where: { id: existing.id },
        data: { pt: data.pt, pd: data.pd, rh: data.rh },
      });
    }
    return this.prisma.pricePercentage.create({
      data: { pt: data.pt, pd: data.pd, rh: data.rh },
    });
  }

  async updateMetalPrice(id: number, price: number) {
    const updated = await this.prisma.priceMetals.update({
      where: { id },
      data: { price, date: new Date() },
    });
    await this.redis.del('pricing:metals');
    return updated;
  }

  async calculatePrice(converter: any, userDiscount: number = 0) {
    const metals = await this.getMetalPrices();
    const percentages = await this.getPercentages();

    const ptContent = parseDecimalString(converter.pt);
    const pdContent = parseDecimalString(converter.pd);
    const rhContent = parseDecimalString(converter.rh);
    const weight = parseDecimalString(converter.weight);

    // DB stores recovery percentages as decimals (0.85 = 85%), but
    // calculateConverterPrice expects 0-100 range
    const recoveryPt = (percentages.pt || 0) <= 1 ? (percentages.pt || 0) * 100 : (percentages.pt || 0);
    const recoveryPd = (percentages.pd || 0) <= 1 ? (percentages.pd || 0) * 100 : (percentages.pd || 0);
    const recoveryRh = (percentages.rh || 0) <= 1 ? (percentages.rh || 0) * 100 : (percentages.rh || 0);

    const result = calculateConverterPrice({
      ptContent,
      pdContent,
      rhContent,
      ptSpotPrice: metals.platinum?.price || 0,
      pdSpotPrice: metals.palladium?.price || 0,
      rhSpotPrice: metals.rhodium?.price || 0,
      recoveryPt,
      recoveryPd,
      recoveryRh,
      weight: weight || 1,
      discount: userDiscount,
    });

    return {
      ...result,
      ptContent,
      pdContent,
      rhContent,
      weight,
      ptPrice: metals.platinum?.price || 0,
      pdPrice: metals.palladium?.price || 0,
      rhPrice: metals.rhodium?.price || 0,
      recoveryPt,
      recoveryPd,
      recoveryRh,
      currency: 'USD',
    };
  }

  // Scheduled task to fetch metal prices every 15 minutes
  @Cron(CronExpression.EVERY_HOUR)
  async fetchMetalPrices() {
    this.logger.log('Fetching metal prices...');
    // In production, this would call an external metal price API
    // For now, we just invalidate the cache so prices are re-read from DB
    await this.redis.del('pricing:metals');
    this.logger.log('Metal price cache invalidated');
  }
}
