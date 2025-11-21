# Windows Local Setup Guide

Quick guide to run the application locally on Windows.

## ✅ Your Environment is Ready!

I've configured your `.env.local` file with:
- ✅ Database connection to your VPS PostgreSQL
- ✅ Security keys (ENCRYPTION_KEY, TRACKING_SECRET)
- ✅ Gemini API key
- ✅ Google OAuth credentials

## 📥 Step 1: Install Node.js

1. **Download Node.js**:
   - Go to: https://nodejs.org/
   - Click **"Download Node.js (LTS)"** - the green button
   - Version should be 20.x or 22.x

2. **Run the Installer**:
   - Double-click the downloaded `.msi` file
   - Click "Next" through all steps
   - Accept the license agreement
   - Use default installation location
   - **Important**: Check "Automatically install necessary tools" if asked
   - Click "Install"
   - Wait for installation to complete (2-3 minutes)

3. **Restart Your Terminal**:
   - Close Kiro completely
   - Reopen Kiro
   - This ensures Node.js is in your PATH

4. **Verify Installation**:
   ```powershell
   node --version
   npm --version
   ```
   You should see version numbers like `v20.11.0` and `10.2.4`

## 🚀 Step 2: Install Dependencies

Once Node.js is installed, run:

```powershell
npm install
```

This will:
- Download all required packages (~500MB)
- Take 2-5 minutes depending on your internet speed
- Create a `node_modules` folder

## 🗄️ Step 3: Setup Database

Push the database schema to your VPS PostgreSQL:

```powershell
npm run db:push
```

This will:
- Connect to your VPS database at 82.25.104.62
- Create all required tables
- Set up indexes and constraints

**Expected output:**
```
✓ Pushing schema changes to database
✓ Schema pushed successfully
```

## ▶️ Step 4: Start Development Server

```powershell
npm run dev
```

This will:
- Start the backend server on port 5000
- Start the frontend with hot reload
- Open your browser automatically

**Expected output:**
```
8:09:06 PM [express] serving on port 5000
```

## 🌐 Step 5: Access the Application

Open your browser and go to:
```
http://localhost:5000
```

You should see the login/signup page!

## 👤 Step 6: Create Your Account

1. Click **"Sign Up"** or **"Start Free Demo"**
2. Enter your email and password
3. Fill in your name
4. Click **"Create Account"**

You'll get 10 minutes of demo access to try all features!

## 🎉 Success!

Your application is now running locally!

---

## 🔧 Troubleshooting

### Error: "Cannot find module"
**Solution**: Run `npm install` again

### Error: "Port 5000 already in use"
**Solution**: 
```powershell
# Find and kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Error: "Database connection failed"
**Solution**: 
- Check your VPS PostgreSQL is running
- Verify the database credentials in `.env.local`
- Ensure your VPS firewall allows connections from your IP

### Error: "ECONNREFUSED"
**Solution**: Your VPS PostgreSQL might not be accessible from your local machine
- Check VPS firewall rules
- Verify PostgreSQL is listening on 0.0.0.0 (not just localhost)

---

## 📝 Useful Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open database GUI
npm run db:studio

# Seed sample data
npm run db:seed

# Reset database and seed
npm run db:reset
```

---

## 🔄 Next Steps After Local Testing

Once you've tested locally and everything works:

1. **Push to Git**: Commit your changes
2. **Deploy to Coolify**: Follow `COOLIFY_MANUAL_SETUP.md`
3. **Configure Domain**: Point your domain to VPS
4. **Enable SSL**: Coolify will auto-provision Let's Encrypt

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the error message in terminal
2. Look for errors in browser console (F12)
3. Verify `.env.local` has correct database credentials
4. Ensure Node.js version is 18+ (`node --version`)

---

**Last Updated**: November 21, 2025
