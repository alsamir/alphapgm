# Catalyser Platform -- Architecture Document

## Overview

Catalyser is a catalytic converter pricing platform serving 19,800+ converter parts across 99 brands with real-time Pt/Pd/Rh metal pricing, AI-powered pricing assistant, and a subscription-based credit system.

- **Monorepo**: Turborepo 2.3 + pnpm 9 workspaces
- **Backend**: NestJS 10 API with 8 modules
- **Frontend**: Next.js 15 with App Router
- **Database**: MySQL 8 via Prisma ORM
- **Deployment**: dev.alphapgm.com (Plesk, Ubuntu 22.04, Cloudflare)

## Complete File Tree

```
catapp/
├── apps/
│   ├── api/                                  # NestJS 10 backend API
│   │   ├── prisma/
│   │   │   └── schema.prisma                 # Database schema (14 models)
│   │   ├── src/
│   │   │   ├── main.ts                       # Bootstrap: CORS, ValidationPipe, Swagger, cookie-parser
│   │   │   ├── app.module.ts                 # Root module: imports all 8 modules + Throttler + Schedule
│   │   │   ├── health.controller.ts          # GET /health -- uptime + status
│   │   │   ├── config/
│   │   │   │   └── env.validation.ts         # Zod schema for all environment variables
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts          # Global Prisma module
│   │   │   │   └── prisma.service.ts         # PrismaClient wrapper with lifecycle hooks
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── credit-cost.decorator.ts   # @CreditCost(n) -- metadata for credit deduction
│   │   │   │   │   ├── current-user.decorator.ts  # @CurrentUser() -- extract user from request
│   │   │   │   │   ├── public.decorator.ts        # @Public() -- bypass JWT guard
│   │   │   │   │   └── roles.decorator.ts         # @Roles('ROLE_ADMIN') -- required roles metadata
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts   # Global exception filter (unified error format)
│   │   │   │   ├── guards/
│   │   │   │   │   └── roles.guard.ts             # RolesGuard -- checks user.roles vs required
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── credit.interceptor.ts      # CreditInterceptor -- deducts credits after success
│   │   │   │   └── redis/
│   │   │   │       ├── redis.module.ts            # Global Redis module
│   │   │   │       └── redis.service.ts           # ioredis wrapper (get/set/del/incr/expire)
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       │   ├── auth.module.ts             # PassportModule + JwtModule configuration
│   │   │       │   ├── auth.controller.ts         # register, login, refresh, logout, me
│   │   │       │   ├── auth.service.ts            # bcrypt hashing, JWT generation, user validation
│   │   │       │   ├── guards/
│   │   │       │   │   ├── jwt-auth.guard.ts      # JWT guard (respects @Public decorator)
│   │   │       │   │   └── jwt-refresh.guard.ts   # Refresh token guard (reads httpOnly cookie)
│   │   │       │   └── strategies/
│   │   │       │       ├── jwt.strategy.ts        # Access token strategy (Bearer header)
│   │   │       │       └── jwt-refresh.strategy.ts # Refresh strategy (cookie extractor)
│   │   │       ├── users/
│   │   │       │   ├── users.module.ts
│   │   │       │   ├── users.controller.ts        # profile, settings, list users, role/status mgmt
│   │   │       │   └── users.service.ts           # CRUD for users, settings, roles
│   │   │       ├── converters/
│   │   │       │   ├── converters.module.ts
│   │   │       │   ├── converters.controller.ts   # search, findOne, create, update, delete, importCsv
│   │   │       │   └── converters.service.ts      # Search with Redis caching, sanitized list views
│   │   │       ├── pricing/
│   │   │       │   ├── pricing.module.ts
│   │   │       │   ├── pricing.controller.ts      # metals, percentages CRUD
│   │   │       │   └── pricing.service.ts         # Metal price cache, scheduled fetch, calculatePrice
│   │   │       ├── subscriptions/
│   │   │       │   ├── subscriptions.module.ts    # Includes 3 controllers + 2 services
│   │   │       │   ├── subscriptions.controller.ts # plans, current, checkout, cancel
│   │   │       │   ├── subscriptions.service.ts   # Stripe checkout sessions, webhook handlers
│   │   │       │   ├── credits.controller.ts      # balance, ledger, topup
│   │   │       │   ├── credits.service.ts         # deductCredits, addCredits, getBalance, topup
│   │   │       │   └── stripe-webhook.controller.ts # POST /webhooks/stripe -- event routing
│   │   │       ├── images/
│   │   │       │   ├── images.module.ts
│   │   │       │   ├── images.controller.ts       # GET image (watermarked), POST upload
│   │   │       │   ├── images.service.ts          # S3 fetch/upload, Redis-cached watermarked images
│   │   │       │   └── watermark.service.ts       # Sharp SVG overlay (user email + CATALYSER)
│   │   │       ├── ai/
│   │   │       │   ├── ai.module.ts               # Imports ConvertersModule, PricingModule, SubscriptionsModule
│   │   │       │   ├── ai.controller.ts           # chat, history, getChat
│   │   │       │   └── ai.service.ts              # Claude API with tool use (search + price calc)
│   │   │       └── admin/
│   │   │           ├── admin.module.ts
│   │   │           ├── admin.controller.ts        # dashboard, revenue
│   │   │           └── admin.service.ts           # Aggregate stats (users, converters, MRR)
│   │   ├── package.json                           # NestJS 10 + Prisma 6 + Stripe 17 + Anthropic SDK
│   │   └── tsconfig.json
│   │
│   └── web/                                  # Next.js 15 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx                     # Root layout (Inter font, dark theme, ChatWidget)
│       │   │   ├── page.tsx                       # Landing page
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   └── register/page.tsx
│       │   │   ├── (public)/
│       │   │   │   ├── about/page.tsx
│       │   │   │   ├── contact/page.tsx
│       │   │   │   ├── privacy/page.tsx
│       │   │   │   └── terms/page.tsx
│       │   │   ├── catalogue/page.tsx             # Converter search + browse
│       │   │   ├── converter/[id]/page.tsx        # Converter detail (auth required)
│       │   │   ├── dashboard/page.tsx             # User dashboard
│       │   │   └── admin/page.tsx                 # Admin panel
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   │   ├── admin-dashboard.tsx         # Stats overview
│       │   │   │   ├── admin-converters.tsx        # Converter management
│       │   │   │   └── admin-users.tsx             # User management
│       │   │   ├── ai/
│       │   │   │   └── chat-widget.tsx             # Floating AI chat widget
│       │   │   ├── catalogue/
│       │   │   │   ├── brand-filter.tsx
│       │   │   │   ├── catalogue-content.tsx
│       │   │   │   ├── converter-card.tsx
│       │   │   │   └── converter-detail.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── credit-balance.tsx
│       │   │   │   ├── dashboard-content.tsx
│       │   │   │   ├── profile-settings.tsx
│       │   │   │   └── subscription-card.tsx
│       │   │   ├── landing/
│       │   │   │   ├── hero-section.tsx
│       │   │   │   ├── search-section.tsx
│       │   │   │   ├── features-section.tsx
│       │   │   │   ├── pricing-section.tsx
│       │   │   │   ├── ai-teaser.tsx
│       │   │   │   ├── brand-carousel.tsx
│       │   │   │   └── metal-prices-ticker.tsx
│       │   │   ├── layout/
│       │   │   │   ├── header.tsx
│       │   │   │   └── footer.tsx
│       │   │   └── ui/                            # shadcn/ui primitives
│       │   │       ├── badge.tsx
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── input.tsx
│       │   │       ├── separator.tsx
│       │   │       └── skeleton.tsx
│       │   └── lib/
│       │       ├── api.ts                         # ApiClient class -- all backend API calls
│       │       ├── auth-context.tsx                # AuthProvider (React Context + token refresh)
│       │       ├── providers.tsx                   # QueryClient + ThemeProvider + AuthProvider
│       │       └── utils.ts                       # cn() helper (clsx + tailwind-merge)
│       ├── next.config.ts                         # standalone output, API rewrites, DO Spaces images
│       └── package.json                           # Next 15 + React 19 + TanStack + Framer Motion
│
├── packages/
│   ├── shared-types/                         # TypeScript interfaces
│   │   └── src/
│   │       ├── index.ts                           # Re-exports all types
│   │       ├── api.ts                             # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │       ├── auth.ts                            # LoginRequest, RegisterRequest, JwtPayload, AuthResponse
│   │       ├── converter.ts                       # Converter, ConverterWithPrice, ConverterSearchParams, Brand
│   │       ├── pricing.ts                         # MetalPrice, MetalPrices, PricePercentage, PriceCalculation
│   │       ├── subscription.ts                    # Plan, PlanFeatures, Subscription, CreditBalance, CreditLedgerEntry
│   │       ├── user.ts                            # User, UserProfile, UserSettings, Currency, UserRole enum
│   │       └── ai.ts                              # AiChatMessage, AiChat, AiChatRequest, AiChatResponse
│   │
│   ├── shared-validators/                    # Zod validation schemas
│   │   └── src/
│   │       ├── index.ts
│   │       ├── auth.ts                            # loginSchema, registerSchema
│   │       ├── converter.ts                       # converterSearchSchema, converterCreateSchema
│   │       ├── pricing.ts                         # pricePercentageSchema
│   │       ├── subscription.ts                    # creditTopupSchema
│   │       ├── user.ts                            # updateProfileSchema, updateSettingsSchema
│   │       └── ai.ts                              # aiChatSchema
│   │
│   └── shared-utils/                         # Utility functions
│       └── src/
│           ├── index.ts
│           ├── constants.ts                       # METALS, CREDITS, PAGINATION, SUBSCRIPTION_TIERS
│           ├── price.ts                           # calculateConverterPrice(), parseDecimalString()
│           ├── currency.ts                        # formatCurrency(), getCurrencySymbol()
│           └── format.ts                          # slugify(), truncate(), formatNumber(), formatWeight()
│
├── deploy/
│   ├── setup-server.sh                       # One-time server provisioning script
│   ├── deploy.sh                             # Deployment script (pull, install, build, restart)
│   ├── ecosystem.config.js                   # PM2 config (2x API cluster, 2x Web cluster)
│   ├── .env.production                       # Production env template
│   └── nginx/
│       ├── dev.alphapgm.com.conf             # Full Nginx config with per-route rate limiting
│       └── proxy_params.inc                  # Shared proxy headers
│
├── db_dump/                                  # Legacy database SQL dump
├── package.json                              # Root: Turborepo scripts, engines (Node >=20, pnpm >=9)
├── pnpm-workspace.yaml                       # apps/* + packages/*
├── turbo.json                                # Task pipeline: build, dev, lint, test, db:*
├── tsconfig.json                             # Base TypeScript configuration
├── .env.example                              # Development environment template
└── .gitignore
```

## Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (short: 3/s, medium: 20/10s, long: 100/min)
├── ScheduleModule (cron jobs)
├── PrismaModule (global) ──> MySQL 8
├── RedisModule (global) ──> Redis (ioredis)
├── AuthModule
│   ├── PassportModule (JWT strategy)
│   ├── JwtModule (access: 15m, refresh: 7d)
│   ├── JwtStrategy ──> AuthService.validateUser()
│   └── JwtRefreshStrategy (cookie extractor)
├── UsersModule
│   └── UsersService ──> PrismaService
├── ConvertersModule
│   └── ConvertersService ──> PrismaService, RedisService
├── PricingModule
│   └── PricingService ──> PrismaService, RedisService, @Cron(EVERY_HOUR)
├── SubscriptionsModule
│   ├── SubscriptionsService ──> PrismaService, Stripe
│   ├── CreditsService ──> PrismaService, Stripe
│   └── StripeWebhookController ──> SubscriptionsService, CreditsService
├── ImagesModule
│   ├── ImagesService ──> S3Client (DO Spaces), PrismaService, RedisService, WatermarkService
│   └── WatermarkService ──> Sharp
├── AiModule
│   ├── imports: ConvertersModule, PricingModule, SubscriptionsModule
│   └── AiService ──> Anthropic SDK, ConvertersService, PricingService, CreditsService
└── AdminModule
    └── AdminService ──> PrismaService
```

## Data Flow

### Standard Request Pipeline

```
Client Request
  │
  ▼
Cloudflare WAF (bot blocking, GeoIP rules)
  │
  ▼
Nginx (rate limiting per zone: auth=3r/s, search=8r/s, pricing=5r/s, general=10r/s)
  │
  ▼
NestJS Global Pipes
  ├── cookie-parser (parses cookies for refresh token)
  ├── ValidationPipe (whitelist: true, forbidNonWhitelisted: true, transform: true)
  │
  ▼
Route Handler
  ├── @Public() ? ──> skip JWT guard
  ├── JwtAuthGuard ──> JwtStrategy.validate() ──> AuthService.validateUser()
  ├── RolesGuard ──> checks @Roles() metadata vs user.roles
  ├── CreditInterceptor ──> checks @CreditCost() metadata, verifies balance
  │
  ▼
Controller Method
  │
  ▼
Service Layer ──> PrismaService (MySQL) + RedisService (cache)
  │
  ▼
CreditInterceptor (tap) ──> deducts credits after successful response
  │
  ▼
GlobalExceptionFilter (catches errors, returns unified { success, statusCode, message })
  │
  ▼
Response: { success: true, data: ... }
```

### Authentication Flow

```
Registration:
  1. POST /auth/register { email, username, password }
  2. Check uniqueness (email, username)
  3. bcrypt.hash(password, 12)
  4. Transaction:
     a. Create user (statusId: 1 = Active)
     b. Assign ROLE_USER
     c. Create CreditBalance (20 free signup credits)
     d. Create CreditLedger entry (type: GRANT)
     e. Create SettingUser (USD default)
  5. Generate JWT access token (15m) + refresh token (7d)
  6. Set refreshToken as httpOnly cookie (path: /api/v1/auth/refresh)
  7. Return { user, tokens: { accessToken } }

Login:
  1. POST /auth/login { email, password }
  2. Find user by email (include roles, subscription.plan)
  3. bcrypt.compare(password, hash)
  4. Update lastAccess timestamp
  5. Generate tokens with payload: { sub, email, username, roles, planSlug }
  6. Set refreshToken cookie, return accessToken

Token Refresh:
  1. POST /auth/refresh (no body, reads cookie)
  2. JwtRefreshGuard extracts token from req.cookies.refreshToken
  3. JwtRefreshStrategy validates with JWT_REFRESH_SECRET
  4. AuthService.refreshTokens() generates new pair
  5. New refreshToken cookie set, new accessToken returned

JWT Payload:
  { sub: userId, email, username, roles: ["ROLE_USER"], planSlug: "free" }
```

### Credit System Flow

```
Credit Sources:
  - FREE_SIGNUP_CREDITS: 20 credits on registration
  - Subscription monthly grant: varies by plan (Starter=150, Pro=500, Business=unlimited)
  - Top-up purchase: 50 credits per pack at $9.99

Credit Costs:
  - PRICE_VIEW_COST: 1 credit (viewing converter detail via GET /converters/:id)
  - AI_QUERY_COST: 1 credit (each AI chat message via POST /ai/chat)

Deduction Paths:
  Path 1 -- CreditInterceptor (declarative via @CreditCost decorator):
    1. Interceptor reads @CreditCost(n) metadata
    2. Checks CreditBalance.available >= n
    3. If insufficient: throws ForbiddenException
    4. Request proceeds to controller
    5. On success (tap): transaction deducts credits + creates ledger entry

  Path 2 -- CreditsService.deductCredits() (imperative in AI service):
    1. AiService checks balance >= AI_QUERY_COST
    2. Calls Claude API
    3. On success: calls creditsService.deductCredits()
    4. Records in CreditLedger (type: CONSUMPTION)

Ledger Entry Types:
  - GRANT: Signup credits, monthly subscription renewal
  - PURCHASE: Top-up credit packs
  - CONSUMPTION: Price views, AI queries
  - BONUS: Promotional credits
  - EXPIRY: Expired monthly credits
```

## AI Assistant Architecture

### System Design

```
User sends message
  │
  ▼
AiController.chat(userId, message, chatId?)
  │
  ▼
AiService.chat()
  ├── 1. Check credit balance >= AI_QUERY_COST (1)
  ├── 2. Load previous messages if chatId provided
  ├── 3. Fetch current metal prices + recovery percentages
  ├── 4. Build system prompt with:
  │      - Converter count from database
  │      - Current Pt/Pd/Rh spot prices
  │      - Recovery percentages
  │      - Price formula documentation
  ├── 5. Call Anthropic API (model: claude-sonnet-4-5-20250929)
  │      - max_tokens: 1024
  │      - tools: [search_converters, get_converter_price]
  ├── 6. Handle tool use loop:
  │      - search_converters: queries ConvertersService.search() with full data
  │      - get_converter_price: fetches converter + PricingService.calculatePrice()
  │      - Loop continues until stop_reason != 'tool_use'
  ├── 7. Deduct 1 credit
  ├── 8. Save/update AiChat record with full message history
  └── 9. Return { chatId, message, creditsUsed, creditsRemaining }
```

### AI Tool Definitions

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_converters` | Search converter database | `query` (required), `brand` (optional), `limit` (optional, max 10) |
| `get_converter_price` | Calculate current price for a converter | `converterId` (required) |

### Price Calculation Formula

```
For each metal (Pt, Pd, Rh):
  metalValue = metalContent_g_per_kg * weight_kg * (spotPrice_per_troy_oz / 31.1035) * (recoveryPct / 100)

grossValue = ptValue + pdValue + rhValue
discountAmount = grossValue * (discount / 100)
finalPrice = grossValue - discountAmount
```

Implemented in: `packages/shared-utils/src/price.ts` -> `calculateConverterPrice()`

## Database Schema

### Existing Tables (from production)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `all_data` | 19,800+ converter parts | id, name, brand, weight, pt, pd, rh, image_url, prices |
| `user` | User accounts | user_id, email, username, password (bcrypt), status_id |
| `roles` | Role definitions | id, name (ROLE_ADMIN, ROLE_MODERATOR, ROLE_USER) |
| `user_roles` | User-role mapping | user_id, role_id (composite PK) |
| `setting_user` | User preferences | discount, rest_discount, currency_id |
| `lk_currency` | Currency lookup | currency_codes, symbol, desc_en |
| `lk_status` | Status lookup | desc_en (Active, Inactive) |
| `price_metals` | Metal spot prices | name, price, date, currency_id |
| `price_percentage` | Recovery percentages | pt, pd, rh (0-100) |

### New Tables (subscription/credits/AI system)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `plans` | Subscription tiers | slug (unique), name, monthly_credits, price_cents, stripe_price_id |
| `subscriptions` | Active subscriptions | user_id (unique), plan_id, status, provider_subscription_id |
| `credit_balance` | Current balance | user_id (PK), available, lifetime_earned, lifetime_spent |
| `credit_ledger` | Transaction history | user_id, amount, balance_after, type, source_detail |
| `ai_chats` | Chat history | user_id, messages (JSON), created_at, updated_at |

## Subscription Model

| Tier | Slug | Price/Month | Credits/Month | Key Features |
|------|------|-------------|---------------|--------------|
| Free | `free` | $0 | 20 (signup only) | Search + list views only |
| Starter | `starter` | $19.99 | 150 | Exact prices, metal breakdown |
| Pro | `pro` | $39.99 | 500 | + price history, unlimited AI |
| Business | `business` | $69.99 | Unlimited | + API access, bulk export, team features |
| Top-Up | N/A | $9.99 | 50 (no expiry) | One-time purchase |

## Anti-Scraping System (10 Layers)

1. **Login wall** -- All pricing data (pt, pd, rh, prices, imageUrl) excluded from list views; requires authentication for detail views
2. **Credit system** -- Each price view costs 1 credit; prevents unlimited bulk access
3. **NestJS Throttler** -- 3-tier rate limiting: 3 req/s, 20 req/10s, 100 req/min
4. **Pagination capping** -- Max 50 items per page; no total count exposed (uses `hasMore` flag)
5. **Image watermarking** -- Sharp SVG overlay with user email; cached in Redis for 1 hour
6. **Nginx rate limiting** -- Per-zone: auth=3r/s, search=8r/s, pricing=5r/s, general=10r/s
7. **Cloudflare Turnstile** -- Anti-bot verification on login/register (optional field in DTOs)
8. **Cloudflare WAF** -- Managed rulesets, bot fight mode, GeoIP rules
9. **Terms of Service** -- Legal anti-scraping clauses
10. **DMCA registration** -- Enables takedown notices against scraped data

## Frontend Architecture

### Provider Stack (wraps all pages)

```
QueryClientProvider (TanStack React Query, staleTime: 5min)
  └── ThemeProvider (next-themes, default: dark)
      └── AuthProvider (React Context: user, token, login, logout, refreshAuth)
          └── {children}
          └── <ChatWidget /> (floating AI assistant)
```

### Route Groups

| Group | Routes | Auth Required |
|-------|--------|---------------|
| `(auth)` | `/login`, `/register` | No |
| `(public)` | `/about`, `/contact`, `/privacy`, `/terms` | No |
| Root | `/` (landing), `/catalogue` | No |
| Protected | `/converter/[id]`, `/dashboard` | Yes |
| Admin | `/admin` | Yes (ROLE_ADMIN) |

### Key Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15.1 | App Router, SSR/SSG, API rewrites |
| react | ^19.0 | UI rendering |
| @tanstack/react-query | ^5.60 | Server state management |
| @tanstack/react-table | ^8.20 | Data tables with server-side pagination |
| framer-motion | ^11.12 | Animations |
| recharts | ^2.14 | Charts (metal price ticker, analytics) |
| react-hook-form + zod | ^7.53 + ^3.23 | Form validation using shared validators |
| next-themes | ^0.4.3 | Dark/light theme toggle |
| lucide-react | ^0.460 | Icons |
| tailwindcss | ^4.0 | Utility-first CSS |
| @radix-ui/* | Various | Accessible UI primitives (shadcn/ui base) |

### Next.js Configuration (next.config.ts)

- `output: 'standalone'` -- Self-contained production build
- `transpilePackages` -- Compiles @catapp/shared-* workspace packages
- `images.remotePatterns` -- Allows DigitalOcean Spaces image domains
- `rewrites` -- Proxies `/api/v1/*` to the NestJS API backend

## External Services

| Service | Usage | SDK/Integration |
|---------|-------|-----------------|
| **MySQL 8** | Primary database | Prisma Client 6.2 |
| **Redis** | Cache (brands, metal prices, watermarked images) | ioredis 5.4 |
| **Stripe** | Subscription billing + one-time credit purchases | stripe 17.0 (API 2024-12-18) |
| **DigitalOcean Spaces** | Image storage (S3-compatible) | @aws-sdk/client-s3 3.700 |
| **Anthropic Claude** | AI pricing assistant (claude-sonnet-4-5-20250929) | @anthropic-ai/sdk 0.39 |
| **Cloudflare** | CDN, WAF, DNS proxy, Turnstile | DNS + WAF dashboard config |

## Cache Strategy

| Key Pattern | TTL | Data |
|-------------|-----|------|
| `converter:brands` | 1 hour | Brand list with counts |
| `pricing:metals` | 5 minutes | Current Pt/Pd/Rh spot prices |
| `img:{converterId}:{emailHash}` | 1 hour | Watermarked image (base64) |

Cache is non-critical: RedisService silently fails on errors and continues without cache.
