#!/bin/bash
# Catalyser Platform — Deployment Script
# Usage: ./deploy/deploy.sh [--skip-install] [--skip-build]
# Target: dev.alphapgm.com

set -euo pipefail

APP_DIR="/var/www/dev.alphapgm.com"
LOG_DIR="/var/log/catapp"
BRANCH="${DEPLOY_BRANCH:-main}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Parse flags
SKIP_INSTALL=false
SKIP_BUILD=false
for arg in "$@"; do
  case $arg in
    --skip-install) SKIP_INSTALL=true ;;
    --skip-build) SKIP_BUILD=true ;;
  esac
done

# Ensure log directory exists
sudo mkdir -p "$LOG_DIR"
sudo chown "$(whoami):$(whoami)" "$LOG_DIR"

log "Starting deployment to dev.alphapgm.com"
log "Branch: $BRANCH"
log "App directory: $APP_DIR"

cd "$APP_DIR" || error "App directory not found: $APP_DIR"

# Pull latest code
log "Pulling latest code from $BRANCH..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
  log "Installing dependencies..."
  pnpm install --frozen-lockfile
else
  warn "Skipping dependency installation (--skip-install)"
fi

# Generate Prisma client
log "Generating Prisma client..."
cd apps/api && npx prisma generate && cd ../..

# Push database schema changes (safe — doesn't drop data)
log "Pushing database schema..."
cd apps/api && npx prisma db push --accept-data-loss=false && cd ../..

# Build
if [ "$SKIP_BUILD" = false ]; then
  log "Building all packages..."
  pnpm build
else
  warn "Skipping build (--skip-build)"
fi

# Restart services
log "Restarting PM2 processes..."
if pm2 list | grep -q "catalyser"; then
  pm2 reload deploy/ecosystem.config.js
else
  pm2 start deploy/ecosystem.config.js
fi

pm2 save

# Health check
log "Running health checks..."
sleep 3

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/v1/health || echo "000")
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || echo "000")

if [ "$API_HEALTH" = "200" ]; then
  log "API health check: ${GREEN}OK${NC} (HTTP $API_HEALTH)"
else
  warn "API health check: HTTP $API_HEALTH (may still be starting)"
fi

if [ "$WEB_HEALTH" = "200" ]; then
  log "Web health check: ${GREEN}OK${NC} (HTTP $WEB_HEALTH)"
else
  warn "Web health check: HTTP $WEB_HEALTH (may still be starting)"
fi

log "Deployment complete!"
log "API: http://127.0.0.1:3001/api/v1/health"
log "Web: http://127.0.0.1:3000"
log "Public: https://dev.alphapgm.com"
