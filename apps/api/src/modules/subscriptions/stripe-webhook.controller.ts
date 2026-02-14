import { Controller, Post, Req, Headers, HttpCode, HttpStatus, Logger, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CreditsService } from './credits.service';
import Stripe from 'stripe';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private stripe: Stripe | null = null;

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    private creditsService: CreditsService,
  ) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    if (stripeKey && stripeKey !== 'sk_test_...') {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });
    }
  }

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured, ignoring webhook');
      return { received: true };
    }

    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured');
      return { received: true };
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      return { received: false, error: 'Invalid signature' };
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.subscriptionsService.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.subscriptionsService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.subscriptionsService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.type === 'credit_topup') {
            const userId = BigInt(session.metadata.userId);
            const credits = parseInt(session.metadata.credits);
            await this.creditsService.addCredits(userId, credits, 'PURCHASE', 'Credit top-up purchase');
          }
          break;
        }
        default:
          this.logger.log(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(`Error processing webhook ${event.type}: ${err}`);
    }

    return { received: true };
  }
}
