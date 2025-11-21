# Environment Variables Reference

Complete guide to all environment variables for development and production deployment.

## 📋 Quick Reference

### ✅ Currently Configured in Replit
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Database credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `ENCRYPTION_KEY` - Data encryption key (newly added)
- `TRACKING_SECRET` - Email tracking security (newly added)

### ⚠️ Optional (Not Required for Demo Mode)
- AWS SES credentials (for production email sending)
- Stripe credentials (for production payment processing)

---

## 🔑 Required Variables

### Database Connection
```bash
DATABASE_URL=postgresql://user:password@82.25.104.62:5432/database?sslmode=require
PGHOST=82.25.104.62
PGPORT=5432
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGDATABASE=your_database_name
```
**Status**: ✅ Configured  
**Purpose**: Connect to PostgreSQL database

### Security Keys
```bash
ENCRYPTION_KEY=6WS2mQdQMd12slZoQXJvPk53pWIZFXBAtFoqI/hx6x8=
TRACKING_SECRET=202df3f6e002bc340639558bbb624bd788192f414ec2f368e07fbff7ecfe1724
```
**Status**: ✅ Configured  
**Purpose**: 
- `ENCRYPTION_KEY` - Encrypts sensitive data in database (payment credentials, API keys)
- `TRACKING_SECRET` - Secures email tracking URLs and analytics tokens

**Generate New Keys**:
```bash
# For ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# For TRACKING_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Application Settings
```bash
NODE_ENV=production
PORT=5000
```
**Purpose**: Configure runtime environment

---

## 📧 Optional: AWS SES (Email Sending)

```bash
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
```
**Status**: ❌ Not configured (optional)  
**Purpose**: Send production emails (campaigns, notifications)  
**Get Credentials**: [AWS IAM Console](https://console.aws.amazon.com/iam/)

**Without AWS SES**:
- ✅ Demo mode works
- ✅ All UI features work
- ❌ Actual emails won't send
- ⚠️ Campaign sends will log warnings but won't fail

---

## 🔐 Optional: Google OAuth

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```
**Status**: ✅ Configured  
**Purpose**: Enable "Sign in with Google"  
**Get Credentials**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

---

## 💳 Optional: Stripe (Payment Processing)

```bash
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```
**Status**: ❌ Not configured (optional)  
**Purpose**: Process $65 one-time payments for paid accounts  
**Get Credentials**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

**Without Stripe**:
- ✅ Demo mode works (10-minute access)
- ❌ Paid signup won't process payments
- ℹ️ Users can still sign up as demo users

---

## 🚀 For Coolify Deployment

When deploying to Coolify, add **ALL** of these variables in Coolify's Environment Variables UI:

### Required (Application won't start without these)
1. All database variables (DATABASE_URL, PGHOST, etc.)
2. ENCRYPTION_KEY
3. TRACKING_SECRET
4. NODE_ENV=production
5. PORT=5000

### Recommended (For full functionality)
6. AWS_ACCESS_KEY_ID
7. AWS_SECRET_ACCESS_KEY
8. AWS_REGION

### Optional (Enhanced features)
9. GOOGLE_CLIENT_ID
10. GOOGLE_CLIENT_SECRET
11. STRIPE_SECRET_KEY
12. VITE_STRIPE_PUBLIC_KEY

**Important**: In Coolify, mark sensitive values (passwords, keys, secrets) as "Secret" to encrypt them.

---

## 🔒 Security Best Practices

### ✅ DO
- Store secrets in Replit Secrets panel (for Replit)
- Store secrets in Coolify Environment Variables (for Coolify)
- Use the "Secret" toggle for sensitive values in Coolify
- Generate new keys for production deployments
- Rotate keys periodically

### ❌ DON'T
- Commit `.env` file to git
- Share secrets in chat/email
- Use the same keys for dev and production
- Store secrets in code files

---

## 📝 Quick Setup Guide

### For Replit (Development)
1. Click "Secrets" icon in left sidebar
2. Add each variable with its value
3. Server auto-restarts with new secrets

### For Coolify (Production)
1. Go to your app → "Environment Variables" tab
2. Click "+ Add Variable"
3. Add each variable (enable "Secret" for sensitive ones)
4. Deploy!

---

## ✅ Current Configuration Status

**Your app is fully configured for development and demo mode!**

- ✅ Database connected
- ✅ Security keys configured
- ✅ Google OAuth ready
- ⚠️ AWS SES not configured (emails won't send - optional)
- ⚠️ Stripe not configured (payments won't process - optional)

**For full production functionality**, add AWS SES and Stripe credentials.

---

## 🆘 Troubleshooting

**Server shows encryption warnings**:
→ Add ENCRYPTION_KEY to Replit Secrets

**Tracking tokens invalid**:
→ Add TRACKING_SECRET to Replit Secrets

**Emails not sending**:
→ Add AWS SES credentials

**Payment processing fails**:
→ Add Stripe credentials

**Database connection errors**:
→ Verify all PG* variables are correct
