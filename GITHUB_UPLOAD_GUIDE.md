# GitHub Upload Guide

Your local Git repository is ready! Follow these steps to upload to GitHub.

---

## Step 1: Create a GitHub Repository

1. Go to https://github.com
2. Click the **"+"** icon in the top right
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name:** `team-crm-software` (or your preferred name)
   - **Description:** Team Management CRM System with Attendance, Timesheets, Projects & Inventory
   - **Visibility:** Choose Public or Private
   - **⚠️ IMPORTANT:** Do NOT initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

---

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

### Option A: Using HTTPS (Recommended for beginners)

```bash
git remote add origin https://github.com/YOUR-USERNAME/team-crm-software.git
git branch -M main
git push -u origin main
```

**Note:** Replace `YOUR-USERNAME` with your GitHub username.

### Option B: Using SSH (If you have SSH keys set up)

```bash
git remote add origin git@github.com:YOUR-USERNAME/team-crm-software.git
git branch -M main
git push -u origin main
```

---

## Step 3: Verify Upload

1. Refresh your GitHub repository page
2. You should see all 105 files uploaded
3. Verify that README.md displays correctly

---

## Quick Command Reference

I've already done these for you:
- ✅ Created .gitignore
- ✅ Updated .env.example
- ✅ Initialized git repository (`git init`)
- ✅ Added all files (`git add .`)
- ✅ Created initial commit

---

## What's NOT Uploaded (Protected by .gitignore)

These sensitive files are intentionally excluded:
- `.env` - Your actual environment variables with secrets
- `.env.production` - Production credentials
- `node_modules/` - Frontend dependencies (too large)
- `__pycache__/` - Python cache files
- Database files and backups
- Docker volumes

**⚠️ This is important for security!**

---

## After Upload

### Update Your GitHub Repository Settings

1. **Add Topics** (for discoverability):
   - crm
   - team-management
   - attendance-system
   - fastapi
   - nextjs
   - docker
   - typescript
   - postgresql

2. **Add Description:**
   ```
   Full-stack Team Management CRM with GPS Attendance, Timesheets,
   Project Kanban Boards & Inventory Management. Built with FastAPI,
   Next.js 14, PostgreSQL & Docker.
   ```

3. **Set Homepage** (optional):
   - Add your deployment URL when you deploy to production

---

## Clone on Another Machine

Once uploaded, anyone (or you on another machine) can clone it:

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/team-crm-software.git
cd team-crm-software

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start with Docker
docker-compose up -d

# Or follow the detailed setup in README.md
```

---

## Troubleshooting

### "Permission denied" when pushing

If using HTTPS, GitHub may ask for credentials:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (not your GitHub password)

To create a token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `repo` (full control)
4. Copy the token and use it as your password

### "Updates were rejected"

If you get rejection errors:
```bash
git pull origin main --rebase
git push -u origin main
```

### Wrong username/email in commit

To update git configuration:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Need Help?

- **GitHub Docs:** https://docs.github.com/en/get-started
- **Git Basics:** https://git-scm.com/book/en/v2/Getting-Started-Git-Basics
- **Personal Access Tokens:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

**Your repository is ready to push! 🚀**
