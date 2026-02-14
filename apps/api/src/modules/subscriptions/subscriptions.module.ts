import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  controllers: [SubscriptionsController, CreditsController, StripeWebhookController],
  providers: [SubscriptionsService, CreditsService],
  exports: [SubscriptionsService, CreditsService],
})
export class SubscriptionsModule {}
