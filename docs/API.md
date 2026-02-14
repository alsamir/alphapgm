# API Documentation

## Base URL

- Development: `http://localhost:3001/api/v1`
- Production: `https://dev.alphapgm.com/api/v1`
- Swagger UI: `http://localhost:3001/api/docs` (development only)

## Authentication

Authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh endpoint to obtain a new one.

## Standard Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid credentials",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

Note: Total count is intentionally not exposed (anti-scraping measure). Use `hasMore` to determine if more pages exist.

---

## Health Check

### GET /health

Check API health status. No authentication required.

| Field | Value |
|-------|-------|
| Auth | None |
| Rate Limit | None |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400.5
}
```

---

## Auth Module

### POST /auth/register

Register a new user account. Creates user, assigns ROLE_USER, grants 20 free signup credits, creates default settings (USD currency).

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Nginx: 3r/s (auth zone) |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass1",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email |
| username | string | Yes | 3-30 chars, alphanumeric + hyphens + underscores |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| name | string | No | 1-100 chars |
| phone | string | No | Max 20 chars |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "name": "John Doe",
      "roles": ["ROLE_USER"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

Sets `refreshToken` as httpOnly cookie (path: `/api/v1/auth/refresh`, maxAge: 7 days, SameSite: Strict).

**Errors:**

| Status | Message |
|--------|---------|
| 409 | "Email already registered" |
| 409 | "Username already taken" |
| 400 | Validation errors (from body) |

### POST /auth/login

Authenticate with email and password.

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Nginx: 3r/s (auth zone) |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email |
| password | string | Yes | Min 6 chars |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "name": "John Doe",
      "roles": ["ROLE_USER"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

Sets `refreshToken` httpOnly cookie. Updates user's `lastAccess` timestamp.

**Errors:**

| Status | Message |
|--------|---------|
| 401 | "Invalid credentials" |

### POST /auth/refresh

Refresh the access token using the refresh token cookie.

| Field | Value |
|-------|-------|
| Auth | Refresh token cookie (JwtRefreshGuard) |
| Rate Limit | Nginx: 3r/s (auth zone) |
| Credit Cost | 0 |

**Request:** No body required. The `refreshToken` cookie is read automatically.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

Sets a new `refreshToken` cookie.

**Errors:**

| Status | Message |
|--------|---------|
| 401 | "Unauthorized" (missing/expired refresh token) |

### POST /auth/logout

Logout the current user by clearing the refresh token cookie.

| Field | Value |
|-------|-------|
| Auth | Bearer token (JwtAuthGuard) |
| Rate Limit | Nginx: 3r/s (auth zone) |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current authenticated user information from the JWT payload.

| Field | Value |
|-------|-------|
| Auth | Bearer token (JwtAuthGuard) |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "roles": ["ROLE_USER"],
    "planSlug": "free"
  }
}
```

---

## Converters Module

### GET /converters

Search and list converters with pagination. Public endpoint. List view excludes pricing data (pt, pd, rh, prices, imageUrl) as an anti-scraping measure.

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Nginx: 8r/s (search zone) |
| Credit Cost | 0 |

**Query Parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| query | string | - | Max 200 chars. Searches name, keywords, nameModified |
| brand | string | - | Max 200 chars. Exact brand match |
| page | number | 1 | Min 1 |
| limit | number | 20 | Min 1, max 50 |
| sortBy | string | "name" | "name" or "brand" |
| sortOrder | string | "asc" | "asc" or "desc" |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "0004201412",
        "nameModified": "0004201412",
        "urlPath": "0004201412.html",
        "brand": "CHRYSLER",
        "weight": "1.250",
        "brandImage": "chrysler.png",
        "createdDate": "2024-01-01T00:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### GET /converters/brands

List all brands with converter counts. Results cached in Redis for 1 hour.

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Nginx: 8r/s (search zone) |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": [
    { "name": "BMW", "count": 245 },
    { "name": "CHRYSLER", "count": 189 }
  ]
}
```

### GET /converters/:id

Get full converter detail including metal content (pt, pd, rh). Requires authentication and costs 1 credit.

| Field | Value |
|-------|-------|
| Auth | Bearer token (JwtAuthGuard) |
| Rate Limit | Nginx: 8r/s (search zone) |
| Credit Cost | 1 |

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | number | Converter ID |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "0004201412",
    "nameModified": "0004201412",
    "urlPath": "0004201412.html",
    "brand": "CHRYSLER",
    "weight": "1.250",
    "pt": "0.8500",
    "pd": "3.2100",
    "rh": "0.1200",
    "keywords": "chrysler 0004201412",
    "imageUrl": "/converters/chrysler-0004201412.jpg",
    "prices": "125.50",
    "brandImage": "chrysler.png",
    "createdDate": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| 401 | "Unauthorized" |
| 403 | "Insufficient credits" |
| 404 | "Converter with ID {id} not found" |

### POST /converters

Create a new converter. Admin or Moderator only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN or ROLE_MODERATOR |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "name": "NEW-CONVERTER-001",
  "brand": "BMW",
  "weight": "1.500",
  "pt": "0.9000",
  "pd": "2.800",
  "rh": "0.150",
  "keywords": "bmw new converter",
  "imageUrl": "/converters/bmw-new.jpg"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | 1-500 chars |
| brand | string | Yes | 1-200 chars |
| nameModified | string | No | Max 500 chars (defaults to name) |
| urlPath | string | No | Max 500 chars (auto-generated from name) |
| weight | string | No | Max 50 chars (defaults to "0") |
| pt | string | No | Max 50 chars (defaults to "0") |
| pd | string | No | Max 50 chars (defaults to "0") |
| rh | string | No | Max 50 chars (defaults to "0") |
| keywords | string | No | Max 1000 chars (defaults to lowercase name) |
| imageUrl | string | No | Max 500 chars |
| brandImage | string | No | Max 255 chars |

**Response (201):** Returns the created converter object.

### PUT /converters/:id

Update an existing converter. Admin or Moderator only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN or ROLE_MODERATOR |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:** Same fields as POST, all optional (partial update).

**Response (200):** Returns the updated converter object.

### DELETE /converters/:id

Delete a converter. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "message": "Converter deleted"
}
```

### POST /converters/import

Bulk import converters from CSV data. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "records": [
    {
      "name": "CONVERTER-001",
      "brand": "BMW",
      "weight": "1.5",
      "pt": "0.85",
      "pd": "3.21",
      "rh": "0.12",
      "keywords": "bmw converter",
      "image_url": "/images/conv1.jpg",
      "brand_image": "bmw.png"
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "imported": 95,
    "errors": 5,
    "total": 100
  }
}
```

---

## Pricing Module

### GET /pricing/metals

Get current spot prices for Platinum, Palladium, and Rhodium. Public endpoint. Results cached in Redis for 5 minutes.

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Nginx: 5r/s (pricing zone) |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "platinum": {
      "id": 1,
      "name": "Platinum",
      "price": 1050.00,
      "currency": "USD",
      "date": "2025-01-15T10:00:00.000Z"
    },
    "palladium": {
      "id": 2,
      "name": "Palladium",
      "price": 980.00,
      "currency": "USD",
      "date": "2025-01-15T10:00:00.000Z"
    },
    "rhodium": {
      "id": 3,
      "name": "Rhodium",
      "price": 4800.00,
      "currency": "USD",
      "date": "2025-01-15T10:00:00.000Z"
    },
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### GET /pricing/percentage

Get recovery percentage settings. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Nginx: 5r/s (pricing zone) |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pt": 85.5,
    "pd": 90.0,
    "rh": 70.0
  }
}
```

### PUT /pricing/percentage

Update recovery percentages. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Nginx: 5r/s (pricing zone) |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "pt": 85.5,
  "pd": 90.0,
  "rh": 70.0
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| pt | number | Yes | 0-100 |
| pd | number | Yes | 0-100 |
| rh | number | Yes | 0-100 |

### PUT /pricing/metals/:id

Update a metal's spot price. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Nginx: 5r/s (pricing zone) |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "price": 1055.50
}
```

**Response (200):** Returns the updated PriceMetals record. Invalidates the `pricing:metals` Redis cache.

---

## Subscriptions Module

### GET /subscriptions/plans

List all active subscription plans. Public endpoint.

| Field | Value |
|-------|-------|
| Auth | None (public) |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "free",
      "name": "Free",
      "monthlyCredits": 0,
      "priceCents": 0,
      "features": { "exactPrices": false },
      "isActive": true
    },
    {
      "id": 2,
      "slug": "starter",
      "name": "Starter",
      "monthlyCredits": 150,
      "priceCents": 1999,
      "stripePriceId": "price_...",
      "features": { "exactPrices": true, "metalBreakdown": true },
      "isActive": true
    }
  ]
}
```

### GET /subscriptions/current

Get the current user's subscription.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "planId": 2,
    "status": "active",
    "provider": "stripe",
    "providerSubscriptionId": "sub_...",
    "currentPeriodStart": "2025-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "plan": { "name": "Starter", "slug": "starter", "monthlyCredits": 150 }
  }
}
```

Returns `null` in data if no subscription exists.

### POST /subscriptions/checkout

Create a Stripe Checkout session for subscribing to a plan.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "planSlug": "starter"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_..."
  }
}
```

Redirect the user to the returned URL. Success redirects to `/dashboard?subscription=success`, cancel redirects to `/pricing?subscription=canceled`.

**Errors:**

| Status | Message |
|--------|---------|
| 404 | "Plan not found or not configured for billing" |
| 500 | "Stripe is not configured" |

### DELETE /subscriptions/cancel

Cancel the current subscription at the end of the billing period.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Subscription will be canceled at end of billing period"
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| 404 | "No active subscription found" |

---

## Credits Module

### GET /credits/balance

Get the current user's credit balance.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": 1,
    "available": 145,
    "lifetimeEarned": 170,
    "lifetimeSpent": 25
  }
}
```

### GET /credits/ledger

Get paginated credit transaction history.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Query Parameters:**

| Param | Type | Default |
|-------|------|---------|
| page | number | 1 |
| limit | number | 20 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 10,
        "userId": 1,
        "amount": -1,
        "balanceAfter": 145,
        "type": "CONSUMPTION",
        "sourceDetail": "AI chat query",
        "createdAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "id": 1,
        "userId": 1,
        "amount": 20,
        "balanceAfter": 20,
        "type": "GRANT",
        "sourceDetail": "Free signup credits",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

Ledger entry types: `GRANT`, `PURCHASE`, `CONSUMPTION`, `BONUS`, `EXPIRY`, `MONTHLY_RESET`.

### POST /credits/topup

Create a Stripe Checkout session for purchasing credit top-ups (50 credits per pack at $9.99).

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "quantity": 1
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| quantity | number | No | 1-10 (default: 1). Each unit = 50 credits |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_..."
  }
}
```

---

## Webhooks

### POST /webhooks/stripe

Stripe webhook endpoint. Processes subscription and payment events. Public endpoint (authenticated via Stripe signature).

| Field | Value |
|-------|-------|
| Auth | Stripe signature (stripe-signature header) |
| Rate Limit | None (Nginx bypass) |
| Credit Cost | 0 |

**Handled Events:**

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Creates/updates subscription record, grants monthly credits |
| `customer.subscription.updated` | Updates subscription status, period dates, cancel flag |
| `customer.subscription.deleted` | Sets subscription status to "canceled" |
| `checkout.session.completed` | If metadata.type="credit_topup": adds purchased credits to balance |

**Response (200):**

```json
{
  "received": true
}
```

---

## Images Module

### GET /images/:converterId

Get a converter's image with user-specific watermark overlay. Images are fetched from DigitalOcean Spaces, watermarked with the user's email via Sharp, and cached in Redis for 1 hour.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response:** Binary image data (`Content-Type: image/jpeg`, `Cache-Control: private, max-age=3600`).

**Errors:**

| Status | Message |
|--------|---------|
| 404 | "Image not found" / "Image not available" |

### POST /images/upload

Upload a converter image to DigitalOcean Spaces. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request:** Multipart form data with `file` field.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "https://catalyser-images.ams3.cdn.digitaloceanspaces.com/converters/1705312345-image.jpg"
  }
}
```

---

## AI Module

### POST /ai/chat

Send a message to the AI pricing assistant. The AI has access to the converter database and current metal prices via tool use. Costs 1 credit per message.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 1 (deducted after successful response) |

**Request Body:**

```json
{
  "message": "What's the price of BMW converter 1740060?",
  "chatId": 5
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| message | string | Yes | 1-2000 chars |
| chatId | number | No | Positive integer. Omit to start new conversation |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "chatId": 5,
    "message": "Based on current metal prices, the BMW converter 1740060 is estimated at...",
    "creditsUsed": 1,
    "creditsRemaining": 144
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| 403 | "Insufficient credits for AI query" |

### GET /ai/history

Get the current user's chat history (most recent 20 chats).

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "userId": 1,
      "messages": [...],
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /ai/chat/:chatId

Get a specific chat conversation.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "userId": 1,
    "messages": [
      { "role": "user", "content": "What's the price of BMW converter 1740060?" },
      { "role": "assistant", "content": "Based on current metal prices..." }
    ],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Users Module

### GET /users/profile

Get the current user's full profile including settings, subscription, and credit balance.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "phone": "+1234567890",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "roles": ["ROLE_USER"],
    "settings": {
      "discount": 0,
      "restDiscount": false,
      "currency": { "currencyId": 1, "currencyCodes": "USD", "symbol": "$" }
    },
    "subscription": {
      "plan": { "name": "Starter", "slug": "starter" },
      "status": "active",
      "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    },
    "credits": {
      "available": 145,
      "lifetimeEarned": 170,
      "lifetimeSpent": 25
    }
  }
}
```

### PUT /users/profile

Update current user's profile.

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "name": "John Smith",
  "phone": "+0987654321"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | No | 1-100 chars |
| phone | string | No | Max 20 chars |

### PUT /users/settings

Update current user's settings (discount, currency, rest discount).

| Field | Value |
|-------|-------|
| Auth | Bearer token |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "discount": 5,
  "currencyId": 2,
  "restDiscount": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| discount | number | No | 0-100 |
| currencyId | number | No | Positive integer |
| restDiscount | boolean | No | |

### GET /users

List all users. Admin only. Paginated.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Query Parameters:**

| Param | Type | Default |
|-------|------|---------|
| page | number | 1 |
| limit | number | 20 (max 50) |
| search | string | - (searches email, username, name) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "email": "user@example.com",
        "username": "johndoe",
        "name": "John Doe",
        "status": "Active",
        "roles": ["ROLE_USER"],
        "plan": "Starter",
        "credits": 145,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "lastAccess": "2025-01-15T10:30:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### PUT /users/:id/role

Update a user's role. Admin only. Replaces all existing roles with the specified role.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "roleId": 2
}
```

### PUT /users/:id/status

Update a user's status (active/inactive). Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Request Body:**

```json
{
  "statusId": 1
}
```

---

## Admin Module

### GET /admin/dashboard

Get platform-wide dashboard statistics. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalConverters": 19847,
    "activeSubscriptions": 89,
    "totalCreditsSpent": 45200,
    "recentSignups": 34,
    "searchesToday": 156
  }
}
```

| Field | Description |
|-------|-------------|
| totalUsers | Total registered users |
| totalConverters | Total entries in all_data table |
| activeSubscriptions | Subscriptions with status "active" |
| totalCreditsSpent | Absolute sum of negative credit ledger entries |
| recentSignups | Users created in last 30 days |
| searchesToday | Credit consumption entries in last 24 hours |

### GET /admin/revenue

Get revenue analytics. Admin only.

| Field | Value |
|-------|-------|
| Auth | Bearer token + ROLE_ADMIN |
| Rate Limit | Standard |
| Credit Cost | 0 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "mrr": 1559.50,
    "activeSubscriptions": 89,
    "byPlan": {
      "Starter": 45,
      "Pro": 32,
      "Business": 12
    }
  }
}
```

---

## Common Error Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 400 | Bad Request | Validation failure (invalid body, query params) |
| 401 | Unauthorized | Missing token, expired token, invalid credentials |
| 403 | Forbidden | Insufficient role permissions, insufficient credits |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate email or username on registration |
| 429 | Too Many Requests | Rate limit exceeded (Throttler, Nginx, or Cloudflare) |
| 500 | Internal Server Error | Unexpected server error |
