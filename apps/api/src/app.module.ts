import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConvertersModule } from './modules/converters/converters.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ImagesModule } from './modules/images/images.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { PriceListsModule } from './modules/pricelists/pricelists.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RedisModule } from './common/redis/redis.module';
import { CreditInterceptor } from './common/interceptors/credit.interceptor';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CreditInterceptor,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ConvertersModule,
    PricingModule,
    SubscriptionsModule,
    ImagesModule,
    AiModule,
    AdminModule,
    PriceListsModule,
    SettingsModule,
  ],
})
export class AppModule {}
