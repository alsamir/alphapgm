#!/bin/bash
# Catalyser Platform — Initial Server Setup
# Run this ONCE on a fresh Ubuntu 22.04 server
# Usage: sudo bash deploy/setup-server.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[SETUP]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root: sudo bash deploy/setup-server.sh"
fi

log "=== Catalyser Platform — Server Setup ==="

# 1. System updates
log "Updating system packages..."
apt update && apt upgrade -y

# 2. Node.js 20
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
log "Node.js version: $(node -v)"

# 3. pnpm
if ! command -v pnpm &> /dev/null; then
  log "Installing pnpm..."
  npm install -g pnpm@9
fi
log "pnpm version: $(pnpm -v)"

# 4. PM2
if ! command -v pm2 &> /dev/null; then
  log "Installing PM2..."
  npm install -g pm2
fi
log "PM2 version: $(pm2 -v)"

# 5. Redis
if ! command -v redis-server &> /dev/null; then
  log "Installing Redis..."
  apt install -y redis-server
  systemctl enable redis-server
  systemctl start redis-server
fi
log "Redis version: $(redis-server --version | awk '{print $3}')"

# 6. Create directories
log "Creating application directories..."
mkdir -p /var/www/dev.alphapgm.com
mkdir -p /var/log/catapp
chown -R www-data:www-data /var/log/catapp

# 7. Nginx config
log "Installing Nginx configuration..."
if [ -f deploy/nginx/proxy_params.inc ]; then
  cp deploy/nginx/proxy_params.inc /etc/nginx/conf.d/proxy_params.inc
fi
if [ -f deploy/nginx/dev.alphapgm.com.conf ]; then
  cp deploy/nginx/dev.alphapgm.com.conf /etc/nginx/sites-available/dev.alphapgm.com.conf
  ln -sf /etc/nginx/sites-available/dev.alphapgm.com.conf /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
fi

# 8. Firewall (if ufw is active)
if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
  log "Configuring firewall..."
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 22/tcp
fi

# 9. PM2 startup
log "Configuring PM2 startup..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# 10. Logrotate for app logs
cat > /etc/logrotate.d/catapp << 'LOGROTATE'
/var/log/catapp/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
LOGROTATE

log "=== Server setup complete ==="
log ""
log "Next steps:"
log "  1. Clone the repo to /var/www/dev.alphapgm.com"
log "  2. Copy .env.example to .env and configure"
log "  3. Run: bash deploy/deploy.sh"
