# Coolify Deployment Guide

Complete guide for deploying the multi-tenant newsletter application to your Coolify instance.

## 🚨 Important Security Notice

**SSH Private Key Security**: The SSH private key you shared earlier has been exposed and should be rotated immediately. After rotation, store the new key only in Coolify's secret storage—never in code or chat.

## Prerequisites

- ✅ Coolify instance running and accessible
- ✅ Git repository containing this codebase
- ✅ PostgreSQL database at 82.25.104.62:5432 (or update DATABASE_URL)
- ✅ AWS SES credentials for email sending
- ✅ Google OAuth credentials (optional)

## Quick Start

1. Push your code to Git repository
2. Create new application in Coolify
3. Configure environment variables
4. Deploy!

---

## Step 1: Prepare Environment Variables

Before deploying, gather these required environment variables. You'll add them in Coolify's UI.

### 🔴 Required (Application won't start without these)

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@82.25.104.62:5432/dbname?sslmode=require
PGHOST=82.25.104.62
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name

# Security Keys - Generate new ones!
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=<random-32-char-base64-string>

# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TRACKING_SECRET=<random-secret-hex-string>

# Environment
NODE_ENV=production
PORT=5000
```

### 🟡 Recommended (For AWS SES email sending)

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

### 🟢 Optional (For Google OAuth)

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 💳 Optional (For production payment integration)

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

---

## Step 2: Create Application in Coolify

### 1. Log into Coolify Dashboard
- Navigate to your Coolify instance URL
- Log in with your credentials

### 2. Create New Application
- Click **"+ New"** → **"Application"**
- Choose your server/destination

### 3. Configure Git Repository
- **Source Type**: Git Repository
- **Git Provider**: GitHub/GitLab/Gitea (select yours)
- **Repository URL**: Your repository URL
- **Branch**: `main` (or your production branch)
- **Build Pack**: **Dockerfile** (important!)

### 4. Application Settings
- **Application Name**: `newsletter-app` (or your choice)
- **Port**: `5000` (critical - must match Dockerfile EXPOSE)
- **Publicly Accessible**: ✅ Enable

---

## Step 3: Configure Build Settings

Coolify will automatically detect the Dockerfile. Verify these settings:

### Build Configuration
- **Dockerfile Location**: `/Dockerfile` (root of repository)
- **Docker Context**: `.` (root directory)
- **Build Command**: Auto-detected from Dockerfile (builds frontend with Vite)
- **Start Command**: `npx tsx server/index.ts` (TypeScript runtime, already in Dockerfile)

### Build Process
The Dockerfile uses a simplified, reliable approach:
1. **Stage 1**: Builds only the frontend static assets using Vite
2. **Stage 2**: Copies built frontend + TypeScript source files
3. **Runtime**: Uses `tsx` to run TypeScript directly (same as development)

**Benefits**: No TypeScript compilation errors, faster builds, identical dev/prod runtime.

### Health Check
The Dockerfile includes a health check. Coolify will monitor `/api/health` endpoint.

---

## Step 4: Add Environment Variables

### In Coolify Dashboard:

1. Go to your application → **"Environment Variables"** tab
2. Click **"+ Add Variable"**
3. Add each variable from Step 1:
   - For non-sensitive values: Regular variable
   - For passwords/keys: Enable **"Secret"** toggle

### Environment Variable List

Add these one by one:

| Variable | Value | Secret? |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://...` | ✅ Yes |
| `PGHOST` | `82.25.104.62` | No |
| `PGPORT` | `5432` | No |
| `PGUSER` | Your DB user | ✅ Yes |
| `PGPASSWORD` | Your DB password | ✅ Yes |
| `PGDATABASE` | Your DB name | No |
| `ENCRYPTION_KEY` | Generated key | ✅ Yes |
| `TRACKING_SECRET` | Generated secret | ✅ Yes |
| `NODE_ENV` | `production` | No |
| `PORT` | `5000` | No |
| `AWS_ACCESS_KEY_ID` | Your AWS key | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret | ✅ Yes |
| `AWS_REGION` | `us-east-1` | No |
| `GOOGLE_CLIENT_ID` | Your Google ID | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Your Google secret | ✅ Yes |

### Generate Encryption Keys

Run these commands locally to generate secure keys:

```bash
# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate TRACKING_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into Coolify environment variables.

---

## Step 5: Deploy!

### Trigger First Deployment

1. Click **"Deploy"** button in Coolify
2. Watch the build logs in real-time

### Build Process (takes 2-5 minutes)

Coolify will:
1. Clone your Git repository
2. Build Docker image (multi-stage build):
   - Install dependencies (`npm ci`)
   - Build frontend (`vite build`)
   - Compile backend (`tsc`)
   - Create production image
3. Start container with `npm run start`
4. Expose port 5000 via Traefik reverse proxy
5. Provision SSL certificate (automatic)

### Monitor Build Logs

Watch for these success messages:
```
✅ npm install completed
✅ vite build completed
✅ TypeScript compilation successful
✅ Container started
✅ Health check passed
✅ Application running on port 5000
```

### Wait for "Running" Status

- Green indicator = Deployment successful
- Health check passes after ~30-60 seconds

---

## Step 6: Configure Domain (Optional)

### Add Custom Domain

1. Go to **"Domains"** tab in your application
2. Click **"+ Add Domain"**
3. Enter your domain: `newsletter.yourdomain.com`
4. Coolify automatically provisions SSL via Let's Encrypt

### DNS Configuration

Add DNS record at your domain provider:

**Option A: A Record**
```
Type: A
Name: newsletter (or @ for root)
Value: <your-coolify-server-ip>
TTL: 3600
```

**Option B: CNAME Record**
```
Type: CNAME
Name: newsletter
Value: <your-coolify-domain>
TTL: 3600
```

### Wait for SSL

- DNS propagation: 5-60 minutes
- SSL certificate: Auto-provisioned by Coolify
- HTTPS enabled automatically

---

## Step 7: Verify Deployment

### 1. Health Check

```bash
curl https://your-app.coolify.io/api/health
```

Expected response:
```json
{"status":"ok"}
```

### 2. Check Logs

In Coolify dashboard:
- Go to **"Logs"** tab
- Look for:
  ```
  ✅ Data migrations completed successfully
  8:09:06 PM [express] serving on port 5000
  ```

### 3. Test Demo Signup

1. Navigate to your deployed URL
2. Click **"Start Free Demo"**
3. Sign up with email/password
4. Verify:
   - You can access dashboard
   - Demo timer appears (10:00 countdown)
   - Timer counts down properly

### 4. Test Database Connectivity

- Check logs for "✅ Data migrations completed successfully"
- No database connection errors
- Tables created successfully

### 5. Test AWS SES (if configured)

1. Log into dashboard
2. Go to **Settings** → **Email Integration**
3. Add AWS SES credentials
4. Send test email
5. Check AWS SES console for delivery

---

## Step 8: Create Superadmin Account

### Option A: Using Coolify Terminal

1. Go to **"Terminal"** tab in Coolify
2. Click **"Open Terminal"**
3. Run:
   ```bash
   npm run db:seed
   ```

### Option B: Using Database

Connect to PostgreSQL directly:
```sql
-- Already created during db:seed
-- Email: zero.ai.info@gmail.com
-- Password: SuperAdmin@2024!
```

### ⚠️ IMPORTANT: Change Password Immediately!

1. Log in with default credentials
2. Go to **Settings** → **Account**
3. Change password to something secure

---

## Step 9: Post-Deployment Configuration

### 1. Configure Payment Providers

1. Log in as superadmin
2. Navigate to **"Payment Settings"**
3. Add Razorpay or PayPal credentials
4. Enable production mode
5. Test with small transaction

### 2. Set Terms & Conditions

1. Go to **"Terms & Conditions"** (superadmin)
2. Add your terms
3. Publish

### 3. Configure AWS SES Production

AWS SES starts in sandbox mode:
- Can only send to verified emails
- Limit: 200 emails/day

To enable production:
1. Go to AWS SES console
2. Request **"Production Access"**
3. Wait for approval (24-48 hours)
4. Update sending limits

---

## Continuous Deployment (Auto-Deploy on Push)

### Enable Auto-Deploy

1. Go to **"Settings"** → **"Auto Deploy"**
2. Enable **"Deploy on Push"**
3. Coolify generates a webhook URL

### Add Webhook to GitHub

1. Go to your GitHub repository
2. **Settings** → **Webhooks** → **Add webhook**
3. Paste Coolify webhook URL
4. Content type: `application/json`
5. Events: **Just the push event**
6. Save

### Deployment Workflow

Now when you push to main branch:
1. GitHub triggers webhook
2. Coolify pulls latest code
3. Rebuilds Docker image
4. Deploys with zero downtime
5. Rollback available if needed

---

## Monitoring & Maintenance

### View Application Logs

1. Go to **"Logs"** tab
2. Real-time log streaming
3. Filter by severity (info, error, warn)

### Resource Monitoring

Coolify shows:
- CPU usage
- Memory usage
- Network traffic
- Disk usage

### Set Up Alerts

1. Go to **"Notifications"**
2. Configure:
   - Slack webhook
   - Discord webhook
   - Email alerts
3. Set thresholds:
   - High CPU (>80%)
   - High memory (>90%)
   - Deployment failures

---

## Troubleshooting

### Build Fails

**Error: npm install failed**
```bash
# Solution: Check package.json dependencies
# Verify Node.js version compatibility
```

**Error: vite build failed**
```bash
# Solution: Check Vite configuration
# Ensure all frontend dependencies installed
```

### Database Connection Failed

**Error: connect ECONNREFUSED**
```bash
# Solution: Verify DATABASE_URL format
# Check PostgreSQL allows connections from Coolify IP
# Test: psql "postgresql://user:pass@82.25.104.62:5432/db"
```

**Error: SSL required**
```bash
# Solution: Add ?sslmode=require to DATABASE_URL
DATABASE_URL=postgresql://...?sslmode=require
```

### Application Won't Start

**Error: ENCRYPTION_KEY not set**
```bash
# Solution: Add ENCRYPTION_KEY to environment variables
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Error: Port 5000 already in use**
```bash
# Solution: This shouldn't happen in Docker
# Check Coolify logs for port conflicts
```

### Email Not Sending

**Error: AWS SES credentials invalid**
```bash
# Solution: Verify AWS credentials
# Check IAM permissions for SES
# Ensure region matches (AWS_REGION=us-east-1)
```

**Error: Email address not verified (sandbox)**
```bash
# Solution: Verify email in AWS SES console
# Or request production access
```

### Demo Timer Not Working

**Check browser console:**
```javascript
// Look for errors related to:
// - /api/auth/me endpoint
// - Demo expiry responses
// - Timer countdown
```

**Check server logs:**
```bash
# Look for demo-related messages:
Demo sync failed - logging out
Demo expired - logging out
```

---

## Scaling

### Vertical Scaling (Increase Resources)

1. Go to Coolify server settings
2. Increase:
   - CPU cores
   - Memory (RAM)
   - Disk space

### Horizontal Scaling (Multiple Instances)

Coolify supports load balancing:
1. Deploy multiple instances
2. Use Coolify's built-in load balancer
3. Configure session persistence (Redis)

### Database Scaling

For PostgreSQL at 82.25.104.62:
- Add read replicas
- Enable connection pooling
- Add indexes for performance
- Monitor slow queries

---

## Backup & Recovery

### Automatic Backups (Coolify)

Coolify can backup:
- Docker volumes
- Environment variables
- Application configuration

Enable in **Settings** → **Backups**

### Database Backups

Manual backup:
```bash
pg_dump -h 82.25.104.62 -U your_user -d your_db > backup.sql
```

Automated daily backup (cron):
```bash
0 2 * * * pg_dump "postgresql://..." | gzip > /backups/$(date +\%Y\%m\%d).sql.gz
```

### Restore from Backup

```bash
psql -h 82.25.104.62 -U your_user -d your_db < backup.sql
```

---

## Security Checklist

After deployment, verify:

- [ ] Changed default superadmin password
- [ ] Rotated SSH keys (exposed key from setup)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Strong ENCRYPTION_KEY generated and set
- [ ] DATABASE_URL uses SSL (?sslmode=require)
- [ ] AWS SES configured for production
- [ ] Google OAuth configured correctly
- [ ] Environment variables marked as "Secret" in Coolify
- [ ] Firewall rules configured (PostgreSQL port 5432)
- [ ] Rate limiting enabled and working
- [ ] Database backups configured and tested
- [ ] Monitoring and alerts set up

---

## Performance Optimization

### Database Optimization

Add indexes for frequently queried fields:
```sql
CREATE INDEX CONCURRENTLY idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX CONCURRENTLY idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX CONCURRENTLY idx_subscribers_email ON subscribers(email);
```

### Enable Caching

Add Redis for session storage and caching:
1. Add Redis service in Coolify
2. Update `DATABASE_URL` to use Redis
3. Configure session store

### CDN for Static Assets

For large files and images:
1. Upload to S3/R2
2. Enable CloudFront/CDN
3. Update image URLs

---

## Rollback

If deployment fails, Coolify supports instant rollback:

### Automatic Rollback

1. Go to **"Deployments"** tab
2. Find previous successful deployment
3. Click **"Redeploy"**
4. Coolify reverts to that version

### Manual Rollback

```bash
# Rollback database (if needed)
psql -h 82.25.104.62 -U your_user -d your_db < backup_before_deploy.sql

# Rollback application (handled by Coolify)
```

---

## Support & Next Steps

### Application Documentation

- **README.md**: General information
- **PAYMENT_INTEGRATION_TODO.md**: Complete payment integration
- **DEPLOYMENT.md**: General deployment guide
- **SECURITY.md**: Security best practices

### Production Readiness

After deployment:
1. ✅ Complete payment SDK integration (Razorpay/PayPal)
2. ✅ Configure production AWS SES (move out of sandbox)
3. ✅ Set up monitoring and alerting
4. ✅ Implement regular backup strategy
5. ✅ Load test with expected user volume (10k+ emails)
6. ✅ WCAG 2.1 Level AAA accessibility audit
7. ✅ GDPR compliance (data export, deletion)

### Estimated Time for Full Production

- Payment integration: ~20-30 hours
- AWS SES production setup: ~2-4 hours
- Testing and optimization: ~10-15 hours

---

## Quick Reference

### Essential Commands

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate tracking secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test database connection
psql "postgresql://user:pass@82.25.104.62:5432/db"

# Health check
curl https://your-app.coolify.io/api/health

# Database backup
pg_dump "postgresql://..." > backup.sql
```

### Coolify URLs

- **Dashboard**: `https://your-coolify-instance.com`
- **Application**: Auto-generated or custom domain
- **Webhook**: Found in Settings → Auto Deploy

### Important Files

- `Dockerfile`: Multi-stage build configuration
- `.dockerignore`: Files excluded from build
- `package.json`: Build scripts (build, start)
- `server/index.ts`: Application entry point

---

**Last Updated**: November 15, 2025  
**Application Version**: 1.0.0  
**Docker Base Image**: node:20-alpine  
**Deployment Platform**: Coolify
