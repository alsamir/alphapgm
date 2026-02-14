import { Controller, Get, Put, Body, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Public()
  @Get('metals')
  async getMetalPrices() {
    const prices = await this.pricingService.getMetalPrices();
    return { success: true, data: prices };
  }

  @Get('percentage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  async getPercentages() {
    const percentages = await this.pricingService.getPercentages();
    return { success: true, data: percentages };
  }

  @Put('percentage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  async updatePercentages(@Body() body: { pt: number; pd: number; rh: number }) {
    const result = await this.pricingService.updatePercentages(body);
    return { success: true, data: result };
  }

  @Put('metals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  async updateMetalPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { price: number },
  ) {
    const result = await this.pricingService.updateMetalPrice(id, body.price);
    return { success: true, data: result };
  }
}
