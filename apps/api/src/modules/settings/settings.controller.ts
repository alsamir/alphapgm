import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Public: anyone can read site settings (for rendering header, footer, etc.)
  @Public()
  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return { success: true, data: settings };
  }

  // Admin only: update site settings
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  async updateMany(@Body() body: Record<string, string>) {
    const result = await this.settingsService.updateMany(body);
    return { success: true, data: result };
  }
}
