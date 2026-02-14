import { Controller, Get, Put, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: number) {
    const profile = await this.usersService.getProfile(BigInt(userId));
    return { success: true, data: profile };
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser('userId') userId: number,
    @Body() body: { name?: string; phone?: string },
  ) {
    const result = await this.usersService.updateProfile(BigInt(userId), body);
    return { success: true, data: result };
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser('userId') userId: number,
    @Body() body: { discount?: number; currencyId?: number; restDiscount?: boolean },
  ) {
    const result = await this.usersService.updateSettings(BigInt(userId), body);
    return { success: true, data: result };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.listUsers({ page, limit, search });
    return { success: true, data: result };
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roleId: number },
  ) {
    const result = await this.usersService.updateUserRole(BigInt(id), body.roleId);
    return { success: true, data: result };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ROLE_ADMIN')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { statusId: number },
  ) {
    const result = await this.usersService.updateUserStatus(BigInt(id), body.statusId);
    return { success: true, data: result };
  }
}
