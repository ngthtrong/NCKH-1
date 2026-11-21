#!/usr/bin/env bash
# =============================================================================
# TenantFlow SaaS - One-Click EC2 Deployment Script
# Domain: tenantflow.tech (*.tenantflow.tech)
# =============================================================================
set -e

echo "========================================================"
echo "🚀 Deploying TenantFlow Pool Level 3 Multi-Tenant SaaS"
echo "   Domain: tenantflow.tech"
echo "========================================================"

# 1. Clean any legacy orphan files left over from previous branches
echo "🧹 Checking and cleaning orphan files from previous branches..."
rm -rf apps/web/src/auth apps/web/src/pages apps/api/src/test

# 2. Ensure .env exists
if [ ! -f .env ]; then
  if [ -f .env.ec2 ]; then
    echo "📄 Copying .env.ec2 to .env..."
    cp .env.ec2 .env
  fi
fi

# 3. Recreate containers with EC2 overlay
echo "🐳 Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.ec2.yml down
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build

# 3. Wait for services to become healthy
echo "⏳ Waiting 20 seconds for services to initialize..."
sleep 20

# 4. Check status
echo "📊 Container Status:"
docker compose -f docker-compose.yml -f docker-compose.ec2.yml ps

echo ""
echo "========================================================"
echo "✅ Deployment completed successfully!"
echo "🌐 Platform Admin:  https://admin.tenantflow.tech"
echo "🏢 Tenant Acme:     https://t-acme.tenantflow.tech"
echo "🎨 Tenant Lotus:    https://t-lotus.tenantflow.tech"
echo "⚡ Tenant Noisy:    https://t-noisy.tenantflow.tech"
echo "🏠 Landing Page:    https://tenantflow.tech"
echo "========================================================"
