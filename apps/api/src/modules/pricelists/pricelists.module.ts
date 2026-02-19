import { Module } from '@nestjs/common';
import { PriceListsService } from './pricelists.service';
import { PriceListsController } from './pricelists.controller';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
