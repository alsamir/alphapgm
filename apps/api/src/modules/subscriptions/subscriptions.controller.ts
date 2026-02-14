import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return { success: true, data: plans };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrentSubscription(@CurrentUser('userId') userId: number) {
    const sub = await this.subscriptionsService.getUserSubscription(BigInt(userId));
    return { success: true, data: sub };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createCheckout(
    @CurrentUser('userId') userId: number,
    @Body() body: { planSlug: string },
  ) {
    const result = await this.subscriptionsService.createCheckoutSession(BigInt(userId), body.planSlug);
    return { success: true, data: result };
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser('userId') userId: number) {
    const result = await this.subscriptionsService.cancelSubscription(BigInt(userId));
    return { success: true, data: result };
  }
}
