import { Controller, Get, Post, Put, Delete, Body, Query, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
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

  // ===== Dashboard =====

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

  // ===== Credits =====

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

  // ===== User CRUD =====

  @Post('users')
  async createUser(
    @Body() body: {
      email: string;
      username: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      roleId?: number;
      statusId?: number;
    },
  ) {
    const result = await this.adminService.createUser(body);
    return { success: true, data: result };
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      email?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ) {
    const result = await this.adminService.updateUser(id, body);
    return { success: true, data: result };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.deleteUser(id);
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

  // ===== User Groups =====

  @Post('groups')
  async createGroup(@Body() body: { name: string; description?: string; color?: string }) {
    const result = await this.adminService.createGroup(body);
    return { success: true, data: result };
  }

  @Get('groups')
  async listGroups() {
    const result = await this.adminService.listGroups();
    return { success: true, data: result };
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; color?: string },
  ) {
    const result = await this.adminService.updateGroup(id, body);
    return { success: true, data: result };
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.deleteGroup(id);
    return { success: true, data: result };
  }

  @Post('groups/:id/members')
  async addGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userIds: number[] },
  ) {
    const result = await this.adminService.addGroupMembers(id, body.userIds);
    return { success: true, data: result };
  }

  @Delete('groups/:id/members')
  async removeGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userIds: number[] },
  ) {
    const result = await this.adminService.removeGroupMembers(id, body.userIds);
    return { success: true, data: result };
  }

  @Get('groups/:id/members')
  async getGroupMembers(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.getGroupMembers(id);
    return { success: true, data: result };
  }

  // ===== Messaging =====

  @Post('messages/send')
  async sendMessage(
    @Body() body: {
      subject: string;
      body: string;
      channel: string;
      targetType: string;
      targetId?: number;
      userIds?: number[];
    },
    @Req() req: any,
  ) {
    const senderId = Number(req.user.userId || req.user.sub);
    const result = await this.adminService.sendMessage(body, senderId);
    return { success: true, data: result };
  }

  @Get('messages')
  async listMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.listMessages(
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
    return { success: true, data: result };
  }

  @Get('messages/:id')
  async getMessageDetail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.adminService.getMessageDetail(id);
    return { success: true, data: result };
  }

  // ===== Analytics =====

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

  @Get('analytics/activity-by-country')
  async getActivityByCountry(@Query('days') days?: string) {
    const result = await this.adminService.getActivityByCountry(parseInt(days || '30', 10));
    return { success: true, data: result };
  }

  @Get('analytics/user-locations')
  async getUserLocations(@Query('limit') limit?: string) {
    const result = await this.adminService.getUserLocations(parseInt(limit || '50', 10));
    return { success: true, data: result };
  }

  @Get('ai-uploads')
  async getAiImageUploads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getAiImageUploads(
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
    return { success: true, data: result };
  }
}
