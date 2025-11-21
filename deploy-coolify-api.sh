#!/bin/bash

# ========================================
# Coolify API Deployment Script
# ========================================
# This script deploys the application to Coolify using the API
# Run this from your LOCAL machine

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# CONFIGURATION
# ========================================

# Coolify API Configuration
COOLIFY_URL="https://your-coolify-domain.com"  # Update with your Coolify URL
COOLIFY_API_TOKEN=""  # Will be prompted or set via environment variable

# Application Configuration
APP_NAME="newsletter-app"
GIT_REPO_URL="https://github.com/yourusername/your-repo.git"  # Update with your repo
GIT_BRANCH="main"
DOMAIN_NAME=""  # Will be prompted

# Database Configuration (Your VPS PostgreSQL)
DB_HOST="82.25.104.62"
DB_PORT="5432"
DB_NAME=""  # Will be prompted
DB_USER=""  # Will be prompted
DB_PASSWORD=""  # Will be prompted

# ========================================
# FUNCTIONS
# ========================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to make API calls to Coolify
coolify_api() {
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

# Generate random string for secrets
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# ========================================
# WELCOME
# ========================================

print_header "Coolify API Deployment"

echo "This script will deploy your newsletter application to Coolify using the API."
echo ""

# ========================================
# COLLECT CONFIGURATION
# ========================================

print_header "Step 1: Configuration"

# Coolify API Token
if [ -z "$COOLIFY_API_TOKEN" ]; then
    echo "You need a Coolify API token to proceed."
    echo "Get it from: $COOLIFY_URL/security/api-tokens"
    echo ""
    read -sp "Enter your Coolify API token: " COOLIFY_API_TOKEN
    echo ""
fi

# Verify API token
print_step "Verifying API token..."
TEAM_INFO=$(coolify_api "GET" "teams")
if echo "$TEAM_INFO" | grep -q "error"; then
    print_error "Invalid API token or cannot connect to Coolify"
    echo "$TEAM_INFO"
    exit 1
fi
print_success "API token verified!"

# Domain name
read -p "Enter your domain name (e.g., newsletter.yourdomain.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Git repository
read -p "Enter your Git repository URL [$GIT_REPO_URL]: " INPUT_REPO
if [ ! -z "$INPUT_REPO" ]; then
    GIT_REPO_URL=$INPUT_REPO
fi

# Database credentials
print_step "Database configuration..."
read -p "Database name [newsletter_db]: " DB_NAME
DB_NAME=${DB_NAME:-newsletter_db}

read -p "Database user [newsletter_user]: " DB_USER
DB_USER=${DB_USER:-newsletter_user}

read -sp "Database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "Database password is required"
    exit 1
fi

# Generate security keys
print_step "Generating security keys..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || openssl rand -base64 32)
TRACKING_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

print_success "Configuration collected!"

# ========================================
# CREATE APPLICATION IN COOLIFY
# ========================================

print_header "Step 2: Creating Application in Coolify"

# Get team ID
TEAM_ID=$(echo "$TEAM_INFO" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
print_step "Using team ID: $TEAM_ID"

# Create application
print_step "Creating application: $APP_NAME"

APP_DATA=$(cat <<EOF
{
  "name": "$APP_NAME",
  "description": "Multi-tenant newsletter and email campaign platform",
  "git_repository": "$GIT_REPO_URL",
  "git_branch": "$GIT_BRANCH",
  "build_pack": "dockerfile",
  "ports_exposes": "5000",
  "domains": "$DOMAIN_NAME",
  "environment_variables": {
    "DATABASE_URL": "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require",
    "PGHOST": "$DB_HOST",
    "PGPORT": "$DB_PORT",
    "PGUSER": "$DB_USER",
    "PGPASSWORD": "$DB_PASSWORD",
    "PGDATABASE": "$DB_NAME",
    "ENCRYPTION_KEY": "$ENCRYPTION_KEY",
    "TRACKING_SECRET": "$TRACKING_SECRET",
    "NODE_ENV": "production",
    "PORT": "5000"
  }
}
EOF
)

APP_RESPONSE=$(coolify_api "POST" "applications" "$APP_DATA")

if echo "$APP_RESPONSE" | grep -q "error"; then
    print_error "Failed to create application"
    echo "$APP_RESPONSE"
    exit 1
fi

APP_ID=$(echo "$APP_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
print_success "Application created with ID: $APP_ID"

# ========================================
# CONFIGURE ENVIRONMENT VARIABLES
# ========================================

print_header "Step 3: Configuring Environment Variables"

print_step "Setting environment variables..."

# Note: Coolify API might require setting env vars individually
# This is a simplified version - adjust based on actual Coolify API

ENV_VARS=(
    "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"
    "PGHOST=$DB_HOST"
    "PGPORT=$DB_PORT"
    "PGUSER=$DB_USER"
    "PGPASSWORD=$DB_PASSWORD"
    "PGDATABASE=$DB_NAME"
    "ENCRYPTION_KEY=$ENCRYPTION_KEY"
    "TRACKING_SECRET=$TRACKING_SECRET"
    "NODE_ENV=production"
    "PORT=5000"
)

for env_var in "${ENV_VARS[@]}"; do
    KEY=$(echo "$env_var" | cut -d'=' -f1)
    VALUE=$(echo "$env_var" | cut -d'=' -f2-)
    
    ENV_DATA=$(cat <<EOF
{
  "key": "$KEY",
  "value": "$VALUE",
  "is_secret": true
}
EOF
)
    
    coolify_api "POST" "applications/$APP_ID/environment-variables" "$ENV_DATA" > /dev/null
    print_step "Set: $KEY"
done

print_success "Environment variables configured!"

# ========================================
# OPTIONAL: AWS SES CONFIGURATION
# ========================================

print_header "Step 4: Optional Services"

read -p "Do you want to configure AWS SES for email sending? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "AWS Access Key ID: " AWS_KEY
    read -sp "AWS Secret Access Key: " AWS_SECRET
    echo ""
    read -p "AWS Region [us-east-1]: " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    # Add AWS env vars
    coolify_api "POST" "applications/$APP_ID/environment-variables" \
        "{\"key\":\"AWS_ACCESS_KEY_ID\",\"value\":\"$AWS_KEY\",\"is_secret\":true}" > /dev/null
    coolify_api "POST" "applications/$APP_ID/environment-variables" \
        "{\"key\":\"AWS_SECRET_ACCESS_KEY\",\"value\":\"$AWS_SECRET\",\"is_secret\":true}" > /dev/null
    coolify_api "POST" "applications/$APP_ID/environment-variables" \
        "{\"key\":\"AWS_REGION\",\"value\":\"$AWS_REGION\",\"is_secret\":false}" > /dev/null
    
    print_success "AWS SES configured!"
fi

# ========================================
# DEPLOY APPLICATION
# ========================================

print_header "Step 5: Deploying Application"

print_step "Triggering deployment..."

DEPLOY_RESPONSE=$(coolify_api "POST" "applications/$APP_ID/deploy" "{}")

if echo "$DEPLOY_RESPONSE" | grep -q "error"; then
    print_error "Failed to trigger deployment"
    echo "$DEPLOY_RESPONSE"
    exit 1
fi

print_success "Deployment triggered!"

print_step "Deployment is in progress. This may take 5-10 minutes."
print_step "You can monitor the deployment in Coolify dashboard:"
echo "  $COOLIFY_URL/applications/$APP_ID"

# ========================================
# WAIT FOR DEPLOYMENT
# ========================================

print_step "Waiting for deployment to complete..."

for i in {1..60}; do
    sleep 10
    STATUS=$(coolify_api "GET" "applications/$APP_ID/status")
    
    if echo "$STATUS" | grep -q "running"; then
        print_success "Application is running!"
        break
    elif echo "$STATUS" | grep -q "failed"; then
        print_error "Deployment failed!"
        echo "Check logs at: $COOLIFY_URL/applications/$APP_ID/logs"
        exit 1
    fi
    
    echo -n "."
done

echo ""

# ========================================
# CONFIGURE DOMAIN & SSL
# ========================================

print_header "Step 6: Domain & SSL Configuration"

print_step "Configuring domain: $DOMAIN_NAME"

DOMAIN_DATA=$(cat <<EOF
{
  "domain": "$DOMAIN_NAME",
  "generate_ssl": true
}
EOF
)

coolify_api "POST" "applications/$APP_ID/domains" "$DOMAIN_DATA" > /dev/null

print_success "Domain configured!"
print_warning "Make sure your DNS points to your Coolify server IP"

# ========================================
# SAVE CONFIGURATION
# ========================================

print_header "Step 7: Saving Configuration"

CONFIG_FILE="coolify-deployment-config.txt"

cat > "$CONFIG_FILE" << EOF
========================================
Coolify Deployment Configuration
========================================
Date: $(date)

Application Details:
- Name: $APP_NAME
- ID: $APP_ID
- Domain: $DOMAIN_NAME
- Git Repository: $GIT_REPO_URL
- Branch: $GIT_BRANCH

Database:
- Host: $DB_HOST
- Port: $DB_PORT
- Database: $DB_NAME
- User: $DB_USER

Security Keys:
- ENCRYPTION_KEY: $ENCRYPTION_KEY
- TRACKING_SECRET: $TRACKING_SECRET

Coolify URLs:
- Dashboard: $COOLIFY_URL/applications/$APP_ID
- Logs: $COOLIFY_URL/applications/$APP_ID/logs
- Settings: $COOLIFY_URL/applications/$APP_ID/settings

Application URL:
- https://$DOMAIN_NAME

========================================
IMPORTANT: Keep this file secure!
It contains sensitive credentials.
========================================
EOF

print_success "Configuration saved to: $CONFIG_FILE"

# ========================================
# DEPLOYMENT COMPLETE
# ========================================

print_header "🎉 Deployment Complete!"

echo "Your application has been deployed to Coolify!"
echo ""
echo "Application URL: https://$DOMAIN_NAME"
echo "Coolify Dashboard: $COOLIFY_URL/applications/$APP_ID"
echo ""
echo "Next steps:"
echo "  1. Wait for SSL certificate to be provisioned (2-5 minutes)"
echo "  2. Ensure DNS points to your Coolify server"
echo "  3. Visit https://$DOMAIN_NAME to access your application"
echo "  4. Create superadmin account"
echo "  5. Configure payment providers in admin panel"
echo ""
echo "Configuration saved to: $CONFIG_FILE"
echo ""
echo "To view logs:"
echo "  Visit: $COOLIFY_URL/applications/$APP_ID/logs"
echo ""
echo "To redeploy:"
echo "  curl -X POST -H 'Authorization: Bearer $COOLIFY_API_TOKEN' \\"
echo "    $COOLIFY_URL/api/v1/applications/$APP_ID/deploy"
echo ""

print_warning "SECURITY: Store your API token and $CONFIG_FILE securely!"
print_warning "Never commit these to version control!"

echo ""
