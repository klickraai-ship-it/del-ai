# Local Development Setup Guide

## Prerequisites Check

Before starting, verify Node.js is installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/ (LTS version)

---

## Step-by-Step Setup

### 1. Configure Database Connection

Edit `.env.local` and replace these values with your actual VPS PostgreSQL credentials:

```env
DATABASE_URL=postgresql://user:password@82.25.104.62:5432/database?sslmode=require
PGHOST=82.25.104.62
PGPORT=5432
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGDATABASE=your_database_name
```

**Important**: 
- Replace `user`, `password`, and `database` with your actual credentials
- Ensure your VPS PostgreSQL allows connections from your local IP
- Check if port 5432 is open in your VPS firewall

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages (~500MB). It may take 2-5 minutes.

### 3. Test Database Connection

```bash
npm run db:push
```

This will:
- Connect to your VPS database
- Create all required tables
- Set up indexes and constraints

**If this fails**, check:
- Database credentials are correct
- VPS firewall allows your IP on port 5432
- PostgreSQL is running on your VPS
- SSL mode is configured correctly

### 4. (Optional) Seed Sample Data

```bash
npm run db:seed
```

This creates sample data for testing (optional).

### 5. Start Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:5000**

You should see:
```
serving on port 5000
```

---

## Troubleshooting

### Error: "DATABASE_URL must be set"
- Check `.env.local` file exists
- Verify DATABASE_URL is not empty
- Restart the dev server

### Error: "Connection refused" or "ECONNREFUSED"
- VPS PostgreSQL is not accessible from your IP
- Check VPS firewall rules
- Verify PostgreSQL is listening on 0.0.0.0 (not just localhost)
- Test connection: `telnet 82.25.104.62 5432`

### Error: "password authentication failed"
- Wrong database credentials
- Double-check PGUSER and PGPASSWORD in `.env.local`

### Error: "SSL connection required"
- Add `?sslmode=require` to DATABASE_URL
- Or change to `?sslmode=disable` if SSL is not configured

### Port 5000 already in use
- Change PORT in `.env.local` to another port (e.g., 3000, 8080)
- Or kill the process using port 5000

---

## VPS PostgreSQL Configuration

If you can't connect, you may need to configure your VPS PostgreSQL:

### 1. Allow Remote Connections

Edit `/etc/postgresql/*/main/postgresql.conf`:
```conf
listen_addresses = '*'
```

### 2. Allow Your IP

Edit `/etc/postgresql/*/main/pg_hba.conf`:
```conf
# Allow connections from your local IP
host    all    all    YOUR_LOCAL_IP/32    md5
# Or allow all IPs (less secure)
host    all    all    0.0.0.0/0    md5
```

### 3. Restart PostgreSQL
```bash
sudo systemctl restart postgresql
```

### 4. Open Firewall Port
```bash
sudo ufw allow 5432/tcp
```

---

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)
- `npm run db:generate` - Generate migration files
- `npm run db:seed` - Seed sample data

---

## Next Steps After Setup

1. **Create an account**: Go to http://localhost:5000 and sign up
2. **Explore demo mode**: You get 10 minutes of full access
3. **Add subscribers**: Import or manually add email contacts
4. **Create templates**: Use the WYSIWYG editor
5. **Send campaigns**: Create and send test campaigns

---

## Production Deployment

See these files for deployment guides:
- `COOLIFY_DEPLOYMENT.md` - Deploy to Coolify
- `DEPLOYMENT.md` - General deployment guide
- `ENVIRONMENT_VARIABLES.md` - All environment variables explained

---

## Need Help?

Check these documentation files:
- `DATABASE.md` - Database schema and queries
- `MULTI_TENANT_ARCHITECTURE.md` - How multi-tenancy works
- `SECURITY.md` - Security best practices
- `EMAIL_FEATURES_DOCUMENTATION.md` - Email features guide
