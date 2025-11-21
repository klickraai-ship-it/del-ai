# 🚀 Push Code to Git Repository

Your code needs to be in a Git repository for Coolify to deploy it. Here are your options:

---

## ✅ Option 1: Use Existing GitSafe Remote (Fastest)

You already have a gitsafe remote configured. Let's use it:

### Step 1: Commit All Changes

```powershell
# Add all files
git add .

# Commit changes
git commit -m "Prepare for Coolify deployment - All fixes applied"

# Push to gitsafe
git push gitsafe-backup main
```

### Step 2: Get Repository URL

Your repository URL is: `git://gitsafe:5418/backup.git`

**Note**: Make sure this repository is accessible from your Coolify server (82.25.104.62)

---

## 🆕 Option 2: Create New GitHub Repository (Recommended)

If you want to use GitHub (more reliable for Coolify):

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `newsletter-app` (or any name)
3. **Keep it Private** (recommended for production code)
4. **DO NOT** initialize with README, .gitignore, or license
5. Click **"Create repository"**

### Step 2: Add GitHub as Remote

```powershell
# Add GitHub remote (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/newsletter-app.git

# Or if you prefer SSH
git remote add origin git@github.com:YOUR_USERNAME/newsletter-app.git
```

### Step 3: Commit and Push

```powershell
# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Newsletter application ready for deployment"

# Push to GitHub
git push -u origin main
```

### Step 4: Configure Deploy Key (For Private Repos)

If your repository is private, you need to add a deploy key:

1. Generate SSH key on your VPS:
   ```bash
   ssh-keygen -t ed25519 -C "coolify-deploy" -f ~/.ssh/coolify_deploy
   cat ~/.ssh/coolify_deploy.pub
   ```

2. Add to GitHub:
   - Go to your repository → Settings → Deploy keys
   - Click "Add deploy key"
   - Paste the public key
   - Check "Allow write access" (if needed)
   - Save

3. Add to Coolify:
   - Go to your application in Coolify
   - Settings → Git
   - Add the private key content

---

## 🔧 Option 3: Use GitLab or Gitea

Similar process to GitHub:

### GitLab:
1. Create repository at https://gitlab.com
2. Add remote: `git remote add origin https://gitlab.com/YOUR_USERNAME/newsletter-app.git`
3. Push: `git push -u origin main`

### Gitea (Self-hosted):
1. Create repository in your Gitea instance
2. Add remote: `git remote add origin https://gitea.yourdomain.com/YOUR_USERNAME/newsletter-app.git`
3. Push: `git push -u origin main`

---

## 📋 Quick Commands Summary

### Commit Current Changes:

```powershell
# Check status
git status

# Add all files
git add .

# Commit with message
git commit -m "Ready for Coolify deployment"

# Push to remote (choose one)
git push origin main           # For GitHub/GitLab
git push gitsafe-backup main   # For GitSafe
```

### Verify Push:

```powershell
# Check remote URL
git remote -v

# Check last commit
git log -1

# Verify branch
git branch
```

---

## 🎯 After Pushing to Git

Once your code is in a Git repository, you can deploy to Coolify:

### Get Your Repository URL:

**GitHub**: `https://github.com/YOUR_USERNAME/newsletter-app.git`
**GitLab**: `https://gitlab.com/YOUR_USERNAME/newsletter-app.git`
**GitSafe**: `git://gitsafe:5418/backup.git`

### Then Run Deployment:

```powershell
# Set environment variables
$env:COOLIFY_URL = "YOUR_COOLIFY_URL"
$env:COOLIFY_API_TOKEN = "YOUR_API_TOKEN"
$env:GIT_REPO_URL = "YOUR_GIT_REPO_URL"  # From above
$env:DOMAIN = "newsletter.yourdomain.com"  # Optional

# Deploy
.\deploy-coolify.ps1
```

---

## 🔒 Important: .gitignore

Make sure sensitive files are NOT committed:

```gitignore
# Already in your .gitignore
node_modules/
dist/
.env
.env.local
.env.production

# Verify these are ignored
*.log
.DS_Store
```

### Check What Will Be Committed:

```powershell
# See what files will be committed
git status

# See what's ignored
git status --ignored
```

---

## ⚠️ Security Checklist

Before pushing:

- [ ] `.env.local` is in `.gitignore` (contains secrets)
- [ ] No API keys in code
- [ ] No passwords in code
- [ ] Database credentials not hardcoded
- [ ] All secrets use environment variables

### Verify:

```powershell
# Search for potential secrets (should return nothing)
git grep -i "password"
git grep -i "api_key"
git grep -i "secret"
```

---

## 🆘 Troubleshooting

### "Permission denied (publickey)"

**Solution**: Set up SSH key or use HTTPS with token

```powershell
# Use HTTPS with personal access token
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/newsletter-app.git
```

### "Repository not found"

**Solution**: 
- Verify repository exists
- Check you have access
- Ensure URL is correct

### "Failed to push"

**Solution**:
```powershell
# Pull first if remote has changes
git pull origin main --rebase

# Then push
git push origin main
```

### "Large files detected"

**Solution**:
```powershell
# Remove large files from git
git rm --cached path/to/large/file

# Add to .gitignore
echo "path/to/large/file" >> .gitignore

# Commit and push
git commit -m "Remove large files"
git push origin main
```

---

## ✅ Ready to Deploy!

Once your code is pushed to Git:

1. ✅ Code is in Git repository
2. ✅ Repository URL is known
3. ✅ Repository is accessible from Coolify server
4. ✅ Ready to run deployment script

**Next**: Follow `DEPLOY_TO_COOLIFY.md` to deploy!

---

**Last Updated**: November 21, 2025
