export const METALS = {
  PLATINUM: 'Platinum',
  PALLADIUM: 'Palladium',
  RHODIUM: 'Rhodium',
} as const;

export const METAL_SYMBOLS = {
  PLATINUM: 'Pt',
  PALLADIUM: 'Pd',
  RHODIUM: 'Rh',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

export const CREDITS = {
  PRICE_VIEW_COST: 1,
  AI_QUERY_COST: 1,
  FREE_SIGNUP_CREDITS: 20,
  FREE_DAILY_CREDITS: 3,
  FREE_AI_QUERIES: 3,
  TOPUP_AMOUNT: 50,
  TOPUP_PRICE_CENTS: 999,
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: { slug: 'free', name: 'Free', monthlyCredits: 0, priceCents: 0 },
  STARTER: { slug: 'starter', name: 'Starter', monthlyCredits: 150, priceCents: 1999 },
  PRO: { slug: 'pro', name: 'Pro', monthlyCredits: 500, priceCents: 3999 },
  BUSINESS: { slug: 'business', name: 'Business', monthlyCredits: -1, priceCents: 6999 },
} as const;
