# Coolify Manual Deployment Guide

Step-by-step guide to manually deploy your application to Coolify with your domain.

## 📋 Prerequisites

- ✅ Coolify installed on your VPS (82.25.104.62)
- ✅ PostgreSQL running on your VPS
- ✅ Domain name ready (e.g., newsletter.yourdomain.com)
- ✅ Git repository with your code
- ✅ Coolify admin access

---

## 🚀 Quick Deployment Steps

### Step 1: Access Coolify Dashboard

1. Open your browser
2. Go to your Coolify URL (e.g., `https://coolify.yourdomain.com`)
3. Log in with your credentials

### Step 2: Create New Application

1. Click **"+ New"** button
2. Select **"Application"**
3. Choose your server/destination

### Step 3: Configure Git Repository

**Source Configuration:**
- **Source Type**: Git Repository
- **Git Provider**: Select your provider (GitHub/GitLab/Gitea)
- **Repository URL**: Your repository URL
- **Branch**: `main` (or your production branch)
- **Build Pack**: **Dockerfile** ⚠️ IMPORTANT!

**Application Settings:**
- **Name**: `newsletter-app`
- **Port**: `5000` ⚠️ MUST match Dockerfile
- **Publicly Accessible**: ✅ Enable

Click **"Continue"** or **"Save"**

### Step 4: Add Environment Variables

Go to **"Environment Variables"** tab and add these:

#### Required Variables

| Variable | Value | Secret? |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/newsletter_db?sslmode=disable` | ✅ Yes |
| `PGHOST` | `localhost` | No |
| `PGPORT` | `5432` | No |
| `PGUSER` | Your PostgreSQL user | ✅ Yes |
| `PGPASSWORD` | Your PostgreSQL password | ✅ Yes |
| `PGDATABASE` | `newsletter_db` | No |
| `ENCRYPTION_KEY` | Generate (see below) | ✅ Yes |
| `TRACKING_SECRET` | Generate (see below) | ✅ Yes |
| `NODE_ENV` | `production` | No |
| `PORT` | `5000` | No |

#### Generate Security Keys

**On your VPS, run:**

```bash
# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate TRACKING_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into Coolify environment variables.

#### Optional Variables (Add if needed)

**AWS SES (for email sending):**
- `AWS_ACCESS_KEY_ID` - Your AWS access key (Secret: ✅)
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key (Secret: ✅)
- `AWS_REGION` - `us-east-1` (Secret: No)

**Google OAuth:**
- `GOOGLE_CLIENT_ID` - Your Google client ID (Secret: ✅)
- `GOOGLE_CLIENT_SECRET` - Your Google client secret (Secret: ✅)

**Stripe Payments:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key (Secret: ✅)
- `VITE_STRIPE_PUBLIC_KEY` - Your Stripe public key (Secret: No)

### Step 5: Configure Domain

1. Go to **"Domains"** tab
2. Click **"+ Add Domain"**
3. Enter your domain: `newsletter.yourdomain.com`
4. Enable **"Generate SSL Certificate"** (automatic Let's Encrypt)
5. Save

### Step 6: Configure DNS

**At your domain provider (Cloudflare, Namecheap, etc.):**

Add an A record:
```
Type: A
Name: newsletter (or @ for root domain)
Value: 82.25.104.62 (your VPS IP)
TTL: 3600 (or Auto)
```

**Wait for DNS propagation** (5-60 minutes)

### Step 7: Deploy Application

1. Click **"Deploy"** button
2. Watch the build logs in real-time
3. Wait for deployment to complete (5-10 minutes)

**Build process:**
- ✅ Clone repository
- ✅ Install dependencies
- ✅ Build frontend (Vite)
- ✅ Compile backend (TypeScript)
- ✅ Create Docker image
- ✅ Start container
- ✅ Health check

### Step 8: Verify Deployment

**Check Status:**
- Green indicator = Running ✅
- Red indicator = Failed ❌

**View Logs:**
- Go to **"Logs"** tab
- Look for: `serving on port 5000`

**Test Application:**
1. Wait for SSL certificate (2-5 minutes)
2. Visit: `https://newsletter.yourdomain.com`
3. You should see the login/signup page

### Step 9: Create Superadmin Account

**Option A: Using Coolify Terminal**

1. Go to **"Terminal"** tab in Coolify
2. Click **"Open Terminal"**
3. Run:
   ```bash
   npm run db:seed
   ```

This creates a superadmin account:
- **Email**: `zero.ai.info@gmail.com`
- **Password**: `SuperAdmin@2024!`

**Option B: Create Manually**

1. Sign up through the web interface
2. Connect to PostgreSQL:
   ```bash
   psql -U newsletter_user -d newsletter_db
   ```
3. Update user role:
   ```sql
   UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';
   ```

⚠️ **IMPORTANT**: Change the default password immediately!

---

## 🔧 Troubleshooting

### Build Fails

**Error: "Cannot find Dockerfile"**
- Solution: Ensure Dockerfile exists in repository root
- Check Build Pack is set to "Dockerfile"

**Error: "npm install failed"**
- Solution: Check package.json is valid
- Verify Node.js version compatibility

**Error: "vite build failed"**
- Solution: Check for TypeScript errors
- Review build logs for specific errors

### Database Connection Failed

**Error: "connect ECONNREFUSED"**
- Solution: Verify DATABASE_URL is correct
- Check PostgreSQL is running: `systemctl status postgresql`
- Ensure database exists: `psql -l`

**Error: "password authentication failed"**
- Solution: Check PGUSER and PGPASSWORD are correct
- Verify user has access to database

### Application Won't Start

**Error: "ENCRYPTION_KEY not set"**
- Solution: Add ENCRYPTION_KEY to environment variables
- Generate new key (see Step 4)

**Error: "Port 5000 already in use"**
- Solution: This shouldn't happen in Docker
- Check Coolify logs for conflicts

### SSL Certificate Issues

**Error: "Certificate not provisioned"**
- Solution: Wait 5-10 minutes for Let's Encrypt
- Verify DNS is pointing to correct IP
- Check domain is accessible via HTTP first

**Error: "DNS validation failed"**
- Solution: Ensure A record points to VPS IP
- Wait for DNS propagation (up to 24 hours)
- Use `nslookup newsletter.yourdomain.com` to verify

### Email Not Sending

**Error: "AWS SES credentials invalid"**
- Solution: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Check IAM permissions for SES
- Ensure AWS_REGION matches your SES region

**Error: "Email address not verified"**
- Solution: Verify sender email in AWS SES console
- Or request production access (if in sandbox mode)

---

## 📊 Post-Deployment Checklist

- [ ] Application accessible via domain
- [ ] SSL certificate active (HTTPS working)
- [ ] Can create account and login
- [ ] Database connection working
- [ ] Superadmin account created
- [ ] Default password changed
- [ ] Email sending configured (if using AWS SES)
- [ ] Payment providers configured (if needed)
- [ ] Monitoring and alerts set up

---

## 🔄 Updating the Application

### Enable Auto-Deploy

1. Go to **"Settings"** → **"Auto Deploy"**
2. Enable **"Deploy on Push"**
3. Copy the webhook URL

### Add Webhook to GitHub

1. Go to your GitHub repository
2. **Settings** → **Webhooks** → **Add webhook**
3. Paste Coolify webhook URL
4. Content type: `application/json`
5. Events: **Just the push event**
6. Save

Now every push to main branch will auto-deploy!

### Manual Redeploy

1. Go to Coolify dashboard
2. Click **"Deploy"** button
3. Wait for deployment to complete

---

## 📈 Monitoring

### View Logs

**Real-time logs:**
1. Go to **"Logs"** tab
2. Select log type (build, application, system)
3. Filter by severity

**Download logs:**
- Click **"Download"** button in logs tab

### Resource Usage

Coolify shows:
- CPU usage
- Memory usage
- Network traffic
- Disk usage

### Set Up Alerts

1. Go to **"Notifications"**
2. Add notification channel:
   - Slack webhook
   - Discord webhook
   - Email
3. Configure alert thresholds

---

## 🔒 Security Best Practices

### After Deployment

1. **Change default passwords**
   - Superadmin account
   - Database passwords (if using defaults)

2. **Enable 2FA**
   - For Coolify admin account
   - For application superadmin

3. **Review environment variables**
   - Ensure all secrets are marked as "Secret"
   - Never expose in logs or UI

4. **Configure firewall**
   - Only allow necessary ports
   - Use Coolify's built-in firewall rules

5. **Regular backups**
   - Enable Coolify automatic backups
   - Set up database backup cron job

### Environment Variable Security

In Coolify, mark these as **Secret**:
- DATABASE_URL
- PGPASSWORD
- ENCRYPTION_KEY
- TRACKING_SECRET
- AWS_SECRET_ACCESS_KEY
- GOOGLE_CLIENT_SECRET
- STRIPE_SECRET_KEY

---

## 💾 Backup Strategy

### Automatic Backups (Coolify)

1. Go to **"Backups"** tab
2. Enable automatic backups
3. Set schedule (daily recommended)
4. Configure retention (7-30 days)

### Manual Database Backup

**On your VPS:**

```bash
# Backup database
pg_dump -U newsletter_user newsletter_db > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Decompress
gunzip backup_20241121.sql.gz

# Restore
psql -U newsletter_user newsletter_db < backup_20241121.sql
```

---

## 🆘 Getting Help

### Check Application Health

```bash
# Health check endpoint
curl https://newsletter.yourdomain.com/api/health

# Should return: {"status":"ok"}
```

### View All Logs

**In Coolify:**
- Application logs: **"Logs"** → **"Application"**
- Build logs: **"Logs"** → **"Build"**
- System logs: **"Logs"** → **"System"**

**On VPS (if needed):**
```bash
# Docker logs
docker logs <container-id>

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Common Issues

**Issue**: Application shows 502 Bad Gateway
- **Solution**: Check if container is running
- View application logs in Coolify
- Verify PORT environment variable is 5000

**Issue**: Database migrations not running
- **Solution**: Check DATABASE_URL is correct
- Run migrations manually in terminal:
  ```bash
  npm run db:push
  ```

**Issue**: SSL certificate not working
- **Solution**: Wait 5-10 minutes
- Verify DNS is correct
- Check Coolify SSL logs

---

## 📚 Additional Resources

- **Coolify Documentation**: https://coolify.io/docs
- **Project Documentation**:
  - `README.md` - Project overview
  - `DATABASE.md` - Database schema
  - `SECURITY.md` - Security practices
  - `ENVIRONMENT_VARIABLES.md` - All variables explained

---

## ✅ Success!

Your application should now be running at:
**https://newsletter.yourdomain.com**

### Next Steps

1. Log in as superadmin
2. Configure payment providers
3. Set up AWS SES for production
4. Add monitoring and alerts
5. Test with real campaigns
6. Invite team members

---

**Last Updated**: November 21, 2025
**Coolify Version**: Latest
**Application Version**: 1.0.0
