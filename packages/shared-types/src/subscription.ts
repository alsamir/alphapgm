export enum PlanSlug {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  BUSINESS = 'business',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIALING = 'trialing',
}

export enum CreditType {
  GRANT = 'GRANT',
  PURCHASE = 'PURCHASE',
  CONSUMPTION = 'CONSUMPTION',
  BONUS = 'BONUS',
  EXPIRY = 'EXPIRY',
  MONTHLY_RESET = 'MONTHLY_RESET',
}

export interface Plan {
  id: number;
  slug: PlanSlug;
  name: string;
  monthlyCredits: number;
  priceCents: number;
  stripePriceId?: string;
  features: PlanFeatures;
  isActive: boolean;
}

export interface PlanFeatures {
  exactPrices: boolean;
  metalBreakdown: boolean;
  priceHistory: boolean;
  savedSearches: boolean;
  unlimitedAi: boolean;
  apiAccess: boolean;
  bulkExport: boolean;
  teamFeatures: boolean;
  dailyCap: number;
}

export interface Subscription {
  id: number;
  userId: number;
  planId: number;
  plan?: Plan;
  status: SubscriptionStatus;
  provider: string;
  providerSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export interface CreditBalance {
  userId: number;
  available: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: Date;
}

export interface CreditLedgerEntry {
  id: number;
  userId: number;
  amount: number;
  balanceAfter: number;
  type: CreditType;
  sourceDetail?: string;
  expiresAt?: Date;
  createdAt: Date;
}
