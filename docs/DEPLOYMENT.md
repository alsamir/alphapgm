# Deployment Guide

## Overview

The Catalyser platform is deployed to **dev.alphapgm.com** on an Ubuntu 22.04 server managed by Plesk, with Cloudflare providing DNS, CDN, WAF, and SSL termination. The deployment infrastructure is codified in the `deploy/` directory.

## Deploy Directory Reference

```
deploy/
├── setup-server.sh          # One-time server provisioning (run as root)
├── deploy.sh                # Deployment script (pull, install, build, restart)
├── ecosystem.config.js      # PM2 process configuration (API + Web clusters)
├── .env.production           # Production environment variable template
└── nginx/
    ├── dev.alphapgm.com.conf # Full Nginx site config with rate limiting
    └── proxy_params.inc      # Shared proxy headers include
```

## Prerequisites

- Ubuntu 22.04 server with Plesk
- Node.js 20+
- pnpm 9+
- PM2 (process manager)
- MySQL 8 / MariaDB 10.6+
- Redis 7+
- Nginx (managed by Plesk)
- Cloudflare account with domain configured

## Initial Server Setup

Run the setup script **once** on a fresh server:

```bash
sudo bash deploy/setup-server.sh
```

**Reference:** `deploy/setup-server.sh`

This script performs the following steps:

1. **System updates** -- `apt update && apt upgrade -y`
2. **Node.js 20** -- Installs via NodeSource if not present or below v20
3. **pnpm 9** -- `npm install -g pnpm@9`
4. **PM2** -- `npm install -g pm2`
5. **Redis** -- Installs, enables, and starts `redis-server`
6. **Directories** -- Creates `/var/www/dev.alphapgm.com` and `/var/log/catapp`
7. **Nginx configuration** -- Copies `deploy/nginx/*.conf` to `/etc/nginx/` and reloads
8. **Firewall** -- Opens ports 80, 443, 22 if UFW is active
9. **PM2 startup** -- Configures PM2 to start on boot via systemd
10. **Log rotation** -- Creates `/etc/logrotate.d/catapp` for daily rotation of `/var/log/catapp/*.log` (14 days retention, compressed)

After the script completes, follow the displayed next steps:
1. Clone the repo to `/var/www/dev.alphapgm.com`
2. Copy `.env.example` to `.env` and configure
3. Run `bash deploy/deploy.sh`

## Environment Configuration

### Production Environment Template

**Reference:** `deploy/.env.production`

Copy the template and fill in actual values:

```bash
cp deploy/.env.production /var/www/dev.alphapgm.com/.env
```

**Required variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://catalyser_user:PASSWORD@localhost:3306/catalyser_db` |
| `JWT_SECRET` | Access token signing key (min 32 chars) | Generate with `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Refresh token signing key (min 32 chars) | Generate with `openssl rand -base64 48` |
| `JWT_EXPIRATION` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifetime | `7d` |
| `REDIS_HOST` | Redis server address | `127.0.0.1` |
| `REDIS_PORT` | Redis server port | `6379` |
| `API_PORT` | NestJS API port | `3001` |
| `API_URL` | Backend URL | `https://dev.alphapgm.com/api/v1` |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL | `https://dev.alphapgm.com` |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `https://dev.alphapgm.com` |
| `NODE_ENV` | Environment | `production` |

**Optional variables (services degrade gracefully when missing):**

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...`) |
| `DO_SPACES_KEY` | DigitalOcean Spaces access key |
| `DO_SPACES_SECRET` | DigitalOcean Spaces secret key |
| `DO_SPACES_ENDPOINT` | Spaces endpoint URL (`https://ams3.digitaloceanspaces.com`) |
| `DO_SPACES_BUCKET` | Spaces bucket name (`catalyser-images`) |
| `DO_SPACES_CDN_URL` | Spaces CDN URL |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI (`sk-ant-...`) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `REDIS_PASSWORD` | Redis password (empty for default local setup) |

## Database Setup

### Import Existing Data

```bash
mysql -u root -p catalyser_db < db_dump/catalyser_db.sql
```

### Push Prisma Schema

This creates the new tables (plans, subscriptions, credit_balance, credit_ledger, ai_chats) without dropping existing data:

```bash
cd /var/www/dev.alphapgm.com/apps/api
npx prisma generate
npx prisma db push --accept-data-loss=false
```

## Deployment Process

### Standard Deployment

**Reference:** `deploy/deploy.sh`

```bash
cd /var/www/dev.alphapgm.com
bash deploy/deploy.sh
```

The deploy script performs these steps:

1. **Pull latest code** -- `git fetch origin && git pull origin main`
2. **Install dependencies** -- `pnpm install --frozen-lockfile`
3. **Generate Prisma client** -- `npx prisma generate`
4. **Push database schema** -- `npx prisma db push --accept-data-loss=false`
5. **Build all packages** -- `pnpm build` (Turborepo builds packages first, then apps)
6. **Restart PM2 processes** -- `pm2 reload deploy/ecosystem.config.js` (or `pm2 start` on first deploy)
7. **Save PM2 state** -- `pm2 save`
8. **Health checks** -- Verifies API (port 3001) and Web (port 3000) respond with HTTP 200

**Flags:**

| Flag | Effect |
|------|--------|
| `--skip-install` | Skip `pnpm install` (use when only code changed, no new deps) |
| `--skip-build` | Skip `pnpm build` (use when only restarting services) |

**Branch override:**

```bash
DEPLOY_BRANCH=staging bash deploy/deploy.sh
```

### PM2 Process Configuration

**Reference:** `deploy/ecosystem.config.js`

Two PM2 applications are configured:

| Process | Port | Instances | Mode | Max Memory |
|---------|------|-----------|------|------------|
| `catalyser-api` | 3001 | 2 | cluster | 512M |
| `catalyser-web` | 3000 | 2 | cluster | 512M |

Both processes share these settings:
- `min_uptime: '10s'` -- Minimum uptime before considering stable
- `max_restarts: 10` -- Maximum restart attempts
- `restart_delay: 5000` -- 5 second delay between restarts
- `kill_timeout: 5000` -- 5 seconds for graceful shutdown
- `listen_timeout: 10000` -- 10 seconds for startup
- Log files in `/var/log/catapp/` (api-error.log, api-out.log, web-error.log, web-out.log)
- Watch mode disabled in production

**Common PM2 Commands:**

```bash
# View all processes
pm2 list

# View logs
pm2 logs catalyser-api
pm2 logs catalyser-web

# Restart a specific process
pm2 restart catalyser-api

# Reload with zero downtime
pm2 reload deploy/ecosystem.config.js

# Monitor resources
pm2 monit

# View process details
pm2 show catalyser-api
```

## Nginx Configuration

### Site Configuration

**Reference:** `deploy/nginx/dev.alphapgm.com.conf`

The Nginx configuration provides:

**Upstream definitions:**
- `catapp_api` -- `127.0.0.1:3001` (NestJS API)
- `catapp_web` -- `127.0.0.1:3000` (Next.js frontend)

**Rate limiting zones (4 zones):**

| Zone | Rate | Burst | Applied To |
|------|------|-------|------------|
| `api_auth` | 3 req/s | 5 | `/api/v1/auth/` |
| `api_pricing` | 5 req/s | 10 | `/api/v1/pricing/` |
| `api_search` | 8 req/s | 15 | `/api/v1/converters` |
| `api_general` | 10 req/s | 20 | `/api/` (catch-all) |

**Special routes (no rate limiting):**
- `/api/v1/health` -- Health check (also disables access logging)
- `/api/v1/webhooks/stripe` -- Stripe webhook endpoint

**Static asset caching:**
- `/_next/static/` -- `Cache-Control: public, max-age=31536000, immutable` (365 days)
- `/favicon.ico` -- 30 day cache

**Security:**
- Connection limit: 20 per IP
- Request size: 10M max
- Timeouts: 30s body/header
- Blocked paths: `.git`, `.env`, `.htaccess`, `.htpasswd`, all hidden files
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- Gzip compression enabled

**Cloudflare real IP restoration:**
All Cloudflare IP ranges configured via `set_real_ip_from` with `real_ip_header CF-Connecting-IP`.

### Proxy Parameters

**Reference:** `deploy/nginx/proxy_params.inc`

Shared proxy settings included by all `location` blocks:
- HTTP/1.1 with WebSocket upgrade support
- Forwarded headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
- Timeouts: connect=10s, send=30s, read=30s

### Installing Nginx Config

The setup script handles this automatically, but for manual installation:

```bash
sudo cp deploy/nginx/proxy_params.inc /etc/nginx/conf.d/proxy_params.inc
sudo cp deploy/nginx/dev.alphapgm.com.conf /etc/nginx/sites-available/dev.alphapgm.com.conf
sudo ln -sf /etc/nginx/sites-available/dev.alphapgm.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Cloudflare DNS and WAF Setup

### DNS Configuration

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `dev.alphapgm.com` | `207.154.202.151` | Proxied (orange cloud) |

The orange cloud (proxy) must be enabled for Cloudflare's CDN, WAF, and SSL termination to work.

### SSL/TLS Settings

| Setting | Value |
|---------|-------|
| SSL Mode | Full (Strict) |
| Always Use HTTPS | On |
| Minimum TLS Version | 1.2 |
| TLS 1.3 | On |
| Automatic HTTPS Rewrites | On |

### WAF (Web Application Firewall)

| Setting | Value |
|---------|-------|
| Security Level | Medium |
| Bot Fight Mode | On |
| Managed Rules | Cloudflare Managed Ruleset (enabled) |
| OWASP Rules | Enabled (paranoia level 1) |

### Performance Settings

| Setting | Value |
|---------|-------|
| Auto Minify | HTML, CSS, JS |
| Brotli | On |
| Cache Level | Standard |
| Browser Cache TTL | Respect Existing Headers |

### Cloudflare Turnstile

1. Go to Cloudflare Dashboard > Turnstile
2. Create a new widget for `dev.alphapgm.com`
3. Copy the site key to `TURNSTILE_SITE_KEY` in `.env`
4. Copy the secret key to `TURNSTILE_SECRET_KEY` in `.env`

## Health Checks

| Service | URL | Expected |
|---------|-----|----------|
| API | `http://127.0.0.1:3001/api/v1/health` | `{"status":"ok"}` |
| Web | `http://127.0.0.1:3000` | HTTP 200 |
| Public | `https://dev.alphapgm.com` | HTTP 200 (via Cloudflare) |
| Swagger | `http://127.0.0.1:3001/api/docs` | Swagger UI |

## Rollback Procedure

```bash
cd /var/www/dev.alphapgm.com

# 1. Stop all processes
pm2 stop all

# 2. Checkout previous version
git log --oneline -5        # Find the commit to roll back to
git checkout <commit-hash>

# 3. Reinstall and rebuild
pnpm install --frozen-lockfile
cd apps/api && npx prisma generate && cd ../..
pnpm build

# 4. Restart
pm2 restart all
pm2 save

# 5. Verify
curl -s http://127.0.0.1:3001/api/v1/health
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
```

## Troubleshooting

### API Not Starting

```bash
# Check PM2 logs
pm2 logs catalyser-api --lines 50

# Common issues:
# - Missing .env file or DATABASE_URL
# - MySQL not running: sudo systemctl status mysql
# - Redis not running: sudo systemctl status redis-server
# - Port 3001 already in use: lsof -i :3001
# - Prisma client not generated: cd apps/api && npx prisma generate
```

### Web Not Starting

```bash
# Check PM2 logs
pm2 logs catalyser-web --lines 50

# Common issues:
# - Build not complete: check for .next directory in apps/web
# - Port 3000 already in use: lsof -i :3000
# - Missing environment variables (NEXT_PUBLIC_API_URL)
```

### 502 Bad Gateway

```bash
# Check if processes are running
pm2 list

# Check if ports are listening
ss -tlnp | grep -E '3000|3001'

# Check Nginx config
sudo nginx -t

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

### Database Connection Issues

```bash
# Test MySQL connection
mysql -u catalyser_user -p -h localhost catalyser_db -e "SELECT 1"

# Check DATABASE_URL format
# Must be: mysql://USER:PASSWORD@HOST:PORT/DATABASE

# Verify Prisma can connect
cd apps/api && npx prisma db pull --print
```

### Redis Connection Issues

```bash
# Test Redis
redis-cli ping
# Expected: PONG

# If password is set:
redis-cli -a YOUR_PASSWORD ping

# Check Redis status
sudo systemctl status redis-server
```

### Stripe Webhooks Not Working

```bash
# Check webhook endpoint is accessible
curl -X POST http://127.0.0.1:3001/api/v1/webhooks/stripe

# Verify STRIPE_WEBHOOK_SECRET is set in .env
grep STRIPE_WEBHOOK_SECRET .env

# Check Stripe Dashboard > Developers > Webhooks for delivery status

# Ensure Nginx doesn't rate-limit the webhook path
# (dev.alphapgm.com.conf has a specific no-rate-limit block for /api/v1/webhooks/stripe)
```

### Build Failures

```bash
# Clean all build artifacts and rebuild
pnpm clean
pnpm install
cd apps/api && npx prisma generate && cd ../..
pnpm build

# If Turborepo cache issues:
rm -rf node_modules/.cache/turbo
pnpm build
```

### PM2 Memory Issues

```bash
# Check memory usage
pm2 monit

# If a process keeps restarting (max_memory_restart: 512M):
# 1. Check for memory leaks in logs
pm2 logs catalyser-api --lines 100

# 2. Increase memory limit temporarily
pm2 start deploy/ecosystem.config.js --max-memory-restart 1024M

# 3. Check Node.js heap
node --max-old-space-size=1024 apps/api/dist/main.js
```

### SSL/HTTPS Issues

```bash
# If "SSL handshake failed":
# 1. Ensure Cloudflare SSL mode is "Full (Strict)"
# 2. Ensure the orange cloud (proxy) is enabled on the DNS record
# 3. Nginx should listen on port 80 (Cloudflare terminates SSL)

# If mixed content warnings:
# Ensure NEXT_PUBLIC_APP_URL and API_URL use https://
```

### Log Locations

| Log | Path |
|-----|------|
| API stdout | `/var/log/catapp/api-out.log` |
| API errors | `/var/log/catapp/api-error.log` |
| Web stdout | `/var/log/catapp/web-out.log` |
| Web errors | `/var/log/catapp/web-error.log` |
| Nginx access | `/var/log/nginx/access.log` |
| Nginx errors | `/var/log/nginx/error.log` |
| PM2 daemon | `~/.pm2/pm2.log` |
| MySQL | `/var/log/mysql/error.log` |
| Redis | `/var/log/redis/redis-server.log` |
