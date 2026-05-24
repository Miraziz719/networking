#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Deployment Script — AWS EC2 / DigitalOcean
# BTEC Unit 6: Networking in the Cloud
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh --host your-server-ip --user ubuntu --key ~/.ssh/id_rsa
#
# What it does:
#   1. Checks server connectivity
#   2. Installs Docker + Docker Compose on the server (if needed)
#   3. Copies project files to the server
#   4. Builds and starts all containers
#   5. Configures SSL (optional, with --ssl flag)
#   6. Runs health checks
# ══════════════════════════════════════════════════════════════════════════════

set -e

# ── Defaults ─────────────────────────────────────────────────────────────────
SERVER_HOST=""
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_rsa"
DEPLOY_DIR="~/cloud-networking"
SETUP_SSL=false
DOMAIN=""

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

print_step() { echo -e "\n${CYAN}▶ $1${NC}"; }
print_ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
print_err()  { echo -e "  ${RED}❌ $1${NC}"; }

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --host)   SERVER_HOST="$2"; shift ;;
    --user)   SERVER_USER="$2"; shift ;;
    --key)    SSH_KEY="$2";     shift ;;
    --dir)    DEPLOY_DIR="$2";  shift ;;
    --ssl)    SETUP_SSL=true;   ;;
    --domain) DOMAIN="$2";      shift ;;
    *) echo "Unknown param: $1"; exit 1 ;;
  esac
  shift
done

if [ -z "$SERVER_HOST" ]; then
  echo -e "${RED}Error: --host is required${NC}"
  echo "Usage: ./scripts/deploy.sh --host 1.2.3.4 --user ubuntu --key ~/.ssh/id_rsa"
  exit 1
fi

SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST}"
SCP_CMD="scp -i ${SSH_KEY} -o StrictHostKeyChecking=no"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   BTEC Unit 6 — Cloud Deployment Script                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Server : ${SERVER_USER}@${SERVER_HOST}"
echo "  Dir    : ${DEPLOY_DIR}"
echo "  SSL    : ${SETUP_SSL}"
[ -n "$DOMAIN" ] && echo "  Domain : ${DOMAIN}"
echo ""

# ── Step 1: Check connectivity ────────────────────────────────────────────────
print_step "Step 1: Checking server connectivity..."
if $SSH_CMD "echo 'Connection OK'" &>/dev/null; then
  print_ok "Connected to ${SERVER_HOST}"
else
  print_err "Cannot connect to ${SERVER_HOST}. Check your SSH key and server IP."
  exit 1
fi

# ── Step 2: Install Docker ────────────────────────────────────────────────────
print_step "Step 2: Installing Docker on server..."
$SSH_CMD << 'ENDSSH'
  set -e
  if ! command -v docker &>/dev/null; then
    echo "  Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "  Docker installed."
  else
    echo "  Docker already installed: $(docker --version)"
  fi
  if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
    echo "  Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
  fi
  echo "  Docker Compose: $(docker compose version)"
ENDSSH
print_ok "Docker ready"

# ── Step 3: Create deployment directory ──────────────────────────────────────
print_step "Step 3: Creating deployment directory..."
$SSH_CMD "mkdir -p ${DEPLOY_DIR}"
print_ok "Directory created: ${DEPLOY_DIR}"

# ── Step 4: Copy files ────────────────────────────────────────────────────────
print_step "Step 4: Copying project files to server..."
$SCP_CMD -r \
  ./docker-compose.yml \
  ./docker-compose.monitoring.yml \
  ./service-1 \
  ./service-2 \
  ./frontend \
  ./nginx \
  ./monitoring \
  ./.env.example \
  ${SERVER_USER}@${SERVER_HOST}:${DEPLOY_DIR}/

# Create .env from example if it doesn't exist
$SSH_CMD "[ -f ${DEPLOY_DIR}/.env ] || cp ${DEPLOY_DIR}/.env.example ${DEPLOY_DIR}/.env"
print_ok "Files copied"

# ── Step 5: Configure SSL (optional) ─────────────────────────────────────────
if [ "$SETUP_SSL" = true ] && [ -n "$DOMAIN" ]; then
  print_step "Step 5: Setting up SSL with Let's Encrypt..."
  $SSH_CMD << ENDSSH
    set -e
    # Install certbot
    sudo apt-get install -y certbot
    # Get certificate
    sudo certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos \
      --email admin@${DOMAIN} || echo "  SSL cert already exists or domain not pointed to this server"
    # Copy cert to nginx ssl dir
    sudo mkdir -p ${DEPLOY_DIR}/nginx/ssl
    sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${DEPLOY_DIR}/nginx/ssl/
    sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${DEPLOY_DIR}/nginx/ssl/
    sudo chown -R $USER:$USER ${DEPLOY_DIR}/nginx/ssl/
ENDSSH
  print_ok "SSL configured"
else
  print_step "Step 5: SSL setup skipped (use --ssl --domain yourdomain.com to enable)"
fi

# ── Step 6: Build and start containers ───────────────────────────────────────
print_step "Step 6: Building and starting containers..."
$SSH_CMD << ENDSSH
  set -e
  cd ${DEPLOY_DIR}
  # Build images
  docker compose build --no-cache
  # Start all services
  docker compose up -d
  # Show status
  echo ""
  docker compose ps
ENDSSH
print_ok "Containers started"

# ── Step 7: Health checks ─────────────────────────────────────────────────────
print_step "Step 7: Running health checks..."
sleep 15  # Wait for services to be ready

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_HOST}/health/service1" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  print_ok "ERP Service 1 health check: HTTP ${HTTP_CODE}"
else
  print_warn "ERP Service 1 health check returned HTTP ${HTTP_CODE}"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_HOST}/health/service2" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  print_ok "CRM/WMS Service 2 health check: HTTP ${HTTP_CODE}"
else
  print_warn "CRM/WMS Service 2 health check returned HTTP ${HTTP_CODE}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🎉 Deployment Complete!                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Dashboard : ${YELLOW}http://${SERVER_HOST}/${NC}"
echo -e "  Prometheus: ${YELLOW}http://${SERVER_HOST}:9090${NC}"
echo -e "  Grafana   : ${YELLOW}http://${SERVER_HOST}:3000${NC}  (admin / btecunit6)"
echo ""
echo -e "  Scale up  : ${CYAN}ssh ${SERVER_USER}@${SERVER_HOST}${NC}"
echo -e "              ${CYAN}cd ${DEPLOY_DIR} && docker compose up -d --scale service-1=3 --scale service-2=3${NC}"
echo ""
