# Tatva Ayurved - Vercel + Cloud Deployment Guide

Complete guide to deploy Tatva Ayurved with **Vercel** (frontend), **Render/Railway** (backend), and **MongoDB Atlas** (database on Google Cloud).

---

## Architecture Overview

```
[Users Browser]
       |
       v
[Vercel - Frontend]  (Free - React app)
       |
       v (API calls)
[Render - Backend]   (Free - FastAPI server)
       |
       v
[MongoDB Atlas]      (Free - Database on Google Cloud)
```

**Estimated Cost: $0/month** (all free tiers)

---

## PART 1: Download Source Code

### Method 1: From Emergent Platform (Recommended)

1. In the Emergent chat, look for **"Save to GitHub"** button in the chat input area
2. Connect your GitHub account and push the code to a new repository
3. Clone it to your laptop:
   ```cmd
   git clone https://github.com/YOUR_USERNAME/tatva-ayurved.git
   cd tatva-ayurved
   ```

### Method 2: Download as ZIP

1. In Emergent, open the **VS Code** view (code editor)
2. Select all files in the file explorer
3. Right-click > Download
4. Extract to a folder on your laptop, e.g., `C:\tatva-ayurved`

### Method 3: Using SCP (if you have SSH access)

```cmd
scp -r root@preview-server:/app/* C:\tatva-ayurved\
```

---

## PART 2: Setup MongoDB Atlas (Free Database)

This replaces Firebase. MongoDB Atlas runs on **Google Cloud** and is 100% compatible with your app — zero code changes needed.

### Step 1: Create Atlas Account

1. Go to https://www.mongodb.com/atlas
2. Click **"Try Free"** > Create account (or sign in with Google)

### Step 2: Create Free Cluster

1. Click **"Build a Database"**
2. Select **M0 FREE** tier
3. Choose **Google Cloud** as provider
4. Select region closest to you (e.g., **Mumbai** for India)
5. Cluster name: `tatva-ayurved`
6. Click **"Create Deployment"**

### Step 3: Setup Database Access

1. Go to **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
   - Authentication: Password
   - Username: `tatva_admin`
   - Password: Generate a strong password (SAVE THIS!)
   - Role: **Atlas Admin**
3. Click **"Add User"**

### Step 4: Setup Network Access

1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is needed for Render/Railway to connect
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Go to **"Database"** > Click **"Connect"** on your cluster
2. Select **"Drivers"**
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://tatva_admin:YOUR_PASSWORD@tatva-ayurved.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `YOUR_PASSWORD` with the actual password you created
5. **Save this string** — you'll need it for the backend

### Step 6: Verify Atlas Features (Free Tier Includes)

- 512 MB storage (plenty for a hospital system)
- Automatic daily backups (retained for 7 days)
- Monitoring dashboard
- Runs on Google Cloud infrastructure

---

## PART 3: Deploy Backend on Render (Free)

Render provides free hosting for Python web services.

### Step 1: Prepare Backend for Render

In your local code, create a file `backend/render.yaml`:

```yaml
services:
  - type: web
    name: tatva-backend
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGO_URL
        sync: false
      - key: DB_NAME
        value: tatva_ayurved
      - key: JWT_SECRET
        sync: false
      - key: CORS_ORIGINS
        sync: false
```

### Step 2: Push to GitHub

Make sure your code is on GitHub:

```cmd
cd C:\tatva-ayurved
git init
git add .
git commit -m "Initial commit - Tatva Ayurved"
git remote add origin https://github.com/YOUR_USERNAME/tatva-ayurved.git
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to https://render.com > Sign up (use GitHub)
2. Click **"New +"** > **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `tatva-ayurved-api`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
5. Click **"Advanced"** > **"Add Environment Variable"**:

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | `mongodb+srv://tatva_admin:PASSWORD@tatva-ayurved.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
   | `DB_NAME` | `tatva_ayurved` |
   | `JWT_SECRET` | (generate: `python -c "import secrets; print(secrets.token_hex(32))"`) |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` (update after Vercel deploy) |

6. Click **"Create Web Service"**
7. Wait for build to complete (~3-5 minutes)
8. Note your backend URL: `https://tatva-ayurved-api.onrender.com`

### Step 4: Verify Backend

Open in browser: `https://tatva-ayurved-api.onrender.com/api/health`
Should return: `{"status": "ok"}`

### Alternative: Deploy on Railway (Free $5/month credit)

1. Go to https://railway.app > Sign up with GitHub
2. Click **"New Project"** > **"Deploy from GitHub"**
3. Select your repo
4. Set root directory to `backend`
5. Add environment variables (same as Render)
6. Railway auto-detects Python and deploys
7. Note your URL: `https://tatva-ayurved-api.up.railway.app`

---

## PART 4: Deploy Frontend on Vercel (Free)

### Step 1: Prepare Frontend

Update `frontend/.env.production` (create this file):

```env
REACT_APP_BACKEND_URL=https://tatva-ayurved-api.onrender.com
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com > Sign up with GitHub
2. Click **"Add New..."** > **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build` (or `CI=false yarn build`)
   - **Output Directory**: `build`
5. Click **"Environment Variables"** and add:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_BACKEND_URL` | `https://tatva-ayurved-api.onrender.com` |
   | `CI` | `false` |

6. Click **"Deploy"**
7. Wait ~2-3 minutes
8. Your site is live at: `https://your-app.vercel.app`

### Step 3: Update CORS on Backend

Now that you have the Vercel URL, go back to Render/Railway and update:
```
CORS_ORIGINS=https://your-app.vercel.app
```

### Step 4: Custom Domain on Vercel (Optional)

1. In Vercel dashboard > Your project > **Settings** > **Domains**
2. Add your domain (e.g., `app.tatvaayurved.com`)
3. Update DNS records as shown by Vercel
4. SSL is automatic and free

---

## PART 5: Create Admin User

After both services are deployed, create the admin user.

### Option A: Using curl

```cmd
REM First, run this Python script locally to create admin
cd C:\tatva-ayurved\backend

REM Create virtual environment (if not already done)
python -m venv venv
venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt

REM Set environment variable to your Atlas connection
set MONGO_URL=mongodb+srv://tatva_admin:PASSWORD@tatva-ayurved.xxxxx.mongodb.net/?retryWrites=true&w=majority
set DB_NAME=tatva_ayurved

python -c "import bcrypt,asyncio,uuid,os;from motor.motor_asyncio import AsyncIOMotorClient;client=AsyncIOMotorClient(os.environ['MONGO_URL']);db=client[os.environ['DB_NAME']];asyncio.run(db.users.insert_one({'id':str(uuid.uuid4()),'email':'admin@tatvaayurved.com','name':'Administrator','password':bcrypt.hashpw('TatvaAdmin@2025'.encode(),bcrypt.gensalt()).decode(),'role':'admin','is_active':True}));print('Admin created! Email: admin@tatvaayurved.com Password: TatvaAdmin@2025')"
```

### Option B: Using MongoDB Atlas UI

1. Go to MongoDB Atlas > Browse Collections
2. Select `tatva_ayurved` database > `users` collection
3. Click **"Insert Document"**
4. You'll need to generate the bcrypt hash locally first

---

## PART 6: Verify Everything Works

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Login with: `admin@tatvaayurved.com` / `TatvaAdmin@2025`
3. Test these features:
   - Dashboard loads with stats
   - Patients page: Add a test patient
   - Therapies page: Create a therapy type
   - Billing page: Create a test bill with GST
   - WhatsApp buttons appear on patient details

---

## PART 7: Ongoing Maintenance

### Update Code

```cmd
REM Make changes locally, then:
git add .
git commit -m "description of changes"
git push origin main

REM Vercel auto-deploys on push
REM Render auto-deploys on push
```

### Database Backups

MongoDB Atlas Free tier includes automated daily backups (7-day retention).

To create manual backup:
1. Atlas > Your Cluster > **"..."** menu > **"Back Up"**
2. Or use `mongodump` locally:
   ```cmd
   mongodump --uri="mongodb+srv://tatva_admin:PASSWORD@tatva-ayurved.xxxxx.mongodb.net" --db=tatva_ayurved --out=C:\backups
   ```

### Monitor

- **Vercel**: Dashboard shows deployment status, logs, analytics
- **Render**: Dashboard shows service health, logs, metrics
- **Atlas**: Shows database metrics, slow queries, alerts

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Frontend) | Hobby (Free) | $0/month |
| Render (Backend) | Free | $0/month |
| MongoDB Atlas (Database) | M0 Free | $0/month |
| Custom Domain | Optional | $10/year |
| SSL | Automatic (Vercel + Render) | $0 |
| **Total** | | **$0/month** |

### Free Tier Limits

| Service | Limit | Enough? |
|---------|-------|---------|
| Vercel | 100GB bandwidth/month | Yes (for small hospital) |
| Render | Spins down after 15min inactivity, 750 hrs/month | Yes (slight cold start delay) |
| MongoDB Atlas | 512MB storage | Yes (stores ~50,000 patient records) |

### If You Need More (Paid Upgrades)

| Service | Paid Plan | Cost |
|---------|-----------|------|
| Vercel Pro | No limits | $20/month |
| Render Starter | Always on, no cold starts | $7/month |
| MongoDB Atlas M2 | 2GB, better backups | $9/month |
| **Total Paid** | | **$36/month** |

---

## Troubleshooting

### Frontend shows "Network Error"
- Check `REACT_APP_BACKEND_URL` in Vercel env vars
- Make sure it includes `https://` and NO trailing slash
- Redeploy after changing env vars

### Backend returns CORS error
- Update `CORS_ORIGINS` in Render to include your Vercel URL
- Include both `https://your-app.vercel.app` and custom domain if any

### Render cold start (first request is slow)
- Free tier spins down after 15 min of inactivity
- First request takes ~30-60 seconds to wake up
- Upgrade to $7/month Starter plan to keep always-on

### MongoDB connection timeout
- Check Atlas Network Access allows `0.0.0.0/0`
- Verify password doesn't contain special characters that need URL encoding
- Test connection string locally first

---

## Quick Reference

```
FRONTEND (Vercel):  https://your-app.vercel.app
BACKEND (Render):   https://tatva-ayurved-api.onrender.com
DATABASE (Atlas):   MongoDB Atlas Dashboard > cloud.mongodb.com
API DOCS:           https://tatva-ayurved-api.onrender.com/docs

LOGIN:
  Email:    admin@tatvaayurved.com
  Password: TatvaAdmin@2025
```

---

**Your Tatva Ayurved system is now deployed on free cloud infrastructure!**
