import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConvertersService } from './converters.service';
import { PricingService } from '../pricing/pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreditCost } from '../../common/decorators/credit-cost.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Converters')
@Controller('converters')
export class ConvertersController {
  constructor(
    private convertersService: ConvertersService,
    private pricingService: PricingService,
  ) {}

  @Public()
  @Get()
  @Throttle({ short: { ttl: 60000, limit: 30 } })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  async search(
    @Query('query') query?: string,
    @Query('brand') brand?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const result = await this.convertersService.search({ query, brand, page, limit, sortBy, sortOrder });
    return { success: true, data: result };
  }

  @Public()
  @Get('brands')
  async getBrands() {
    const brands = await this.convertersService.getBrands();
    return { success: true, data: brands };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth()
  @CreditCost(1)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ) {
    const converter = await this.convertersService.findById(id);

    // Calculate price based on metal content and current spot prices
    let calculatedPrice = null;
    try {
      // Get user discount from settings
      const userSettings = await this.convertersService.getUserDiscount(BigInt(userId));
      const pricing = await this.pricingService.calculatePrice(converter, userSettings);
      calculatedPrice = pricing.finalPrice;
    } catch (err) {
      // Pricing calculation is best-effort
    }

    return {
      success: true,
      data: {
        ...converter,
        calculatedPrice,
      },
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN', 'ROLE_MODERATOR')
  @ApiBearerAuth()
  async create(@Body() body: any) {
    const converter = await this.convertersService.create(body);
    return { success: true, data: converter };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN', 'ROLE_MODERATOR')
  @ApiBearerAuth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const converter = await this.convertersService.update(id, body);
    return { success: true, data: converter };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.convertersService.delete(id);
    return result;
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  async importCsv(@Body() body: { records: Array<Record<string, string>> }) {
    const result = await this.convertersService.importCsv(body.records);
    return { success: true, data: result };
  }
}
