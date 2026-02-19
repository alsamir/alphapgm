# Catalyser Platform - Project Phases & Documentation

## Quick Start

```bash
# Prerequisites: Node.js 20+, MySQL 8, Redis

# Install dependencies
cd /root/catapp && pnpm install

# Start API (port 3001)
cd apps/api && node dist/main.js

# Start Frontend (port 3002)
cd apps/web && npx next dev -p 3002

# Access: http://localhost:3002 or https://dev.alphapgm.com
# Admin: admin@catalyser.com / Admin123!
```

## Environment Variables

```env
# /root/catapp/.env (root)
DATABASE_URL="mysql://catalyser_app:CatApp2024Dev!@localhost:3306/catalyser_db"
JWT_SECRET="dev-jwt-secret-min-32-chars-change-in-prod-12345"
JWT_REFRESH_SECRET="dev-refresh-secret-min-32-chars-change-in-prod-67890"
REDIS_HOST="localhost"
REDIS_PORT=6379
STRIPE_SECRET_KEY="sk_test_..."
DO_SPACES_KEY="your-key"
DO_SPACES_SECRET="your-secret"
DO_SPACES_ENDPOINT="https://ams3.digitaloceanspaces.com"
DO_SPACES_BUCKET="catalyser-images"
DO_SPACES_CDN_URL="https://catalyser-images.ams3.cdn.digitaloceanspaces.com"
ANTHROPIC_API_KEY="sk-ant-..."
API_PORT=3001

# /root/catapp/apps/web/.env.local
NEXT_PUBLIC_API_URL=  # Empty = use Next.js rewrites
```

---

## Phase 1: Backend API (NestJS) - COMPLETE

### Architecture
- **Framework**: NestJS 10 with TypeScript
- **ORM**: Prisma 6 connected to MySQL 8
- **Cache**: Redis for rate limiting + data caching
- **Auth**: JWT access (15m) + refresh (7d) tokens
- **Payments**: Stripe Billing integration
- **AI**: Anthropic Claude API with tool use

### Modules
| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | login, register, refresh, logout, me | Complete |
| Converters | search, detail, CRUD, CSV import | Complete |
| Pricing | metal prices, recovery %, scheduled updates | Complete |
| Subscriptions | plans, checkout, webhooks, cancel | Complete |
| Credits | balance, ledger, topup, deduction | Complete |
| Images | serve watermarked, upload to S3 | Complete |
| AI | chat, history, tool-based queries | Complete |
| Users | profile, settings, admin list/role/status | Complete |
| Admin | dashboard stats, revenue analytics | Complete |

### Database Schema
- **all_data**: 19,800 converters (id, name, brand, weight, pt, pd, rh, imageUrl, keywords)
- **user**: User accounts with bcrypt passwords
- **role/user_roles**: RBAC (USER=1, MODERATOR=2, ADMIN=3)
- **plan/subscription**: 4 tiers (Free/Starter/Pro/Business)
- **credit_balance/credit_ledger**: Credit system with audit trail
- **price_metals/price_percentage**: Live metal pricing data
- **ai_chat**: AI conversation history (JSON messages)
- **setting_user**: Per-user settings (discount, currency)
- **lk_currency/lk_status**: Lookup tables

### Key API Endpoints
```
POST /api/v1/auth/login          → { tokens: { accessToken }, user }
POST /api/v1/auth/register       → { tokens: { accessToken }, user }
GET  /api/v1/converters          → paginated, sanitized (no metals)
GET  /api/v1/converters/:id      → full detail, costs 1 credit
GET  /api/v1/converters/brands   → brand list with counts
GET  /api/v1/pricing/metals      → current Pt/Pd/Rh prices
GET  /api/v1/credits/balance     → { available, lifetimeEarned, lifetimeSpent }
POST /api/v1/ai/chat             → AI response with tool use
GET  /api/v1/admin/dashboard     → KPI stats
```

---

## Phase 2: Frontend Public Pages (Next.js 15) - COMPLETE

### Tech Stack
- **Framework**: Next.js 15 App Router with TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **3D**: React Three Fiber + drei
- **Animations**: Framer Motion
- **i18n**: next-intl (8 languages)
- **State**: TanStack Query + React Context

### Pages (all under /app/[locale]/)
| Page | Route | Description |
|------|-------|-------------|
| Landing | / | 3D hero, metal ticker, search, brands, pricing, AI teaser |
| Catalogue | /catalogue | Search, filter, paginated grid/list view |
| Detail | /converter/[id] | Image + pricing (login-gated) |
| Login | /login | Email + password auth |
| Register | /register | Account creation |
| Dashboard | /dashboard | User profile, credits, subscription |
| Admin | /admin | Admin panel with tabs |
| About | /about | About page |
| Terms | /terms | Terms of service |
| Privacy | /privacy | Privacy policy |

### i18n Languages
en (English), ar (Arabic/RTL), fr (French), de (German), es (Spanish), it (Italian), nl (Dutch), tr (Turkish)

---

## Phase 3: Dashboard + Admin Panel - IN PROGRESS

### User Dashboard
- Overview tab: credit balance, plan info, account stats
- Profile tab: edit name, phone, currency, discount
- Subscription tab: current plan, upgrade options
- Credits tab: balance, buy more, transaction history
- Searches tab: recent converter lookups
- AI History tab: past AI conversations

### Admin Panel
- **Overview**: KPI cards + Recharts (line/bar/pie charts)
- **Converters**: Full CRUD table (add/edit/delete, CSV import/export)
- **Users**: List with inline role/status dropdowns
- **Pricing**: Metal price override, recovery % sliders, simulation tool

---

## Phase 4: Data Protection

### Rules
1. Public catalogue: NO metal content values (pt/pd/rh), only brand/name/weight
2. Detail view: metals shown ONLY for authenticated users (costs 1 credit)
3. Images: watermarked with user email via Sharp
4. Pagination: max 50/page, no total count exposed
5. Rate limiting: @nestjs/throttler with Redis (3/sec, 20/10sec)
6. Cloudflare: proxy on, WAF rules, Turnstile on auth pages

### Image URLs
- Stored in DB as relative paths: `1/image/9df78eab33525d08d6e5fb8d27136e95/1/2/122_10.jpg`
- Served via API: `/api/v1/images/:converterId` (applies watermark for auth users)
- Storage: DigitalOcean Spaces (ams3)

---

## Phase 5: Deployment (dev.alphapgm.com)

### Server
- Ubuntu 22.04 on DigitalOcean (207.154.202.151)
- Plesk control panel
- Cloudflare proxy (DNS: dev.alphapgm.com → 207.154.202.151)

### Nginx Config
- Location: /etc/nginx/sites-available/dev.alphapgm.com
- All traffic routes through Next.js (port 3002)
- Next.js rewrites proxy /api/v1/* to NestJS (port 3001)

### Services
- NestJS API: systemd service on port 3001
- Next.js: standalone build, port 3002
- MySQL: Plesk-managed
- Redis: installed via apt

---

## Subscription Tiers

| Tier | Price | Credits/Month | Access |
|------|-------|--------------|--------|
| Free | $0 | 20 signup + 3/day | Search + price ranges |
| Starter | $19.99/mo | 150 lookups | Exact prices, metal breakdown |
| Pro | $39.99/mo | 500 lookups | + price history, unlimited AI |
| Business | $69.99/mo | Unlimited (2000/day) | + API access, bulk export |
| Top-Up | $9.99 | 50 credits | Available on any tier |

---

## File Structure

```
catapp/
├── apps/
│   ├── api/                     # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # JWT auth, guards
│   │   │   │   ├── converters/  # Catalogue CRUD
│   │   │   │   ├── pricing/     # Metal prices, calculations
│   │   │   │   ├── subscriptions/ # Plans, credits, Stripe
│   │   │   │   ├── images/      # S3, watermarking
│   │   │   │   ├── ai/          # Claude API integration
│   │   │   │   ├── users/       # Profile, settings, admin
│   │   │   │   └── admin/       # Dashboard stats
│   │   │   ├── common/          # Guards, interceptors, filters
│   │   │   └── prisma/          # Prisma service
│   │   └── prisma/schema.prisma
│   └── web/                     # Next.js 15 frontend
│       ├── src/
│       │   ├── app/[locale]/    # All pages
│       │   ├── components/
│       │   │   ├── 3d/          # R3F scenes
│       │   │   ├── admin/       # Admin panel components
│       │   │   ├── ai/          # Chat widget
│       │   │   ├── catalogue/   # Catalogue components
│       │   │   ├── dashboard/   # User dashboard
│       │   │   ├── landing/     # Landing page sections
│       │   │   ├── layout/      # Header, footer, lang switcher
│       │   │   └── ui/          # shadcn/ui components
│       │   ├── i18n/            # Routing, request config
│       │   └── lib/             # API client, auth context, utils
│       └── messages/            # Translation files (8 languages)
├── packages/
│   ├── shared-types/
│   ├── shared-validators/
│   └── shared-utils/
├── .env                         # Environment variables
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Resume Instructions

If continuing work in a new session:
1. Read this file (PHASES.md) and /root/.claude/projects/-root-catapp/memory/
2. Check running services: `lsof -i:3001` (API), `lsof -i:3002` (Frontend)
3. Start services if needed (see Quick Start above)
4. Check /root/.claude/projects/-root-catapp/memory/tasks.md for current task status
5. The task list in Claude Code tracks granular progress

---

## Competitor Research Summary

Based on earlier analysis of catalog.alphapgm.com and competitor sites:
- Production has watermarked images on all converter photos
- Material content shown as icons/logos (Pt/Pd/Rh) not raw numbers in lists
- Login required to see any pricing data
- Credit-based access model is standard in the industry
- AI assistant is a key differentiator (no competitor offers this)
- Multi-currency support essential for European market
- Mobile responsiveness critical (many users in the field)
