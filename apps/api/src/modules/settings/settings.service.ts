import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    const cached = await this.redis.get('site:settings');
    if (cached) return JSON.parse(cached);

    const settings = await this.prisma.siteSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    await this.redis.set('site:settings', JSON.stringify(result), 300);
    return result;
  }

  async getByGroup(group: string): Promise<Record<string, string>> {
    const settings = await this.prisma.siteSetting.findMany({
      where: { group },
    });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async update(key: string, value: string): Promise<{ key: string; value: string }> {
    await this.prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: 'general' },
    });
    await this.redis.del('site:settings');
    return { key, value };
  }

  async updateMany(updates: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(updates)) {
      await this.prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: 'general' },
      });
    }
    await this.redis.del('site:settings');
    return updates;
  }
}
