# Team Workflow and Development Standards

## Development Workflow

### Branch Strategy

```
main (production)
  └── feature/MODULE-description    (feature branches)
  └── fix/MODULE-description        (bug fixes)
  └── chore/description             (tooling, deps, docs)
```

### Workflow: Branch to Deploy

1. **Create branch** from `main`:
   ```bash
   git checkout main && git pull
   git checkout -b feature/converters-bulk-export
   ```

2. **Develop** with local dev server:
   ```bash
   pnpm dev          # Starts both API (3001) and Web (3000) via Turborepo
   ```

3. **Test locally**:
   ```bash
   pnpm test         # Unit tests (Jest) across all packages
   pnpm test:e2e     # Playwright E2E tests (requires built app)
   pnpm lint         # ESLint across all packages
   ```

4. **Commit** with clear messages:
   ```
   feat(converters): add bulk CSV export for admin
   fix(auth): handle expired refresh token edge case
   chore(deps): update @prisma/client to 6.3
   ```

5. **Push and create PR**:
   ```bash
   git push -u origin feature/converters-bulk-export
   # Create PR via GitHub UI or CLI
   ```

6. **Code review** -- At least 1 approval required before merge.

7. **Merge to main** -- Squash merge preferred for clean history.

8. **Deploy** -- SSH to server and run:
   ```bash
   bash deploy/deploy.sh
   ```

### Monorepo Development Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `pnpm dev` | All | Start API + Web in watch mode (Turborepo) |
| `pnpm build` | All | Build packages first, then apps (Turborepo pipeline) |
| `pnpm lint` | All | Run ESLint across all workspaces |
| `pnpm test` | All | Run Jest unit tests across all workspaces |
| `pnpm test:e2e` | Web | Run Playwright E2E tests |
| `pnpm clean` | All | Remove dist/ and .next/ build artifacts |
| `pnpm format` | All | Run Prettier on all .ts, .tsx, .js, .json, .md files |
| `pnpm db:push` | API | Push Prisma schema to database |
| `pnpm db:migrate` | API | Create and run Prisma migrations |
| `pnpm db:studio` | API | Open Prisma Studio (database browser) |

Turborepo pipeline order (`turbo.json`):
1. Build shared packages (`packages/*`) first (`dependsOn: ["^build"]`)
2. Then build apps (`apps/*`)
3. Lint and test depend on packages being built
4. E2E tests depend on full build

## Testing Strategy

### Unit Tests (Jest)

**Configuration:** `apps/api/package.json` (jest section)

- **Framework**: Jest 29 + ts-jest
- **Location**: `*.spec.ts` files alongside source
- **Root directory**: `apps/api/src`
- **Coverage**: Collected from all `.ts` and `.js` files
- **Module aliases**: `@/` maps to `<rootDir>/`

**What to test:**

| Layer | What | How |
|-------|------|-----|
| Services | Business logic, edge cases | Mock PrismaService, RedisService |
| Guards | Role checking, public bypass | Mock Reflector, ExecutionContext |
| Interceptors | Credit deduction logic | Mock PrismaService, Reflector |
| Utils | Price calculation, formatting | Direct function calls |
| Validators | Zod schema validation | Test valid + invalid inputs |

**Running tests:**

```bash
# All unit tests
pnpm test

# Watch mode (API only)
pnpm --filter api test:watch

# With coverage
cd apps/api && npx jest --coverage
```

### E2E Tests (Playwright)

**Configuration:** `apps/web/package.json` (`test:e2e` script)

- **Framework**: Playwright 1.49
- **Target**: Built Next.js app (`pnpm build` required first)

**Critical user flows to cover:**

1. **Registration flow**: Register -> receive 20 credits -> redirect to dashboard
2. **Login flow**: Login -> token in memory -> refresh token in cookie
3. **Catalogue browsing**: Search converters -> filter by brand -> paginate
4. **Price viewing**: Click converter detail -> credit deducted -> full data shown
5. **Subscription flow**: View plans -> checkout (Stripe test mode) -> credits granted
6. **AI chat**: Open widget -> send message -> receive response -> credit deducted
7. **Admin operations**: Login as admin -> view dashboard -> manage converters
8. **Profile management**: Update name -> update settings -> view credit ledger

**Running E2E tests:**

```bash
# Build first, then test
pnpm build
pnpm test:e2e

# Or directly
cd apps/web && npx playwright test
```

## Code Standards

### TypeScript Configuration

**Root:** `tsconfig.json` (base configuration)
**API:** `apps/api/tsconfig.json` (NestJS-specific)
**Web:** `apps/web/tsconfig.json` (Next.js-specific)

Key settings:
- `strict: true` (strict mode enabled)
- All shared packages transpiled via `transpilePackages` in Next.js config

### Linting

- **ESLint 9** for both API and Web
- **eslint-config-next** for frontend
- Run via `pnpm lint` (Turborepo)

### Formatting

- **Prettier 3.4** configured at the root level
- Run via `pnpm format`
- Covers: `**/*.{ts,tsx,js,jsx,json,md}`

### Code Conventions

**NestJS API conventions:**
- One module per feature domain (auth, users, converters, pricing, subscriptions, images, ai, admin)
- Each module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`
- Controllers handle HTTP concerns only (decorators, param extraction, response wrapping)
- Services contain all business logic
- Global modules (Prisma, Redis) use `@Global()` decorator
- Custom decorators in `common/decorators/`
- Guards in `common/guards/` (except auth-specific guards in `modules/auth/guards/`)
- Interceptors in `common/interceptors/`
- All responses wrapped in `{ success: true, data: ... }`
- All errors handled by `GlobalExceptionFilter` with `{ success: false, statusCode, message }`

**Next.js frontend conventions:**
- App Router with route groups: `(auth)`, `(public)`
- Components organized by feature: `admin/`, `ai/`, `catalogue/`, `dashboard/`, `landing/`, `layout/`, `ui/`
- `ui/` contains shadcn/ui primitives only
- Client state via React Context (`AuthProvider`)
- Server state via TanStack React Query (5 minute stale time)
- All API calls go through `lib/api.ts` (`ApiClient` class)
- Forms use react-hook-form + @hookform/resolvers + shared Zod validators

**Shared packages conventions:**
- `shared-types`: TypeScript interfaces and enums only (no runtime code)
- `shared-validators`: Zod schemas + inferred types
- `shared-utils`: Pure functions (price calculation, formatting, constants)
- All packages export via barrel files (`src/index.ts`)
- Consumed as `@catapp/shared-types`, `@catapp/shared-validators`, `@catapp/shared-utils`

### Environment Variable Management

- Development: `.env` at project root (git-ignored)
- Template: `.env.example` at project root (committed)
- Production template: `deploy/.env.production` (committed, placeholder values only)
- Validation: `apps/api/src/config/env.validation.ts` (Zod schema)
- Never commit real secrets

## QA Checklist by Module

### Auth Module

- [ ] Registration creates user with ROLE_USER
- [ ] Registration grants 20 free signup credits
- [ ] Registration creates CreditLedger entry (type: GRANT)
- [ ] Registration creates default SettingUser (USD, discount: 0)
- [ ] Duplicate email returns 409
- [ ] Duplicate username returns 409
- [ ] Password must meet complexity requirements (8+ chars, upper, lower, number)
- [ ] Login returns access token in body, refresh token in httpOnly cookie
- [ ] Login updates lastAccess timestamp
- [ ] Invalid credentials return 401 (same message for wrong email vs wrong password)
- [ ] Token refresh generates new token pair
- [ ] Refresh token cookie has correct flags (httpOnly, secure, sameSite, path)
- [ ] Logout clears refresh token cookie
- [ ] GET /auth/me returns user data from JWT validation
- [ ] Expired access token returns 401
- [ ] Expired refresh token returns 401

### Converters Module

- [ ] Public search returns sanitized data (no pt, pd, rh, prices, imageUrl)
- [ ] Search supports: query, brand, page, limit, sortBy, sortOrder
- [ ] Limit capped at 50 (server-side enforcement)
- [ ] No total count in response (only hasMore)
- [ ] GET /converters/:id requires authentication
- [ ] GET /converters/:id costs 1 credit (deducted after success)
- [ ] GET /converters/:id returns full data including pt, pd, rh
- [ ] Insufficient credits returns 403
- [ ] Brands list cached in Redis for 1 hour
- [ ] Create/update/delete invalidate brands cache
- [ ] Create requires ROLE_ADMIN or ROLE_MODERATOR
- [ ] Delete requires ROLE_ADMIN only
- [ ] CSV import requires ROLE_ADMIN
- [ ] CSV import reports imported count and error count

### Pricing Module

- [ ] Metal prices cached in Redis for 5 minutes
- [ ] Scheduled cache invalidation runs every hour (@Cron)
- [ ] Recovery percentages require ROLE_ADMIN to view or update
- [ ] Metal price update invalidates Redis cache
- [ ] Price calculation uses shared `calculateConverterPrice()` function
- [ ] Troy ounce conversion correct (1 troy oz = 31.1035 grams)

### Subscriptions Module

- [ ] Plans list returns only active plans sorted by price
- [ ] Checkout creates Stripe session with correct metadata (userId, planId)
- [ ] Checkout success redirects to /dashboard?subscription=success
- [ ] Checkout cancel redirects to /pricing?subscription=canceled
- [ ] Webhook: customer.subscription.created upserts subscription + grants monthly credits
- [ ] Webhook: customer.subscription.updated updates status, period, cancel flag
- [ ] Webhook: customer.subscription.deleted sets status to "canceled"
- [ ] Webhook: checkout.session.completed (credit_topup) adds credits
- [ ] Webhook signature verification works (rejects invalid signatures)
- [ ] Cancel subscription sets cancel_at_period_end (does not immediately cancel)
- [ ] Stripe not configured: throws error (not silent failure)

### Credits Module

- [ ] Balance returns 0 defaults if no CreditBalance record exists
- [ ] Ledger returns entries in descending order (newest first)
- [ ] Ledger pagination works correctly (hasMore flag)
- [ ] Top-up creates Stripe payment session (not subscription)
- [ ] Top-up amount: 50 credits per pack at $9.99
- [ ] Top-up quantity validation: 1-10
- [ ] Credit deduction is transactional (balance + ledger updated atomically)
- [ ] Negative balance impossible (ForbiddenException before deduction)

### Images Module

- [ ] Requires authentication to view images
- [ ] Images fetched from DigitalOcean Spaces (S3-compatible)
- [ ] Watermark applied with user's email address
- [ ] Watermarked images cached in Redis for 1 hour
- [ ] Cache key includes converter ID + email hash
- [ ] Upload requires ROLE_ADMIN
- [ ] Upload stores to Spaces with public-read ACL
- [ ] Response Content-Type: image/jpeg
- [ ] Response Cache-Control: private, max-age=3600

### AI Module

- [ ] Requires authentication
- [ ] Costs 1 credit per message (deducted after successful response)
- [ ] Credit check before Claude API call
- [ ] Insufficient credits returns 403
- [ ] System prompt includes current metal prices and recovery percentages
- [ ] Tool use: search_converters searches database (max 10 results)
- [ ] Tool use: get_converter_price calculates real-time price
- [ ] Tool use loop handles multiple rounds
- [ ] Chat history persisted in ai_chats table (JSON messages)
- [ ] Existing chatId continues conversation
- [ ] New chat (no chatId) creates new record
- [ ] History returns max 20 chats per user
- [ ] Chat access scoped to owning user (userId filter)
- [ ] AI not configured: returns helpful error message (no credit deducted)

### Admin Module

- [ ] All endpoints require ROLE_ADMIN
- [ ] Dashboard stats include: totalUsers, totalConverters, activeSubscriptions, totalCreditsSpent, recentSignups, searchesToday
- [ ] Revenue stats include MRR calculation (sum of active plan prices / 100)
- [ ] Revenue stats include count by plan name

## Roles and Permissions Matrix

| Action | ROLE_ADMIN | ROLE_MODERATOR | ROLE_USER | Public |
|--------|:----------:|:--------------:|:---------:|:------:|
| View metal prices | Yes | Yes | Yes | Yes |
| Search converters (list) | Yes | Yes | Yes | Yes |
| View brands | Yes | Yes | Yes | Yes |
| View subscription plans | Yes | Yes | Yes | Yes |
| View converter detail | Yes | Yes | Yes* | No |
| Use AI assistant | Yes | Yes | Yes* | No |
| View own profile | Yes | Yes | Yes | No |
| Update own profile | Yes | Yes | Yes | No |
| View credit balance | Yes | Yes | Yes | No |
| Purchase credits/subscription | Yes | Yes | Yes | No |
| Create/update converters | Yes | Yes | No | No |
| Delete converters | Yes | No | No | No |
| Import converters (CSV) | Yes | No | No | No |
| Upload images | Yes | No | No | No |
| Manage pricing percentages | Yes | No | No | No |
| Update metal prices | Yes | No | No | No |
| List all users | Yes | No | No | No |
| Update user roles | Yes | No | No | No |
| Update user status | Yes | No | No | No |
| View admin dashboard | Yes | No | No | No |
| View revenue analytics | Yes | No | No | No |

*Requires credits

## Bug Severity Levels

| Level | Definition | Examples | Response Time |
|-------|------------|---------|---------------|
| Critical | Production down, data loss, security breach | API crash, database corruption, auth bypass | Immediate |
| High | Core feature broken, no workaround | Payments failing, login broken, credit deduction wrong | Same day |
| Medium | Feature broken with workaround | Search filter not working, pagination off by one | Next sprint |
| Low | Cosmetic or minor UX issue | Alignment issues, typos, non-critical animations | Backlog |
