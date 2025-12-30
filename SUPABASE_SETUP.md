# Supabase Setup Guide for Team CRM

This guide will help you set up your Team CRM backend on Supabase.

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in details:
   - **Name:** Team CRM
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Select closest to your users
   - **Pricing Plan:** Free tier is fine for development
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

---

## Step 2: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (in left sidebar)
2. Click **"New Query"**
3. Open the `supabase_schema.sql` file from your project
4. Copy ALL the SQL content
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see: ✅ "Success. No rows returned"

This will create:
- ✅ All 14 database tables
- ✅ All indexes for performance
- ✅ 3 default roles (super_admin, manager, employee)

---

## Step 3: Get Database Connection Details

1. Go to **Settings** → **Database** (in left sidebar)
2. Find the **Connection String** section
3. You'll need these values:

```
Host: db.xxxxxxxxxxxxx.supabase.co
Database name: postgres
Port: 5432
User: postgres
Password: [your database password]
```

**Connection String (for your backend .env):**
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## Step 4: Update Backend Configuration

1. Open `backend/.env` (or create it from `.env.example`)
2. Update these values:

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Or individual values:
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password

# JWT Secret (generate a new one)
JWT_SECRET=your_new_secret_key_here_32_chars_minimum

# Office Location (GPS Validation)
LAB_LATITUDE=28.544396761789827
LAB_LONGITUDE=77.19271651688473
LAB_RADIUS_METERS=200

# App Configuration
DEBUG=false
API_V1_PREFIX=/api/v1
```

---

## Step 5: Create Admin User

You need to create an admin user to access the system. Since Supabase doesn't have the seed script, you'll need to create the user manually.

### Option A: Using Supabase SQL Editor

1. Go to **SQL Editor**
2. Run this query to create an admin user:

```sql
-- First, get the super_admin role ID
DO $$
DECLARE
    admin_role_id UUID;
    new_user_id UUID;
BEGIN
    -- Get the super_admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Create admin user
    -- Password hash for: admin123
    -- You should change this immediately after first login!
    INSERT INTO users (id, email, password_hash, full_name, role_id, is_active)
    VALUES (
        uuid_generate_v4(),
        'admin@example.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MV3xHu',
        'System Administrator',
        admin_role_id,
        true
    )
    RETURNING id INTO new_user_id;
    
    RAISE NOTICE 'Admin user created with ID: %', new_user_id;
END $$;
```

**Default credentials:**
- Email: admin@example.com  
- Password: admin123

⚠️ **IMPORTANT:** Change this password immediately after first login!

### Option B: Using Your Backend API

1. Deploy your backend (see below)
2. Use the seed.py script or create user via API

---

## Step 6: Deploy Backend

### Option A: Deploy Backend on Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `team-crm-software` repository
5. Railway will auto-detect it's a Python app
6. Add environment variables:
   - Click on your service → **Variables**
   - Add all variables from Step 4
7. Set start command (if not auto-detected):
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
8. Deploy!

Get your backend URL: `https://your-app.railway.app`

### Option B: Deploy Backend on Render

1. Go to https://render.com
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name:** team-crm-backend
   - **Root Directory:** backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (from Step 4)
6. Click **"Create Web Service"**

Get your backend URL: `https://team-crm-backend.onrender.com`

---

## Step 7: Deploy Frontend on Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** web-crm
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
5. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api/v1
   ```
   (Use your Railway or Render backend URL from Step 6)
6. Click **"Deploy"**

Your frontend will be live at: `https://your-app.vercel.app`

---

## Step 8: Test Your Deployment

1. Open your Vercel frontend URL
2. You should see the login page
3. Login with:
   - Email: admin@example.com
   - Password: admin123
4. ✅ You should see the dashboard!

---

## Verify Database Tables

In Supabase, go to **Table Editor** and you should see:

- ✅ attendance
- ✅ boards
- ✅ inventory_categories
- ✅ inventory_items
- ✅ inventory_transactions
- ✅ project_members
- ✅ projects
- ✅ roles
- ✅ task_comments
- ✅ tasks
- ✅ timesheets
- ✅ users

---

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the entire `supabase_schema.sql` file
- Check in Table Editor if all tables exist

### "authentication failed" error
- Verify your DATABASE_URL is correct
- Check your Supabase database password
- Make sure you're using the postgres user

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings in backend (backend/app/main.py)
- Make sure backend is running and accessible

### Can't login with admin credentials
- Make sure the admin user was created (check users table in Supabase)
- Password hash might be wrong - create a new user via SQL

---

## Cost Estimate

**Free Tier Limits:**
- Supabase: 500MB database, 2GB bandwidth/month
- Vercel: 100GB bandwidth/month, unlimited deployments
- Railway: $5 free credits/month (backend might sleep after inactivity)
- Render: Free tier (might sleep after inactivity)

**Recommended for Production:**
- Supabase Pro: $25/month (8GB database, better performance)
- Railway Pro: ~$5-10/month (always-on backend)
- Vercel Pro: $20/month (if you need more bandwidth)

**Total estimated cost for small team:** $30-55/month

---

## Next Steps

1. ✅ Change admin password
2. ✅ Create user accounts for your team
3. ✅ Test all features (attendance, timesheets, projects, inventory)
4. ✅ Configure GPS coordinates for your office
5. ✅ Set up regular database backups (Supabase has automatic backups on Pro plan)
6. ✅ Add custom domain (optional)

---

**Your Team CRM is now running on Supabase + Vercel/Railway! 🎉**
