# VPS Deployment Guide - Node.js Application

Complete guide to deploy this application to your VPS with Node.js.

## 🎯 Overview

This guide will help you deploy the Deliver-AI newsletter platform to your VPS server where PostgreSQL is already running.

**Your Setup:**
- VPS IP: `82.25.104.62`
- PostgreSQL: Already running on port 5432
- Node.js: Will be installed
- Application: Will run on port 5000

---

## 📋 Prerequisites

### On Your VPS
- Ubuntu/Debian Linux (or similar)
- Root or sudo access
- PostgreSQL already installed and running
- Ports 80, 443, 5000 open in firewall

### On Your Local Machine
- SSH access to VPS
- Git installed
- This codebase ready

---

## 🚀 Quick Deployment (5 Steps)

### Step 1: Connect to Your VPS

```bash
ssh root@82.25.104.62
# Or: ssh your_user@82.25.104.62
```

### Step 2: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 4: Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/newsletter-app
cd /var/www/newsletter-app

# Clone your repository (replace with your repo URL)
sudo git clone https://github.com/yourusername/your-repo.git .

# Or upload files via SCP from local machine:
# scp -r /path/to/local/project/* root@82.25.104.62:/var/www/newsletter-app/

# Install dependencies
sudo npm install

# Build the application
sudo npm run build
```

### Step 5: Configure and Start

```bash
# Create environment file
sudo nano /var/www/newsletter-app/.env.production

# Paste the configuration (see below)
# Save: Ctrl+X, then Y, then Enter

# Start application with PM2
sudo pm2 start npm --name "newsletter-app" -- start

# Save PM2 configuration
sudo pm2 save

# Setup PM2 to start on boot
sudo pm2 startup
# Follow the command it outputs

# Check status
sudo pm2 status
sudo pm2 logs newsletter-app
```

---

## 🔧 Environment Configuration

Create `/var/www/newsletter-app/.env.production`:

```bash
# ========================================
# DATABASE (Your VPS PostgreSQL)
# ========================================
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/newsletter_db?sslmode=disable
PGHOST=localhost
PGPORT=5432
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGDATABASE=newsletter_db

# ========================================
# SECURITY KEYS (REQUIRED)
# ========================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=YOUR_GENERATED_KEY_HERE

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TRACKING_SECRET=YOUR_GENERATED_SECRET_HERE

# ========================================
# APPLICATION
# ========================================
NODE_ENV=production
PORT=5000

# ========================================
# AWS SES (Optional - for email sending)
# ========================================
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# ========================================
# GOOGLE OAUTH (Optional)
# ========================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ========================================
# STRIPE (Optional)
# ========================================
STRIPE_SECRET_KEY=your_stripe_secret
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Generate Security Keys

On your VPS, run:

```bash
# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate TRACKING_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into `.env.production`.

---

## 🗄️ Database Setup

### Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE newsletter_db;
CREATE USER newsletter_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE newsletter_db TO newsletter_user;
\q
```

### Run Migrations

```bash
cd /var/www/newsletter-app

# Push schema to database
sudo npm run db:push

# (Optional) Seed with sample data
sudo npm run db:seed
```

---

## 🌐 Setup Nginx Reverse Proxy

### Install Nginx

```bash
sudo apt install -y nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/newsletter-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # Or use IP: server_name 82.25.104.62;

    # Redirect to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase max body size for file uploads
    client_max_body_size 10M;
}
```

### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/newsletter-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 Setup SSL Certificate (HTTPS)

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate

```bash
# For domain name
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job for renewal
```

---

## 🔥 Firewall Configuration

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow Node.js app (if accessing directly)
sudo ufw allow 5000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📊 Monitoring & Management

### PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs newsletter-app

# View specific log lines
pm2 logs newsletter-app --lines 100

# Monitor resources
pm2 monit

# Restart application
pm2 restart newsletter-app

# Stop application
pm2 stop newsletter-app

# Delete from PM2
pm2 delete newsletter-app
```

### Application Logs

```bash
# Real-time logs
pm2 logs newsletter-app --lines 50

# Error logs only
pm2 logs newsletter-app --err

# Save logs to file
pm2 logs newsletter-app > /var/log/newsletter-app.log
```

### System Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top

# Check Node.js processes
ps aux | grep node
```

---

## 🔄 Updating the Application

### Manual Update

```bash
# Navigate to app directory
cd /var/www/newsletter-app

# Pull latest code
sudo git pull origin main

# Install new dependencies
sudo npm install

# Rebuild application
sudo npm run build

# Restart with PM2
sudo pm2 restart newsletter-app

# Check logs
sudo pm2 logs newsletter-app
```

### Automated Deployment Script

Create `/var/www/newsletter-app/deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to app directory
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
```

Make it executable:

```bash
sudo chmod +x /var/www/newsletter-app/deploy.sh
```

Run deployment:

```bash
sudo /var/www/newsletter-app/deploy.sh
```

---

## 🔍 Troubleshooting

### Application Won't Start

**Check PM2 logs:**
```bash
pm2 logs newsletter-app --err
```

**Common issues:**
- Missing environment variables → Check `.env.production`
- Database connection failed → Verify DATABASE_URL
- Port already in use → Change PORT in `.env.production`

### Database Connection Failed

**Test connection:**
```bash
psql -h localhost -U newsletter_user -d newsletter_db
```

**Check PostgreSQL is running:**
```bash
sudo systemctl status postgresql
```

**Check PostgreSQL logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Nginx Not Working

**Test configuration:**
```bash
sudo nginx -t
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

### SSL Certificate Issues

**Check certificate status:**
```bash
sudo certbot certificates
```

**Renew manually:**
```bash
sudo certbot renew
```

### High Memory Usage

**Check Node.js memory:**
```bash
pm2 monit
```

**Increase Node.js memory limit:**
```bash
# Edit PM2 ecosystem file
pm2 delete newsletter-app
pm2 start npm --name "newsletter-app" --node-args="--max-old-space-size=2048" -- start
pm2 save
```

---

## 💾 Backup Strategy

### Database Backup

Create `/root/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/newsletter"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="newsletter_db_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U newsletter_user newsletter_db | gzip > $BACKUP_DIR/$FILENAME

# Keep only last 7 days of backups
find $BACKUP_DIR -name "newsletter_db_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $FILENAME"
```

Make executable:
```bash
chmod +x /root/backup-db.sh
```

### Automated Daily Backup

```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /root/backup-db.sh >> /var/log/newsletter-backup.log 2>&1
```

### Restore from Backup

```bash
# Decompress and restore
gunzip -c /var/backups/newsletter/newsletter_db_20241121_020000.sql.gz | \
  psql -h localhost -U newsletter_user newsletter_db
```

---

## 🎯 Performance Optimization

### Enable Gzip Compression

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

### Enable Caching

Add to Nginx config:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Connection Pooling

Already configured in the application via Drizzle ORM.

### PM2 Cluster Mode

For better performance with multiple CPU cores:

```bash
pm2 delete newsletter-app
pm2 start npm --name "newsletter-app" -i max -- start
pm2 save
```

---

## 📈 Monitoring Setup

### Install Monitoring Tools

```bash
# Install htop for system monitoring
sudo apt install -y htop

# Install netdata for real-time monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

Access Netdata at: `http://82.25.104.62:19999`

### PM2 Monitoring

```bash
# Enable PM2 web monitoring
pm2 web

# Access at: http://82.25.104.62:9615
```

---

## ✅ Post-Deployment Checklist

- [ ] Node.js installed and working
- [ ] Application deployed to `/var/www/newsletter-app`
- [ ] Environment variables configured in `.env.production`
- [ ] Database created and migrations run
- [ ] PM2 running application successfully
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall rules configured
- [ ] Backup script created and scheduled
- [ ] Application accessible via browser
- [ ] Can create account and login
- [ ] Email sending works (if AWS SES configured)
- [ ] Monitoring tools installed

---

## 🆘 Getting Help

### Check Application Health

```bash
# Health check endpoint
curl http://localhost:5000/api/health

# Should return: {"status":"ok"}
```

### View All Logs

```bash
# Application logs
pm2 logs newsletter-app

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# System logs
sudo journalctl -u nginx -f
```

---

## 🎉 Success!

Your application should now be running at:
- **HTTP**: `http://82.25.104.62` or `http://your-domain.com`
- **HTTPS**: `https://your-domain.com` (after SSL setup)

### Next Steps

1. Create superadmin account
2. Configure payment providers
3. Set up AWS SES for production
4. Add monitoring and alerts
5. Test with real campaigns

---

## 📚 Additional Resources

- `SETUP_LOCAL.md` - Local development setup
- `DEPLOYMENT.md` - General deployment guide
- `DATABASE.md` - Database documentation
- `SECURITY.md` - Security best practices
- `ENVIRONMENT_VARIABLES.md` - All environment variables

---

**Last Updated**: November 21, 2025
**Node.js Version**: 20.x LTS
**PM2 Version**: Latest
