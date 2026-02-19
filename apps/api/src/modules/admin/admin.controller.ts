import { Controller, Get, Post, Put, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ConvertersService } from '../converters/converters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private adminService: AdminService,
    private convertersService: ConvertersService,
  ) {}

  @Get('converters')
  async searchConverters(
    @Query('query') query?: string,
    @Query('brand') brand?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const result = await this.convertersService.searchFull({ query, brand, page, limit, sortBy, sortOrder });
    return { success: true, data: result };
  }

  @Get('dashboard')
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return { success: true, data: stats };
  }

  @Get('revenue')
  async getRevenueStats() {
    const stats = await this.adminService.getRevenueStats();
    return { success: true, data: stats };
  }

  @Get('credits/stats')
  async getCreditStats() {
    const stats = await this.adminService.getCreditStats();
    return { success: true, data: stats };
  }

  @Get('credits/ledger')
  async getCreditLedger(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.adminService.getCreditLedger({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '25', 10),
      type,
      search,
    });
    return { success: true, data: result };
  }

  @Post('credits/adjust')
  async adjustCredits(
    @Body() body: { userId: number; amount: number; reason: string },
  ) {
    const result = await this.adminService.adjustCredits(body.userId, body.amount, body.reason);
    return { success: true, data: result };
  }

  @Post('users/:id/reset-password')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password?: string },
  ) {
    const result = await this.adminService.resetUserPassword(id, body.password);
    return { success: true, data: result };
  }

  @Get('users/:id/history')
  async getUserHistory(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.getUserHistory(id);
    return { success: true, data: result };
  }

  @Get('users/:id/pricelists')
  async getUserPriceLists(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.getUserPriceLists(id);
    return { success: true, data: result };
  }

  @Put('users/:id/discount')
  async updateUserDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { discount: number },
  ) {
    const result = await this.adminService.updateUserDiscount(id, body.discount);
    return { success: true, data: result };
  }

  @Get('analytics/top-converters')
  async getTopConverters(@Query('limit') limit?: string) {
    const result = await this.adminService.getTopConverters(parseInt(limit || '20', 10));
    return { success: true, data: result };
  }

  @Get('analytics/search-volume')
  async getSearchVolume(@Query('days') days?: string) {
    const result = await this.adminService.getSearchVolume(parseInt(days || '30', 10));
    return { success: true, data: result };
  }

  @Get('analytics/active-users')
  async getActiveUsers(@Query('limit') limit?: string) {
    const result = await this.adminService.getActiveUsers(parseInt(limit || '20', 10));
    return { success: true, data: result };
  }
}
