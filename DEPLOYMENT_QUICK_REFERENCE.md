# Deployment Quick Reference

Fast reference for deploying to Coolify with your domain.

## 🎯 What You Need

1. **Coolify Access**: Your Coolify dashboard URL and login
2. **Domain**: Your domain name (e.g., newsletter.yourdomain.com)
3. **Database**: PostgreSQL credentials on your VPS
4. **Git Repo**: Your code repository URL
5. **Security Keys**: Generated encryption keys

---

## ⚡ 5-Minute Deployment

### 1. Generate Security Keys (On VPS)

```bash
# SSH to your VPS
ssh root@82.25.104.62

# Generate keys
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Save the output!
```

### 2. Create Application in Coolify

1. Login to Coolify dashboard
2. Click **"+ New"** → **"Application"**
3. Configure:
   - **Repository**: Your Git repo URL
   - **Branch**: `main`
   - **Build Pack**: **Dockerfile** ⚠️
   - **Port**: `5000` ⚠️
   - **Name**: `newsletter-app`

### 3. Add Environment Variables

Copy-paste these (update values):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/newsletter_db?sslmode=disable
PGHOST=localhost
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=newsletter_db
ENCRYPTION_KEY=<paste_generated_key>
TRACKING_SECRET=<paste_generated_secret>
NODE_ENV=production
PORT=5000
```

Mark as **Secret**: DATABASE_URL, PGPASSWORD, ENCRYPTION_KEY, TRACKING_SECRET

### 4. Add Domain

1. Go to **"Domains"** tab
2. Add: `newsletter.yourdomain.com`
3. Enable SSL ✅

### 5. Configure DNS

At your domain provider:
```
Type: A
Name: newsletter
Value: 82.25.104.62
```

### 6. Deploy

Click **"Deploy"** button and wait 5-10 minutes.

---

## 🔍 Verify Deployment

```bash
# Check health
curl https://newsletter.yourdomain.com/api/health

# Should return: {"status":"ok"}
```

---

## 👤 Create Superadmin

**In Coolify Terminal:**
```bash
npm run db:seed
```

**Default credentials:**
- Email: `zero.ai.info@gmail.com`
- Password: `SuperAdmin@2024!`

⚠️ **Change password immediately!**

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Dockerfile exists, Build Pack = "Dockerfile" |
| Database error | Verify DATABASE_URL, check PostgreSQL is running |
| 502 Bad Gateway | Check PORT=5000, view application logs |
| SSL not working | Wait 5-10 minutes, verify DNS |
| Can't login | Check database migrations ran, view logs |

---

## 📝 Environment Variables Checklist

**Required:**
- [ ] DATABASE_URL
- [ ] PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
- [ ] ENCRYPTION_KEY
- [ ] TRACKING_SECRET
- [ ] NODE_ENV=production
- [ ] PORT=5000

**Optional (for email sending):**
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_REGION

**Optional (for OAuth):**
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET

**Optional (for payments):**
- [ ] STRIPE_SECRET_KEY
- [ ] VITE_STRIPE_PUBLIC_KEY

---

## 🚀 Auto-Deploy Setup

1. Coolify → **"Settings"** → **"Auto Deploy"** → Enable
2. Copy webhook URL
3. GitHub → **Settings** → **Webhooks** → Add webhook
4. Paste URL, select "Push events"

Now every push to main = auto-deploy! 🎉

---

## 📊 Monitoring

**View Logs:**
- Coolify → **"Logs"** tab

**Check Status:**
- Green = Running ✅
- Red = Failed ❌

**Resource Usage:**
- Coolify dashboard shows CPU, Memory, Network

---

## 🔄 Redeploy

**Manual:**
- Click **"Deploy"** button in Coolify

**Via API:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://your-coolify.com/api/v1/applications/APP_ID/deploy
```

---

## 💾 Backup Database

```bash
# On VPS
pg_dump -U newsletter_user newsletter_db > backup.sql
gzip backup.sql
```

---

## 🆘 Emergency Commands

**Restart application:**
```bash
# In Coolify Terminal
pm2 restart all
```

**View live logs:**
```bash
# In Coolify Terminal
pm2 logs newsletter-app
```

**Check database:**
```bash
# On VPS
psql -U newsletter_user -d newsletter_db -c "SELECT COUNT(*) FROM users;"
```

---

## 📞 Support

**Documentation:**
- `COOLIFY_MANUAL_SETUP.md` - Detailed setup guide
- `VPS_DEPLOYMENT_GUIDE.md` - VPS deployment
- `DATABASE.md` - Database documentation
- `SECURITY.md` - Security practices

**Health Check:**
```bash
curl https://newsletter.yourdomain.com/api/health
```

**Application URL:**
```
https://newsletter.yourdomain.com
```

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible via domain
- [ ] HTTPS working (SSL certificate)
- [ ] Can create account and login
- [ ] Superadmin account created
- [ ] Default password changed
- [ ] Database connection working
- [ ] Auto-deploy configured
- [ ] Backups scheduled
- [ ] Monitoring alerts set up

---

**Last Updated**: November 21, 2025
