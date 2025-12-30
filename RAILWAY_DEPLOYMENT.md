# Railway Deployment Guide

## Backend Deployment on Railway

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Click **"Login"** or **"Start a New Project"**
3. Sign in with **GitHub** (recommended)
4. Authorize Railway to access your GitHub repositories

---

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select: **`ehshankhan/team-crm-software`**
4. Railway will start analyzing your repository

---

### Step 3: Configure Backend Service

Railway might auto-detect the project structure. You need to:

1. **If it creates multiple services:**
   - Delete the frontend service (we'll deploy that on Vercel)
   - Keep only the backend service

2. **If it creates one service:**
   - Click on the service
   - Go to **Settings**

3. **Set Root Directory:**
   - Scroll to **"Service Settings"**
   - Find **"Root Directory"**
   - Set it to: `backend`
   - Click **"Update"**

---

### Step 4: Add Environment Variables

1. Click on your backend service
2. Click **"Variables"** tab
3. Click **"Raw Editor"** (top right)
4. Paste ALL the content from your `backend/.env` file:

```bash
DATABASE_URL=postgresql://postgres:8286860551e@db.guiioblakfaidkhgrzqh.supabase.co:5432/postgres

JWT_SECRET=726edc82fd9cfdfb319d7e10650b347568c6d97fd507f16bd4e4627ee265cc9a
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

LAB_LATITUDE=28.544396761789827
LAB_LONGITUDE=77.19271651688473
LAB_RADIUS_METERS=200

DEBUG=false
API_V1_PREFIX=/api/v1

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

5. Click **"Update Variables"**

**IMPORTANT:** Change `DEBUG=false` for production!

---

### Step 5: Configure Start Command

Railway should auto-detect Python and install dependencies from `requirements.txt`.

If the deployment fails, manually set:

1. Go to **Settings** tab
2. Scroll to **"Deploy"** section
3. **Build Command:** (leave empty, Railway auto-detects)
4. **Start Command:**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Click **"Update"**

---

### Step 6: Deploy!

1. Railway will automatically start deploying
2. Wait for the build to complete (2-5 minutes)
3. Look for ✅ **"Success"** status

---

### Step 7: Get Your Backend URL

1. Click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"**
5. Railway will give you a URL like:
   ```
   https://team-crm-backend-production-xxxx.up.railway.app
   ```
6. **Copy this URL** - you'll need it for the frontend!

---

### Step 8: Test Your Backend

1. Open your Railway backend URL in a browser:
   ```
   https://your-app.railway.app
   ```
2. You should see:
   ```json
   {
     "message": "Team Management CRM API",
     "version": "1.0.0",
     "docs": "/docs"
   }
   ```

3. Test the API docs:
   ```
   https://your-app.railway.app/docs
   ```
   You should see the FastAPI Swagger documentation!

---

### Step 9: Update CORS Origins

After you get your frontend URL from Vercel, update CORS:

1. Go to Railway → Variables
2. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
   ```
3. The service will auto-redeploy

---

## Troubleshooting

### Build Failed

**Check logs:**
1. Click on your service
2. Click **"Deployments"** tab
3. Click on the failed deployment
4. Read the error logs

**Common issues:**
- Missing `requirements.txt` - make sure Root Directory is `backend`
- Python version - Railway uses Python 3.11 by default (which is fine)

### App Crashes After Deploy

**Check runtime logs:**
1. Click on your service
2. Click **"View Logs"**
3. Look for errors

**Common issues:**
- Database connection error - verify DATABASE_URL is correct
- Missing environment variables - check Variables tab
- Port binding - make sure you're using `--port $PORT`

### Database Connection Timeout

- Supabase connection string might be wrong
- Check if you're using the **pooler** connection string (ends with :6543)
- Verify database password is correct

---

## Cost

**Railway Free Plan:**
- $5 in free credits per month
- Enough for development and small production use
- App might sleep after inactivity on free plan

**Railway Pro Plan:**
- $20/month
- More resources
- No sleeping
- Better for production

---

## Next: Deploy Frontend on Vercel

Once your backend is deployed and working, proceed to deploy the frontend on Vercel!

See: `VERCEL_DEPLOYMENT.md`
