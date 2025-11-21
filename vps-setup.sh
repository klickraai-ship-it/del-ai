#!/bin/bash

# ========================================
# VPS Initial Setup Script
# ========================================
# Run this script ON YOUR VPS after connecting via SSH
# This will install all required dependencies and setup the environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# ========================================
# WELCOME
# ========================================

print_header "VPS Setup for Newsletter Application"

echo "This script will install and configure:"
echo "  • Node.js 20 LTS"
echo "  • PM2 Process Manager"
echo "  • Nginx Web Server"
echo "  • PostgreSQL (if not installed)"
echo "  • SSL Certificate (optional)"
echo "  • Firewall configuration"
echo ""

read -p "Continue with installation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

# ========================================
# SYSTEM UPDATE
# ========================================

print_header "Step 1: System Update"

print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated successfully!"

# ========================================
# INSTALL NODE.JS
# ========================================

print_header "Step 2: Install Node.js"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_warning "Node.js is already installed: $NODE_VERSION"
    read -p "Reinstall Node.js? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Skipping Node.js installation"
    else
        print_step "Installing Node.js 20 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        print_success "Node.js installed: $(node --version)"
    fi
else
    print_step "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
fi

print_success "npm version: $(npm --version)"

# ========================================
# INSTALL PM2
# ========================================

print_header "Step 3: Install PM2"

if command -v pm2 &> /dev/null; then
    print_warning "PM2 is already installed"
else
    print_step "Installing PM2 globally..."
    sudo npm install -g pm2
    print_success "PM2 installed: $(pm2 --version)"
fi

# ========================================
# INSTALL POSTGRESQL
# ========================================

print_header "Step 4: PostgreSQL Setup"

if command -v psql &> /dev/null; then
    print_success "PostgreSQL is already installed"
else
    read -p "Install PostgreSQL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Installing PostgreSQL..."
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        print_success "PostgreSQL installed and started"
    fi
fi

# ========================================
# CREATE DATABASE
# ========================================

if command -v psql &> /dev/null; then
    print_step "Setting up database..."
    
    read -p "Create newsletter database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter database name [newsletter_db]: " DB_NAME
        DB_NAME=${DB_NAME:-newsletter_db}
        
        read -p "Enter database user [newsletter_user]: " DB_USER
        DB_USER=${DB_USER:-newsletter_user}
        
        read -sp "Enter database password: " DB_PASSWORD
        echo
        
        sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
        
        print_success "Database created: $DB_NAME"
        print_success "User created: $DB_USER"
        
        # Save credentials for later
        echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable" > /tmp/db_credentials.txt
        echo "PGHOST=localhost" >> /tmp/db_credentials.txt
        echo "PGPORT=5432" >> /tmp/db_credentials.txt
        echo "PGUSER=$DB_USER" >> /tmp/db_credentials.txt
        echo "PGPASSWORD=$DB_PASSWORD" >> /tmp/db_credentials.txt
        echo "PGDATABASE=$DB_NAME" >> /tmp/db_credentials.txt
        
        print_success "Database credentials saved to /tmp/db_credentials.txt"
    fi
fi

# ========================================
# INSTALL NGINX
# ========================================

print_header "Step 5: Install Nginx"

if command -v nginx &> /dev/null; then
    print_success "Nginx is already installed"
else
    read -p "Install Nginx? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        print_success "Nginx installed and started"
    fi
fi

# ========================================
# CONFIGURE FIREWALL
# ========================================

print_header "Step 6: Firewall Configuration"

read -p "Configure firewall (UFW)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Configuring firewall..."
    
    # Allow SSH (important!)
    sudo ufw allow 22/tcp
    print_success "Allowed SSH (port 22)"
    
    # Allow HTTP
    sudo ufw allow 80/tcp
    print_success "Allowed HTTP (port 80)"
    
    # Allow HTTPS
    sudo ufw allow 443/tcp
    print_success "Allowed HTTPS (port 443)"
    
    # Allow Node.js app
    sudo ufw allow 5000/tcp
    print_success "Allowed Node.js app (port 5000)"
    
    # Allow PostgreSQL (if needed for remote access)
    read -p "Allow remote PostgreSQL access? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw allow 5432/tcp
        print_success "Allowed PostgreSQL (port 5432)"
    fi
    
    # Enable firewall
    print_warning "Enabling firewall. Make sure SSH (port 22) is allowed!"
    sudo ufw --force enable
    
    print_success "Firewall configured and enabled"
    sudo ufw status
fi

# ========================================
# CREATE APPLICATION DIRECTORY
# ========================================

print_header "Step 7: Application Directory"

APP_DIR="/var/www/newsletter-app"

print_step "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
print_success "Application directory created"

# ========================================
# GENERATE SECURITY KEYS
# ========================================

print_header "Step 8: Generate Security Keys"

print_step "Generating encryption keys..."

ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
TRACKING_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" > /tmp/security_keys.txt
echo "TRACKING_SECRET=$TRACKING_SECRET" >> /tmp/security_keys.txt

print_success "Security keys generated and saved to /tmp/security_keys.txt"

# ========================================
# CREATE ENVIRONMENT FILE TEMPLATE
# ========================================

print_header "Step 9: Environment Configuration"

print_step "Creating .env.production template..."

cat > $APP_DIR/.env.production.template << 'EOF'
# ========================================
# DATABASE
# ========================================
DATABASE_URL=postgresql://user:password@localhost:5432/database?sslmode=disable
PGHOST=localhost
PGPORT=5432
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGDATABASE=your_database_name

# ========================================
# SECURITY KEYS
# ========================================
ENCRYPTION_KEY=your_generated_encryption_key
TRACKING_SECRET=your_generated_tracking_secret

# ========================================
# APPLICATION
# ========================================
NODE_ENV=production
PORT=5000

# ========================================
# AWS SES (Optional)
# ========================================
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1

# ========================================
# GOOGLE OAUTH (Optional)
# ========================================
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# ========================================
# STRIPE (Optional)
# ========================================
# STRIPE_SECRET_KEY=
# VITE_STRIPE_PUBLIC_KEY=
EOF

print_success "Environment template created: $APP_DIR/.env.production.template"

# Create actual .env.production with generated values
if [ -f /tmp/db_credentials.txt ] && [ -f /tmp/security_keys.txt ]; then
    print_step "Creating .env.production with generated values..."
    
    cat > $APP_DIR/.env.production << EOF
# ========================================
# DATABASE
# ========================================
$(cat /tmp/db_credentials.txt)

# ========================================
# SECURITY KEYS
# ========================================
$(cat /tmp/security_keys.txt)

# ========================================
# APPLICATION
# ========================================
NODE_ENV=production
PORT=5000

# ========================================
# AWS SES (Optional - Add your credentials)
# ========================================
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1

# ========================================
# GOOGLE OAUTH (Optional - Add your credentials)
# ========================================
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# ========================================
# STRIPE (Optional - Add your credentials)
# ========================================
# STRIPE_SECRET_KEY=
# VITE_STRIPE_PUBLIC_KEY=
EOF
    
    print_success ".env.production created with database and security keys"
    
    # Clean up temporary files
    rm /tmp/db_credentials.txt /tmp/security_keys.txt
fi

# ========================================
# CREATE DEPLOYMENT SCRIPT
# ========================================

print_header "Step 10: Create Deployment Script"

cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting deployment..."

cd /var/www/newsletter-app

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Build application
echo "🔨 Building application..."
npm run build

# Restart application
echo "♻️ Restarting application..."
pm2 restart newsletter-app

# Show status
echo "✅ Deployment complete!"
pm2 status newsletter-app
pm2 logs newsletter-app --lines 20
EOF

chmod +x $APP_DIR/deploy.sh
print_success "Deployment script created: $APP_DIR/deploy.sh"

# ========================================
# CREATE BACKUP SCRIPT
# ========================================

print_header "Step 11: Create Backup Script"

cat > /root/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/newsletter"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="newsletter_db_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Load database credentials
source /var/www/newsletter-app/.env.production

# Backup database
pg_dump -h $PGHOST -U $PGUSER $PGDATABASE | gzip > $BACKUP_DIR/$FILENAME

# Keep only last 7 days of backups
find $BACKUP_DIR -name "newsletter_db_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $FILENAME"
EOF

chmod +x /root/backup-db.sh
print_success "Backup script created: /root/backup-db.sh"

# Setup cron job for daily backups
print_step "Setting up daily database backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-db.sh >> /var/log/newsletter-backup.log 2>&1") | crontab -
print_success "Daily backup scheduled at 2 AM"

# ========================================
# INSTALLATION COMPLETE
# ========================================

print_header "🎉 VPS Setup Complete!"

echo "Summary of installed components:"
echo "  ✅ Node.js $(node --version)"
echo "  ✅ npm $(npm --version)"
echo "  ✅ PM2 $(pm2 --version)"

if command -v psql &> /dev/null; then
    echo "  ✅ PostgreSQL $(psql --version | head -n1)"
fi

if command -v nginx &> /dev/null; then
    echo "  ✅ Nginx $(nginx -v 2>&1 | cut -d'/' -f2)"
fi

echo ""
echo "Application directory: $APP_DIR"
echo "Environment file: $APP_DIR/.env.production"
echo "Deployment script: $APP_DIR/deploy.sh"
echo "Backup script: /root/backup-db.sh"
echo ""
echo "Next steps:"
echo "  1. Upload your application code to: $APP_DIR"
echo "  2. Review and update: $APP_DIR/.env.production"
echo "  3. Install dependencies: cd $APP_DIR && npm install"
echo "  4. Build application: npm run build"
echo "  5. Run migrations: npm run db:push"
echo "  6. Start with PM2: pm2 start npm --name newsletter-app -- start"
echo "  7. Save PM2 config: pm2 save && pm2 startup"
echo ""
echo "For detailed instructions, see: VPS_DEPLOYMENT_GUIDE.md"
echo ""
