# Security Policy and Data Protection

## Overview

This document describes every security measure implemented in the Catalyser platform, traced to the actual source code. The platform protects pricing data (its primary asset), user accounts, and payment information through multiple overlapping defense layers.

## Authentication Mechanism

### Password Security

**Source:** `apps/api/src/modules/auth/auth.service.ts`

- Passwords hashed with **bcrypt, 12 salt rounds** (`bcrypt.hash(data.password, 12)`)
- Registration password requirements (enforced by Zod in `packages/shared-validators/src/auth.ts`):
  - Minimum 8 characters
  - At least 1 uppercase letter (`/[A-Z]/`)
  - At least 1 lowercase letter (`/[a-z]/`)
  - At least 1 number (`/[0-9]/`)
- Login password minimum is 6 characters (for compatibility with legacy accounts)
- No password hints or security questions stored
- Passwords stored as bcrypt hashes in the `user.password` column (VARCHAR 255)

### JWT Token Architecture

**Source:** `apps/api/src/modules/auth/auth.module.ts`, `auth.service.ts`, `strategies/`

**Access Token:**
- Signed with `JWT_SECRET` (env var, minimum 32 chars enforced by `config/env.validation.ts`)
- Expiry: 15 minutes (configurable via `JWT_EXPIRATION`, default `"15m"`)
- Extracted from `Authorization: Bearer <token>` header
- Strategy: `JwtStrategy` (`strategies/jwt.strategy.ts`)
- Stored in memory on the frontend (React state via `auth-context.tsx`), never in localStorage

**Refresh Token:**
- Signed with `JWT_REFRESH_SECRET` (separate secret, minimum 32 chars)
- Expiry: 7 days (configurable via `JWT_REFRESH_EXPIRATION`, default `"7d"`)
- Delivered as **httpOnly cookie** with these flags:
  - `httpOnly: true` (inaccessible to JavaScript)
  - `secure: true` (in production; HTTPS only)
  - `sameSite: 'strict'` (prevents CSRF)
  - `path: '/api/v1/auth/refresh'` (only sent to the refresh endpoint)
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days)
- Strategy: `JwtRefreshStrategy` (`strategies/jwt-refresh.strategy.ts`) with custom cookie extractor

**JWT Payload Contents:**
```json
{
  "sub": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "roles": ["ROLE_USER"],
  "planSlug": "free"
}
```

No sensitive data (passwords, credit card info, etc.) is included in the payload.

### Token Lifecycle

**Source:** `apps/api/src/modules/auth/auth.controller.ts`

1. **Login/Register** -- Both tokens generated; refresh token set as httpOnly cookie; only access token returned in JSON body
2. **Refresh** -- JwtRefreshGuard validates cookie; new token pair generated; new cookie set
3. **Logout** -- Cookie cleared with `res.clearCookie('refreshToken', ...)` matching the exact cookie options

## Authorization (Role-Based Access Control)

### Role System

**Source:** `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/roles.decorator.ts`

Three roles defined in the `roles` table:

| Role | Purpose |
|------|---------|
| `ROLE_ADMIN` | Full access: manage users, converters, plans, view analytics |
| `ROLE_MODERATOR` | Manage converters (create, update), but not users or plans |
| `ROLE_USER` | Standard user: search, view prices (with credits), use AI |

**RolesGuard Implementation:**

```typescript
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (!requiredRoles) return true;
  const { user } = context.switchToHttp().getRequest();
  if (!user?.roles) return false;
  return requiredRoles.some((role) => user.roles.includes(role));
}
```

The guard checks if the authenticated user has ANY of the required roles (OR logic).

### Endpoint Authorization Map

| Endpoint | Required Roles |
|----------|---------------|
| `POST /converters` | ROLE_ADMIN, ROLE_MODERATOR |
| `PUT /converters/:id` | ROLE_ADMIN, ROLE_MODERATOR |
| `DELETE /converters/:id` | ROLE_ADMIN |
| `POST /converters/import` | ROLE_ADMIN |
| `GET /pricing/percentage` | ROLE_ADMIN |
| `PUT /pricing/percentage` | ROLE_ADMIN |
| `PUT /pricing/metals/:id` | ROLE_ADMIN |
| `GET /users` (list all) | ROLE_ADMIN |
| `PUT /users/:id/role` | ROLE_ADMIN |
| `PUT /users/:id/status` | ROLE_ADMIN |
| `GET /admin/dashboard` | ROLE_ADMIN |
| `GET /admin/revenue` | ROLE_ADMIN |

### Public Endpoints (No Auth Required)

**Source:** `apps/api/src/common/decorators/public.decorator.ts`, `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

The `@Public()` decorator sets `IS_PUBLIC_KEY` metadata. `JwtAuthGuard.canActivate()` checks this and bypasses JWT validation when true.

Public endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /converters` (list view, no pricing data)
- `GET /converters/brands`
- `GET /pricing/metals`
- `GET /subscriptions/plans`
- `GET /health`
- `POST /webhooks/stripe`

## Rate Limiting (3 Layers)

### Layer 1: Cloudflare WAF

External layer, configured via Cloudflare dashboard:
- Managed rulesets (OWASP, Cloudflare Managed)
- Bot Fight Mode
- GeoIP-based rules
- Challenge pages for suspicious traffic

### Layer 2: Nginx Rate Limiting

**Source:** `deploy/nginx/dev.alphapgm.com.conf`

Four rate limiting zones defined:

```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=3r/s;
limit_req_zone $binary_remote_addr zone=api_pricing:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_search:10m rate=8r/s;
```

| Zone | Rate | Burst | Applied To |
|------|------|-------|------------|
| `api_auth` | 3 req/s | 5 | `/api/v1/auth/` |
| `api_pricing` | 5 req/s | 10 | `/api/v1/pricing/` |
| `api_search` | 8 req/s | 15 | `/api/v1/converters` |
| `api_general` | 10 req/s | 20 | `/api/` (all other API routes) |

Connection limiting: `limit_conn conn_limit 20` (max 20 concurrent connections per IP).

Exceptions: Health check (`/api/v1/health`) and Stripe webhooks (`/api/v1/webhooks/stripe`) have no rate limiting.

### Layer 3: NestJS @nestjs/throttler

**Source:** `apps/api/src/app.module.ts`

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 3 },
  { name: 'medium', ttl: 10000, limit: 20 },
  { name: 'long', ttl: 60000, limit: 100 },
])
```

| Tier | Window | Limit |
|------|--------|-------|
| Short | 1 second | 3 requests |
| Medium | 10 seconds | 20 requests |
| Long | 1 minute | 100 requests |

Applied at the application level (all endpoints).

## Anti-Scraping Layers (10 Layers)

### Layer 1: Login Wall

**Source:** `apps/api/src/modules/converters/converters.service.ts` (`sanitizeConverter()`)

The public converter list endpoint (`GET /converters`) strips all pricing data:

```typescript
private sanitizeConverter(converter: any) {
  return {
    id: converter.id,
    name: converter.name,
    nameModified: converter.nameModified,
    urlPath: converter.urlPath,
    brand: converter.brand,
    weight: converter.weight,
    brandImage: converter.brandImage,
    createdDate: converter.createdDate,
    // pt, pd, rh, prices, imageUrl are NOT exposed in list views
  };
}
```

Full pricing data (pt, pd, rh, prices, imageUrl) is only available via `GET /converters/:id` which requires authentication.

### Layer 2: Credit System

**Source:** `apps/api/src/common/interceptors/credit.interceptor.ts`, `apps/api/src/common/decorators/credit-cost.decorator.ts`

Every price detail view costs 1 credit (`@CreditCost(1)` on `GET /converters/:id`). The CreditInterceptor:
1. Checks balance BEFORE the request proceeds
2. Throws `ForbiddenException` if insufficient credits
3. Deducts credits AFTER successful response (in `tap()`)

This means even a legitimate user with a free account (20 credits) can only view 20 converter details before needing to purchase more.

### Layer 3: Application-Level Rate Limiting

NestJS ThrottlerModule: 3/s, 20/10s, 100/min (see above).

### Layer 4: Pagination Capping

**Source:** `apps/api/src/modules/converters/converters.service.ts`

```typescript
const limit = Math.min(params.limit || 20, 50); // Max 50
```

- Maximum 50 items per page
- No total count exposed; uses `hasMore` boolean instead
- Fetches `limit + 1` records to determine `hasMore`, preventing total count estimation

### Layer 5: Image Watermarking

**Source:** `apps/api/src/modules/images/watermark.service.ts`

Every converter image is watermarked with:
- User's email address (appears 2 times)
- "CATALYSER" brand text
- Semi-transparent (30% opacity) white text
- Rotated -30 degrees
- Sized proportionally to image width

Watermarked images cached in Redis for 1 hour per user+converter combination.

### Layer 6: Nginx Rate Limiting

Per-route rate limiting at the reverse proxy level (see Layer 2 of Rate Limiting above).

### Layer 7: Cloudflare Turnstile

**Source:** `packages/shared-types/src/auth.ts` (`turnstileToken?: string`), `config/env.validation.ts`

Optional Turnstile token field on login and registration forms. Server-side verification via `TURNSTILE_SECRET_KEY`.

### Layer 8: Cloudflare WAF

Edge-level bot blocking, challenge pages, and managed rulesets.

### Layer 9: Terms of Service

Legal prohibition against scraping, automated access, and data harvesting.

### Layer 10: DMCA Registration

Enables takedown notices against anyone who scrapes and republishes the pricing data.

## Data Protection Measures

### Input Validation (Dual Layer)

**Layer 1 -- Zod Schemas (shared):**

**Source:** `packages/shared-validators/src/`

Zod schemas are shared between frontend and backend for consistent validation:
- `registerSchema`: email format, username regex, password complexity
- `converterSearchSchema`: page/limit bounds, enum sort fields
- `aiChatSchema`: message length 1-2000
- `pricePercentageSchema`: 0-100 range
- `creditTopupSchema`: quantity 1-10

**Layer 2 -- NestJS ValidationPipe:**

**Source:** `apps/api/src/main.ts`

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // Strip unknown properties
    forbidNonWhitelisted: true, // Reject requests with unknown properties
    transform: true,            // Auto-transform types
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### SQL Injection Prevention

All database queries go through **Prisma ORM** which uses parameterized queries exclusively. No raw SQL is used anywhere in the codebase.

### XSS Prevention

- React 19 automatically escapes all rendered content
- Next.js server components prevent client-side injection
- Input validation strips unexpected data via `whitelist: true`

### CORS Configuration

**Source:** `apps/api/src/main.ts`

```typescript
app.enableCors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

- Single origin (the frontend URL), no wildcards in production
- `credentials: true` required for httpOnly cookie transmission
- Explicit method and header whitelists

### Security Headers (Nginx)

**Source:** `deploy/nginx/dev.alphapgm.com.conf`

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Additional protections:
- `client_max_body_size 10M` (prevents oversized upload attacks)
- `client_body_timeout 30s` / `client_header_timeout 30s` (prevents slow-loris)
- Hidden file blocking: `location ~ /\.(git|env|htaccess|htpasswd) { deny all; }`

### Image Protection

**Source:** `apps/api/src/modules/images/images.service.ts`

- Images are never served directly from DigitalOcean Spaces
- All images proxied through the API (requires authentication)
- Per-user watermark applied before delivery
- Watermarked versions cached in Redis (1 hour TTL)
- Response headers: `Cache-Control: private, max-age=3600`

### Cloudflare Real IP Restoration

**Source:** `deploy/nginx/dev.alphapgm.com.conf`

All Cloudflare IP ranges are configured with `set_real_ip_from` and `real_ip_header CF-Connecting-IP` so that Nginx rate limiting operates on the actual client IP, not Cloudflare's proxy IP.

### Database Security

- Database credentials stored in `.env` files (git-ignored)
- `DATABASE_URL` validated by Zod schema at startup (`config/env.validation.ts`)
- MySQL accessible only from localhost
- Prisma Client configured with minimal logging in production: `log: ['error']`
- Sensitive fields (password) never included in API responses

### Environment Variable Protection

**Source:** `apps/api/src/config/env.validation.ts`

Required environment variables validated at startup:
- `DATABASE_URL`: non-empty string
- `JWT_SECRET`: minimum 32 characters
- `JWT_REFRESH_SECRET`: minimum 32 characters
- Optional services (Stripe, DO Spaces, Anthropic, Turnstile) have graceful fallbacks when unconfigured

`.env` files are git-ignored. `.env.example` and `deploy/.env.production` contain only placeholder values.

### Error Handling

**Source:** `apps/api/src/common/filters/http-exception.filter.ts`

The `GlobalExceptionFilter` ensures:
- Internal errors never leak stack traces to the client
- Unhandled exceptions return `"An unexpected error occurred"` (generic message)
- HTTP exceptions return their proper status codes and messages
- All errors include `timestamp` for correlation
- All errors follow the unified format: `{ success, statusCode, message, error, timestamp }`

## Credit System as Anti-Abuse

The credit system serves as both a monetization mechanism and an anti-abuse layer:

| Credit Constant | Value | Source |
|-----------------|-------|--------|
| `FREE_SIGNUP_CREDITS` | 20 | `packages/shared-utils/src/constants.ts` |
| `PRICE_VIEW_COST` | 1 | Applied via `@CreditCost(1)` on `GET /converters/:id` |
| `AI_QUERY_COST` | 1 | Deducted in `AiService.chat()` |
| `TOPUP_AMOUNT` | 50 per pack | |
| `TOPUP_PRICE_CENTS` | 999 ($9.99) | |

Abuse scenarios prevented:
- **Free tier scraping**: Limited to 20 price views ever (signup credits only, no monthly renewal)
- **Paid tier scraping**: Starter = 150/month, Pro = 500/month; cost to scrape 19,800 converters at Starter: ~$2,640/month
- **AI abuse**: Each query costs 1 credit; checked before API call

## Stripe Webhook Security

**Source:** `apps/api/src/modules/subscriptions/stripe-webhook.controller.ts`

```typescript
event = this.stripe.webhooks.constructEvent(
  req.rawBody!,
  signature,
  webhookSecret,
);
```

- Raw request body used for signature verification
- `stripe-signature` header validated against `STRIPE_WEBHOOK_SECRET`
- Invalid signatures are rejected (logged as error)
- Nginx bypasses rate limiting for the webhook path

## PCI-DSS Compliance

- No credit card data touches our servers
- All payment processing handled by Stripe Checkout (hosted payment page)
- Stripe session metadata used to correlate payments with users
- Only `userId` and `planId`/`credits` passed as metadata

## Security Checklist (Pre-Deployment)

- [ ] `JWT_SECRET` is unique, cryptographically random, minimum 32 characters
- [ ] `JWT_REFRESH_SECRET` is different from `JWT_SECRET`, minimum 32 characters
- [ ] Database credentials rotated from development values
- [ ] `REDIS_PASSWORD` set in production
- [ ] Cloudflare proxy enabled (orange cloud on DNS)
- [ ] Cloudflare SSL mode set to Full (Strict)
- [ ] Cloudflare WAF managed rules enabled
- [ ] Cloudflare Bot Fight Mode enabled
- [ ] Turnstile site key and secret key configured for production domain
- [ ] `STRIPE_WEBHOOK_SECRET` configured for production endpoint
- [ ] `STRIPE_SECRET_KEY` uses production key (not test key)
- [ ] DO Spaces credentials set
- [ ] Nginx rate limiting configuration installed (`deploy/nginx/dev.alphapgm.com.conf`)
- [ ] Hidden files blocked in Nginx (`.git`, `.env`, etc.)
- [ ] Admin accounts use strong passwords
- [ ] `NODE_ENV` set to `"production"`
- [ ] Database backup schedule verified
- [ ] Log rotation configured (via `deploy/setup-server.sh`)
