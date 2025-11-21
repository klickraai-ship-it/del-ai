#!/bin/bash

# ============================================
# Coolify Automated Deployment Script
# ============================================
# This script deploys your application to Coolify via API
# Usage: ./deploy-coolify-automated.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
COOLIFY_URL="${COOLIFY_URL:-}"
COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:-}"
GIT_REPO_URL="${GIT_REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
APP_NAME="${APP_NAME:-newsletter-app}"
DOMAIN="${DOMAIN:-}"

# Database configuration (from your .env.local)
DB_HOST="${DB_HOST:-82.25.104.62}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-31eicyrlF1iDVuX4YNezyM4l2BI0ZvaQ3Jq6gDpIprDXsW1vMi3xCXgHlToCRine}"
DB_NAME="${DB_NAME:-postgres}"

# Security keys (from your .env.local)
ENCRYPTION_KEY="${ENCRYPTION_KEY:-6WS2mQdQMd12slZoQXJvPk53pWIZFXBAtFoqI/hx6x8=}"
TRACKING_SECRET="${TRACKING_SECRET:-04c7c8257dfaaea08f104d8d9da13291e4289c4d96f6cc2cac6cc839a4c8766e}"

# Optional services
GEMINI_API_KEY="${GEMINI_API_KEY:-AIzaSyDuiJl4mGCLp7pdhldK6WSCM5lIEZ8QSIM}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Coolify Automated Deployment        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Validation
if [ -z "$COOLIFY_URL" ]; then
    echo -e "${RED}❌ Error: COOLIFY_URL not set${NC}"
    echo "Please set: export COOLIFY_URL=https://your-coolify-url.com"
    exit 1
fi

if [ -z "$COOLIFY_API_TOKEN" ]; then
    echo -e "${RED}❌ Error: COOLIFY_API_TOKEN not set${NC}"
    echo "Please set: export COOLIFY_API_TOKEN=your-api-token"
    exit 1
fi

if [ -z "$GIT_REPO_URL" ]; then
    echo -e "${RED}❌ Error: GIT_REPO_URL not set${NC}"
    echo "Please set: export GIT_REPO_URL=https://github.com/user/repo.git"
    exit 1
fi

echo -e "${GREEN}✓ Configuration validated${NC}"
echo ""

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
            -H "Content-Type: application/json" \
            "$COOLIFY_URL/api/v1/$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$COOLIFY_URL/api/v1/$endpoint"
    fi
}

# Step 1: Get server/team info
echo -e "${YELLOW}📡 Step 1: Connecting to Coolify...${NC}"
SERVERS=$(api_call GET "servers")
echo -e "${GREEN}✓ Connected to Coolify${NC}"
echo ""

# Step 2: Create application
echo -e "${YELLOW}🚀 Step 2: Creating application...${NC}"

# Build DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# Prepare environment variables
ENV_VARS=$(cat <<EOF
{
  "DATABASE_URL": "$DATABASE_URL",
  "PGHOST": "$DB_HOST",
  "PGPORT": "$DB_PORT",
  "PGUSER": "$DB_USER",
  "PGPASSWORD": "$DB_PASSWORD",
  "PGDATABASE": "$DB_NAME",
  "ENCRYPTION_KEY": "$ENCRYPTION_KEY",
  "TRACKING_SECRET": "$TRACKING_SECRET",
  "NODE_ENV": "production",
  "PORT": "5000",
  "GEMINI_API_KEY": "$GEMINI_API_KEY",
  "AWS_REGION": "$AWS_REGION"
}
EOF
)

# Add AWS credentials if provided
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    ENV_VARS=$(echo "$ENV_VARS" | jq ". + {\"AWS_ACCESS_KEY_ID\": \"$AWS_ACCESS_KEY_ID\", \"AWS_SECRET_ACCESS_KEY\": \"$AWS_SECRET_ACCESS_KEY\"}")
fi

# Create application payload
APP_PAYLOAD=$(cat <<EOF
{
  "name": "$APP_NAME",
  "git_repository": "$GIT_REPO_URL",
  "git_branch": "$GIT_BRANCH",
  "build_pack": "dockerfile",
  "port": 5000,
  "is_public": true,
  "environment_variables": $ENV_VARS
}
EOF
)

# Create the application
APP_RESPONSE=$(api_call POST "applications" "$APP_PAYLOAD")
APP_UUID=$(echo "$APP_RESPONSE" | jq -r '.uuid // .id // empty')

if [ -z "$APP_UUID" ]; then
    echo -e "${RED}❌ Failed to create application${NC}"
    echo "Response: $APP_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Application created: $APP_UUID${NC}"
echo ""

# Step 3: Configure domain (if provided)
if [ -n "$DOMAIN" ]; then
    echo -e "${YELLOW}🌐 Step 3: Configuring domain...${NC}"
    
    DOMAIN_PAYLOAD=$(cat <<EOF
{
  "domain": "$DOMAIN",
  "generate_ssl": true
}
EOF
)
    
    DOMAIN_RESPONSE=$(api_call POST "applications/$APP_UUID/domains" "$DOMAIN_PAYLOAD")
    echo -e "${GREEN}✓ Domain configured: $DOMAIN${NC}"
    echo -e "${BLUE}ℹ️  Don't forget to point your DNS A record to: $DB_HOST${NC}"
    echo ""
fi

# Step 4: Deploy application
echo -e "${YELLOW}🔨 Step 4: Starting deployment...${NC}"
DEPLOY_RESPONSE=$(api_call POST "applications/$APP_UUID/deploy" "{}")
echo -e "${GREEN}✓ Deployment started${NC}"
echo ""

# Step 5: Monitor deployment
echo -e "${YELLOW}📊 Step 5: Monitoring deployment...${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"
echo ""

# Wait for deployment to complete
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 10
    STATUS=$(api_call GET "applications/$APP_UUID" | jq -r '.status // "unknown"')
    
    echo -ne "${BLUE}⏳ Checking status... ($((ATTEMPT + 1))/$MAX_ATTEMPTS) - Status: $STATUS${NC}\r"
    
    if [ "$STATUS" = "running" ]; then
        echo -e "\n${GREEN}✓ Deployment successful!${NC}"
        break
    elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "error" ]; then
        echo -e "\n${RED}❌ Deployment failed${NC}"
        echo "Check Coolify logs for details"
        exit 1
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "\n${YELLOW}⚠️  Deployment timeout - check Coolify dashboard${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deployment Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📝 Deployment Summary:${NC}"
echo -e "   Application: $APP_NAME"
echo -e "   UUID: $APP_UUID"
if [ -n "$DOMAIN" ]; then
    echo -e "   URL: https://$DOMAIN"
else
    echo -e "   URL: Check Coolify dashboard for assigned URL"
fi
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "   1. Wait for SSL certificate (2-5 minutes)"
echo -e "   2. Visit your application URL"
echo -e "   3. Create superadmin account or run: npm run db:seed"
echo -e "   4. Change default passwords"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo -e "   Coolify Dashboard: $COOLIFY_URL"
echo -e "   Application Logs: $COOLIFY_URL/applications/$APP_UUID/logs"
echo -e "   Health Check: https://$DOMAIN/api/health"
echo ""
