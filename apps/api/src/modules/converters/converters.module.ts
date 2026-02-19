import { Module } from '@nestjs/common';
import { ConvertersService } from './converters.service';
import { ConvertersController } from './converters.controller';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [ConvertersController],
  providers: [ConvertersService],
  exports: [ConvertersService],
})
export class ConvertersModule {}
