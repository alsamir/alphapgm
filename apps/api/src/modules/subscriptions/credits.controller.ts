import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Credits')
@Controller('credits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  async getBalance(@CurrentUser('userId') userId: number) {
    const balance = await this.creditsService.getBalance(BigInt(userId));
    return { success: true, data: balance };
  }

  @Get('ledger')
  async getLedger(
    @CurrentUser('userId') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.creditsService.getLedger(BigInt(userId), page, limit);
    return { success: true, data: result };
  }

  @Post('topup')
  async createTopup(
    @CurrentUser('userId') userId: number,
    @Body() body: { quantity?: number },
  ) {
    const result = await this.creditsService.createTopupCheckout(BigInt(userId), body.quantity || 1);
    return { success: true, data: result };
  }
}
