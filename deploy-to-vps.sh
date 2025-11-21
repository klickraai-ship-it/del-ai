#!/bin/bash

# ========================================
# VPS Deployment Script
# ========================================
# This script automates the deployment of the newsletter application to your VPS
# Run this from your LOCAL machine, not on the VPS

set -e  # Exit on any error

# ========================================
# CONFIGURATION - UPDATE THESE VALUES
# ========================================
VPS_IP="82.25.104.62"
VPS_USER="root"  # Change to your SSH user
APP_DIR="/var/www/newsletter-app"
REPO_URL="https://github.com/yourusername/your-repo.git"  # Update with your repo URL

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# FUNCTIONS
# ========================================

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

# ========================================
# PRE-FLIGHT CHECKS
# ========================================

print_step "Starting VPS deployment..."

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
    print_error "No SSH key found. Generate one with: ssh-keygen -t ed25519"
    exit 1
fi

# Test SSH connection
print_step "Testing SSH connection to $VPS_IP..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $VPS_USER@$VPS_IP exit 2>/dev/null; then
    print_error "Cannot connect to VPS. Check your SSH configuration."
    exit 1
fi

print_step "SSH connection successful!"

# ========================================
# INSTALL NODE.JS ON VPS
# ========================================

print_step "Installing Node.js on VPS..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    # Update system
    echo "Updating system packages..."
    sudo apt update && sudo apt upgrade -y

    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo "Node.js is already installed: $NODE_VERSION"
    else
        echo "Installing Node.js 20 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        
        echo "Node.js installed successfully!"
        node --version
        npm --version
    fi

    # Install PM2 if not already installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
        echo "PM2 installed successfully!"
    else
        echo "PM2 is already installed"
    fi
ENDSSH

print_step "Node.js and PM2 installation complete!"

# ========================================
# DEPLOY APPLICATION
# ========================================

print_step "Deploying application to VPS..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    # Create application directory
    echo "Creating application directory..."
    sudo mkdir -p $APP_DIR
    cd $APP_DIR

    # Clone or update repository
    if [ -d ".git" ]; then
        echo "Repository exists, pulling latest changes..."
        sudo git pull origin main
    else
        echo "Cloning repository..."
        sudo git clone $REPO_URL .
    fi

    # Install dependencies
    echo "Installing dependencies..."
    sudo npm install

    # Build application
    echo "Building application..."
    sudo npm run build

    echo "Application deployed successfully!"
ENDSSH

print_step "Application deployment complete!"

# ========================================
# SETUP ENVIRONMENT VARIABLES
# ========================================

print_step "Setting up environment variables..."

print_warning "You need to manually configure .env.production on the VPS"
print_warning "Run: ssh $VPS_USER@$VPS_IP"
print_warning "Then: sudo nano $APP_DIR/.env.production"
print_warning "See VPS_DEPLOYMENT_GUIDE.md for configuration details"

# ========================================
# SETUP DATABASE
# ========================================

print_step "Setting up database..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd $APP_DIR

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        echo "WARNING: .env.production not found. Skipping database setup."
        echo "Please create .env.production and run: npm run db:push"
        exit 0
    fi

    # Run database migrations
    echo "Running database migrations..."
    sudo npm run db:push

    echo "Database setup complete!"
ENDSSH

# ========================================
# START APPLICATION WITH PM2
# ========================================

print_step "Starting application with PM2..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd $APP_DIR

    # Stop existing PM2 process if running
    pm2 delete newsletter-app 2>/dev/null || true

    # Start application
    pm2 start npm --name "newsletter-app" -- start

    # Save PM2 configuration
    pm2 save

    # Setup PM2 to start on boot
    sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $VPS_USER --hp /home/$VPS_USER

    # Show status
    pm2 status
    pm2 logs newsletter-app --lines 20
ENDSSH

print_step "Application started successfully!"

# ========================================
# SETUP NGINX (OPTIONAL)
# ========================================

read -p "Do you want to setup Nginx reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Setting up Nginx..."

    read -p "Enter your domain name (or press Enter to use IP): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
        DOMAIN_NAME=$VPS_IP
    fi

    ssh $VPS_USER@$VPS_IP << ENDSSH
        # Install Nginx
        sudo apt install -y nginx

        # Create Nginx configuration
        sudo tee /etc/nginx/sites-available/newsletter-app > /dev/null <<'EOF'
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 10M;
}
EOF

        # Enable site
        sudo ln -sf /etc/nginx/sites-available/newsletter-app /etc/nginx/sites-enabled/

        # Test configuration
        sudo nginx -t

        # Restart Nginx
        sudo systemctl restart nginx

        echo "Nginx configured successfully!"
ENDSSH

    print_step "Nginx setup complete!"
fi

# ========================================
# SETUP FIREWALL
# ========================================

read -p "Do you want to configure firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Configuring firewall..."

    ssh $VPS_USER@$VPS_IP << 'ENDSSH'
        # Allow SSH
        sudo ufw allow 22/tcp

        # Allow HTTP
        sudo ufw allow 80/tcp

        # Allow HTTPS
        sudo ufw allow 443/tcp

        # Allow Node.js app
        sudo ufw allow 5000/tcp

        # Enable firewall
        sudo ufw --force enable

        # Show status
        sudo ufw status

        echo "Firewall configured successfully!"
ENDSSH

    print_step "Firewall setup complete!"
fi

# ========================================
# FINAL CHECKS
# ========================================

print_step "Running final checks..."

ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    # Check if application is running
    if pm2 list | grep -q "newsletter-app"; then
        echo "✅ Application is running"
    else
        echo "❌ Application is not running"
    fi

    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
    else
        echo "⚠️  Nginx is not running"
    fi

    # Test health endpoint
    sleep 5  # Wait for app to start
    if curl -s http://localhost:5000/api/health | grep -q "ok"; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed"
    fi
ENDSSH

# ========================================
# DEPLOYMENT COMPLETE
# ========================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your application is now running on:"
echo "  • HTTP: http://$VPS_IP:5000"
if [ ! -z "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "$VPS_IP" ]; then
    echo "  • Domain: http://$DOMAIN_NAME"
fi
echo ""
echo "Next steps:"
echo "  1. Configure .env.production on VPS"
echo "  2. Run database migrations: ssh $VPS_USER@$VPS_IP 'cd $APP_DIR && npm run db:push'"
echo "  3. Setup SSL certificate (if using domain)"
echo "  4. Create superadmin account"
echo ""
echo "Useful commands:"
echo "  • View logs: ssh $VPS_USER@$VPS_IP 'pm2 logs newsletter-app'"
echo "  • Restart app: ssh $VPS_USER@$VPS_IP 'pm2 restart newsletter-app'"
echo "  • Check status: ssh $VPS_USER@$VPS_IP 'pm2 status'"
echo ""
echo "For detailed documentation, see: VPS_DEPLOYMENT_GUIDE.md"
echo ""
