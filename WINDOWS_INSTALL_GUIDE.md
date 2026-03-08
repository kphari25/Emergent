# Tatva Ayurved - Windows Installation Guide

Complete guide to install and run Tatva Ayurved Hospital Management System on Windows.

---

## 📋 Prerequisites

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18+ | https://nodejs.org/ |
| Python | 3.10+ | https://www.python.org/downloads/ |
| MongoDB | 7.0+ | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com/download/win |

---

## 🚀 Step-by-Step Installation

### Step 1: Install Required Software

#### 1.1 Install Node.js
1. Download from https://nodejs.org/ (LTS version recommended)
2. Run the installer
3. Check "Automatically install necessary tools" during installation
4. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

#### 1.2 Install Python
1. Download from https://www.python.org/downloads/
2. **IMPORTANT**: Check ✅ "Add Python to PATH" during installation
3. Verify installation:
   ```cmd
   python --version
   pip --version
   ```

#### 1.3 Install MongoDB
**Option A: Local MongoDB (Recommended for development)**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run installer, choose "Complete" installation
3. Check ✅ "Install MongoDB as a Service"
4. MongoDB Compass (GUI) will also be installed

**Option B: MongoDB Atlas (Cloud - Free)**
1. Go to https://www.mongodb.com/atlas
2. Create free account
3. Create FREE M0 cluster
4. Get connection string (we'll use this later)

#### 1.4 Install Git
1. Download from https://git-scm.com/download/win
2. Run installer with default options
3. Verify: `git --version`

#### 1.5 Install Yarn (Package Manager)
```cmd
npm install -g yarn
```

---

### Step 2: Get the Code

#### Option A: Clone from GitHub (if saved to GitHub)
```cmd
git clone https://github.com/YOUR_USERNAME/tatva-ayurved.git
cd tatva-ayurved
```

#### Option B: Copy from Emergent VS Code
1. Open VS Code view in Emergent
2. Create folder: `C:\tatva-ayurved`
3. Copy all files maintaining the folder structure

---

### Step 3: Setup Backend

Open Command Prompt (CMD) or PowerShell:

```cmd
cd C:\tatva-ayurved\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Create Backend Environment File
Create a file named `.env` in the `backend` folder with this content:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=tatva_ayurved
JWT_SECRET=your-super-secret-key-change-this-to-random-string
```

**If using MongoDB Atlas, replace MONGO_URL with your connection string:**
```env
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=tatva_ayurved
JWT_SECRET=your-super-secret-key-change-this-to-random-string
```

---

### Step 4: Setup Frontend

Open a NEW Command Prompt window:

```cmd
cd C:\tatva-ayurved\frontend

# Install dependencies
yarn install
```

#### Create Frontend Environment File
Create a file named `.env` in the `frontend` folder:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

### Step 5: Create Admin User

Before running the app, create the admin user. In the backend folder (with venv activated):

```cmd
cd C:\tatva-ayurved\backend
venv\Scripts\activate

python -c "
import bcrypt
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'tatva_ayurved')]
    
    existing = await db.users.find_one({'email': 'admin@tatva.com'})
    if existing:
        print('Admin already exists!')
        return
    
    password = 'admin1234'
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    await db.users.insert_one({
        'id': str(uuid.uuid4()),
        'email': 'admin@tatva.com',
        'name': 'Administrator',
        'password': hashed,
        'role': 'admin',
        'is_active': True
    })
    
    print('Admin user created!')
    print('Email: admin@tatva.com')
    print('Password: admin1234')
    
    client.close()

asyncio.run(create_admin())
"
```

---

### Step 6: Run the Application

You need TWO separate Command Prompt windows:

#### Terminal 1: Run Backend
```cmd
cd C:\tatva-ayurved\backend
venv\Scripts\activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

#### Terminal 2: Run Frontend
```cmd
cd C:\tatva-ayurved\frontend
yarn start
```

The browser will automatically open to http://localhost:3000

---

### Step 7: Login

Open browser and go to: **http://localhost:3000**

Login with:
- **Email**: admin@tatva.com
- **Password**: admin1234

---

## 🔧 Quick Start Scripts (Optional)

Create these batch files in `C:\tatva-ayurved` for easy startup:

#### start-backend.bat
```batch
@echo off
cd /d C:\tatva-ayurved\backend
call venv\Scripts\activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### start-frontend.bat
```batch
@echo off
cd /d C:\tatva-ayurved\frontend
yarn start
```

#### start-all.bat
```batch
@echo off
start "Backend" cmd /k "cd /d C:\tatva-ayurved\backend && venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 5
start "Frontend" cmd /k "cd /d C:\tatva-ayurved\frontend && yarn start"
```

Double-click `start-all.bat` to start both servers!

---

## 📊 Verify MongoDB is Running

### If using Local MongoDB:
1. Open Services (Win + R, type `services.msc`)
2. Find "MongoDB Server"
3. Status should be "Running"

Or check via Command Prompt:
```cmd
mongosh
```

### If using MongoDB Compass:
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. You should see the `tatva_ayurved` database after running the app

---

## 🔥 Troubleshooting

### Issue: "python is not recognized"
**Solution**: Reinstall Python and check "Add Python to PATH"

### Issue: "yarn is not recognized"
**Solution**: 
```cmd
npm install -g yarn
```
Close and reopen Command Prompt.

### Issue: MongoDB connection failed
**Solution**: 
1. Check if MongoDB service is running
2. Open Services → Find "MongoDB Server" → Start

### Issue: Port 8001 already in use
**Solution**: 
```cmd
netstat -ano | findstr :8001
taskkill /PID <PID_NUMBER> /F
```

### Issue: Port 3000 already in use
**Solution**: 
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Issue: Module not found errors (Backend)
**Solution**: 
```cmd
cd C:\tatva-ayurved\backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Issue: Module not found errors (Frontend)
**Solution**: 
```cmd
cd C:\tatva-ayurved\frontend
rd /s /q node_modules
yarn install
```

---

## 🌐 Access from Other Devices on Same Network

1. Find your PC's IP address:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. Update frontend `.env`:
   ```env
   REACT_APP_BACKEND_URL=http://192.168.1.100:8001
   ```

3. Restart frontend

4. Access from other devices: `http://192.168.1.100:3000`

---

## 📁 Project Structure

```
C:\tatva-ayurved\
├── backend\
│   ├── venv\              # Python virtual environment
│   ├── server.py          # Main API server
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Backend configuration
├── frontend\
│   ├── node_modules\      # Node dependencies
│   ├── src\               # React source code
│   ├── public\            # Static files
│   ├── package.json       # Node configuration
│   └── .env               # Frontend configuration
├── start-backend.bat      # Backend startup script
├── start-frontend.bat     # Frontend startup script
└── start-all.bat          # Start both servers
```

---

## 💾 Backup Database

### Export Database:
```cmd
mongodump --db tatva_ayurved --out C:\backups\mongodb
```

### Import Database:
```cmd
mongorestore --db tatva_ayurved C:\backups\mongodb\tatva_ayurved
```

---

## ✅ Installation Complete!

Your Tatva Ayurved system is now running on Windows!

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

**Login:**
- Email: admin@tatva.com
- Password: admin1234

---

**Need Help?**
- Check backend logs in Terminal 1
- Check browser console (F12) for frontend errors
- Verify MongoDB is running
- Ensure both terminals are running
