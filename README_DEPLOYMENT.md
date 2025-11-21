# Deployment Guide Summary

Choose your deployment method and follow the appropriate guide.

## 🎯 Your Situation

You have:
- ✅ VPS at IP: `82.25.104.62`
- ✅ PostgreSQL running on VPS
- ✅ Coolify installed (or can install)
- ✅ Domain name ready
- ✅ This application code

---

## 📚 Available Deployment Guides

### 1. **COOLIFY_MANUAL_SETUP.md** ⭐ RECOMMENDED
**Best for**: Manual deployment with full control

**What it does**:
- Step-by-step Coolify deployment
- Configure via Coolify web UI
- Set up domain and SSL
- Create superadmin account

**Time**: 15-20 minutes

**Start here**: [COOLIFY_MANUAL_SETUP.md](./COOLIFY_MANUAL_SETUP.md)

---

### 2. **DEPLOYMENT_QUICK_REFERENCE.md** ⚡ FASTEST
**Best for**: Quick deployment if you know what you're doing

**What it does**:
- 5-minute deployment checklist
- Essential commands only
- Troubleshooting quick fixes

**Time**: 5-10 minutes

**Start here**: [DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md)

---

### 3. **VPS_DEPLOYMENT_GUIDE.md** 🔧 ADVANCED
**Best for**: Direct VPS deployment without Coolify

**What it does**:
- Install Node.js on VPS
- Setup PM2 process manager
- Configure Nginx reverse proxy
- Manual SSL setup

**Time**: 30-45 minutes

**Start here**: [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)

---

### 4. **deploy-coolify-api.sh** 🤖 AUTOMATED
**Best for**: Automated deployment via Coolify API

**What it does**:
- Automated deployment script
- Uses Coolify API token
- Creates application automatically
- Configures everything via script

**Time**: 10 minutes (mostly automated)

**Requirements**: Coolify API token

**How to use**:
```bash
chmod +x deploy-coolify-api.sh
./deploy-coolify-api.sh
```

---

### 5. **deploy-to-vps.sh** 🚀 VPS AUTOMATION
**Best for**: Automated VPS deployment without Coolify

**What it does**:
- Installs Node.js on VPS
- Deploys application
- Sets up PM2
- Configures Nginx

**Time**: 15-20 minutes

**How to use**:
```bash
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

---

### 6. **vps-setup.sh** 🛠️ VPS INITIAL SETUP
**Best for**: First-time VPS setup

**What it does**:
- Installs all dependencies
- Creates database
- Generates security keys
- Sets up backup scripts

**Time**: 20-30 minutes

**Run on VPS**:
```bash
chmod +x vps-setup.sh
./vps-setup.sh
```

---

## 🎯 Which Guide Should I Use?

### I have Coolify installed → Use **COOLIFY_MANUAL_SETUP.md**
This is the easiest and most reliable method.

### I want the fastest deployment → Use **DEPLOYMENT_QUICK_REFERENCE.md**
Quick checklist for experienced users.

### I don't have Coolify → Use **VPS_DEPLOYMENT_GUIDE.md**
Deploy directly to VPS with Node.js and PM2.

### I want full automation → Use **deploy-coolify-api.sh** or **deploy-to-vps.sh**
Automated scripts that do everything for you.

### My VPS is brand new → Use **vps-setup.sh** first
Sets up everything from scratch.

---

## 📋 Pre-Deployment Checklist

Before starting any deployment:

- [ ] VPS is accessible via SSH
- [ ] PostgreSQL is installed and running
- [ ] You have database credentials
- [ ] Domain name is ready (optional but recommended)
- [ ] Git repository is ready
- [ ] You have generated security keys

---

## 🔑 Generate Security Keys

**On your VPS or local machine with Node.js:**

```bash
# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate TRACKING_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save these keys! You'll need them for deployment.

---

## 🗄️ Database Setup

If PostgreSQL is not set up yet:

```bash
# SSH to VPS
ssh root@82.25.104.62

# Create database
sudo -u postgres psql
CREATE DATABASE newsletter_db;
CREATE USER newsletter_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE newsletter_db TO newsletter_user;
\q
```

---

## 🌐 Domain Configuration

**At your domain provider (Cloudflare, Namecheap, etc.):**

Add an A record:
```
Type: A
Name: newsletter (or @ for root)
Value: 82.25.104.62
TTL: 3600
```

Wait 5-60 minutes for DNS propagation.

---

## 🚀 Quick Start (Coolify Method)

1. **Generate keys** (see above)
2. **Open Coolify dashboard**
3. **Create new application**:
   - Repository: Your Git repo
   - Build Pack: Dockerfile
   - Port: 5000
4. **Add environment variables** (see COOLIFY_MANUAL_SETUP.md)
5. **Add domain**
6. **Deploy**
7. **Wait 5-10 minutes**
8. **Visit your domain**

Done! 🎉

---

## 📊 After Deployment

### Verify Everything Works

```bash
# Health check
curl https://your-domain.com/api/health

# Should return: {"status":"ok"}
```

### Create Superadmin Account

**Method 1: Seed database**
```bash
npm run db:seed
```

**Method 2: Sign up and promote**
```sql
UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';
```

### Change Default Password

⚠️ **IMPORTANT**: If you used `db:seed`, change the default password immediately!

Default credentials:
- Email: `zero.ai.info@gmail.com`
- Password: `SuperAdmin@2024!`

---

## 🔧 Troubleshooting

### Build Fails
- Check Dockerfile exists
- Verify Build Pack is "Dockerfile"
- Review build logs

### Database Connection Error
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists

### 502 Bad Gateway
- Check PORT environment variable is 5000
- View application logs
- Verify container is running

### SSL Not Working
- Wait 5-10 minutes for certificate
- Verify DNS points to correct IP
- Check domain is accessible via HTTP first

---

## 📚 Additional Documentation

- **DATABASE.md** - Database schema and queries
- **SECURITY.md** - Security best practices
- **ENVIRONMENT_VARIABLES.md** - All environment variables
- **EMAIL_FEATURES_DOCUMENTATION.md** - Email features
- **MULTI_TENANT_ARCHITECTURE.md** - Multi-tenancy design
- **PAYMENT_INTEGRATION_TODO.md** - Payment integration

---

## 🆘 Need Help?

### Check Application Health
```bash
curl https://your-domain.com/api/health
```

### View Logs
- **Coolify**: Dashboard → Logs tab
- **VPS**: `pm2 logs newsletter-app`

### Common Commands

**Restart application:**
```bash
pm2 restart newsletter-app
```

**View database:**
```bash
psql -U newsletter_user -d newsletter_db
```

**Check running processes:**
```bash
pm2 status
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Application accessible via domain
- [ ] HTTPS working (SSL certificate)
- [ ] Can create account and login
- [ ] Database connection working
- [ ] Superadmin account created
- [ ] Default password changed
- [ ] Email sending configured (optional)
- [ ] Payment providers configured (optional)
- [ ] Monitoring set up
- [ ] Backups scheduled

---

## 🎉 You're Ready!

Choose your deployment method above and follow the guide.

**Recommended for most users**: Start with **COOLIFY_MANUAL_SETUP.md**

Good luck! 🚀

---

**Last Updated**: November 21, 2025
**Application Version**: 1.0.0
