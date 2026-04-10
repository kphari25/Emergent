# Tatva Ayurved - Windows Server Production Deployment Guide

Complete guide to deploy, secure, and maintain Tatva Ayurved on a **Windows Server** with automated backups and disaster recovery.

---

## Table of Contents

1. [Prerequisites & Server Requirements](#1-prerequisites--server-requirements)
2. [Install Required Software](#2-install-required-software)
3. [Setup MongoDB (Atlas or Local)](#3-setup-mongodb)
4. [Deploy the Application](#4-deploy-the-application)
5. [Run as Windows Services (Auto-Start)](#5-run-as-windows-services)
6. [Setup IIS Reverse Proxy (HTTPS)](#6-setup-iis-reverse-proxy)
7. [SSL Certificate (HTTPS)](#7-ssl-certificate)
8. [Windows Firewall Configuration](#8-windows-firewall-configuration)
9. [Automated Daily Backups](#9-automated-daily-backups)
10. [Disaster Recovery](#10-disaster-recovery)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Security Hardening](#12-security-hardening)
13. [Update Procedure](#13-update-procedure)
14. [Troubleshooting](#14-troubleshooting)
15. [Quick Reference Card](#15-quick-reference-card)

---

## 1. Prerequisites & Server Requirements

### Minimum Hardware

| Spec       | Minimum       | Recommended          |
|------------|---------------|----------------------|
| CPU        | 2 cores       | 4 cores              |
| RAM        | 4 GB          | 8 GB                 |
| Storage    | 40 GB SSD     | 80 GB SSD            |
| OS         | Windows Server 2019 | Windows Server 2022 |
| Network    | Static IP     | Static IP + Domain   |

### Software to Install

| Software              | Version | Purpose                          |
|-----------------------|---------|----------------------------------|
| Node.js               | 18 LTS+ | Frontend runtime                 |
| Python                | 3.10+   | Backend runtime                  |
| MongoDB Community     | 7.0+    | Database (or use Atlas)          |
| Git                   | Latest  | Code management                  |
| NSSM                  | Latest  | Run apps as Windows Services     |
| IIS                   | Built-in| Reverse proxy + SSL              |
| MongoDB Database Tools| Latest  | Backup & restore (mongodump)     |

---

## 2. Install Required Software

Open **PowerShell as Administrator** for all commands.

### 2.1 Install Node.js

```powershell
# Download and install Node.js 18 LTS
# https://nodejs.org/en/download/
# During install: check "Automatically install necessary tools"

# Verify
node --version
npm --version

# Install Yarn globally
npm install -g yarn
```

### 2.2 Install Python

```powershell
# Download from https://www.python.org/downloads/
# IMPORTANT: Check "Add Python to PATH" during installation
# Choose "Customize installation" > Check "Install for all users"

# Verify
python --version
pip --version
```

### 2.3 Install Git

```powershell
# Download from https://git-scm.com/download/win
# Install with default options

# Verify
git --version
```

### 2.4 Install NSSM (Service Manager)

NSSM lets you run any application as a Windows Service (auto-starts on boot).

```powershell
# Download from https://nssm.cc/download
# Extract to C:\Tools\nssm

# Add to PATH
[System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools\nssm\win64", "Machine")

# Verify (open new PowerShell window)
nssm version
```

### 2.5 Install MongoDB (Choose One)

#### Option A: MongoDB Atlas (Cloud - Recommended for backups)

1. Go to https://www.mongodb.com/atlas
2. Create account > Create **FREE M0 cluster** (or M2/M5 for production: $9-25/month)
3. **Network Access**: Add your server's public IP address
4. **Database Access**: Create a database user (username + strong password)
5. Click **Connect** > **Drivers** > Copy connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Atlas provides **automatic daily backups** on M2+ clusters

#### Option B: MongoDB Local (Self-managed)

1. Download from https://www.mongodb.com/try/download/community
2. Run installer > Choose **Complete** > Check **Install as Service**
3. MongoDB will auto-start with Windows

Also install **MongoDB Database Tools** for backup commands:
- Download from https://www.mongodb.com/try/download/database-tools
- Extract to `C:\Program Files\MongoDB\Tools\`
- Add to PATH:
  ```powershell
  [System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\MongoDB\Tools\bin", "Machine")
  ```

### 2.6 Enable IIS (Built into Windows Server)

```powershell
# Install IIS with required modules
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-WebSockets
Install-WindowsFeature -Name Web-Request-Monitor

# Install URL Rewrite Module (download separately)
# https://www.iis.net/downloads/microsoft/url-rewrite

# Install Application Request Routing (ARR)
# https://www.iis.net/downloads/microsoft/application-request-routing
```

After installing ARR:
1. Open **IIS Manager** > Click server name > **Application Request Routing**
2. Click **Server Proxy Settings** > Check **Enable proxy** > Apply

---

## 3. Setup MongoDB

### If using Atlas (Recommended)

Your connection string from Step 2.5 Option A is all you need. Atlas handles:
- Automatic daily backups (M2+ tiers)
- Point-in-time recovery (M10+ tiers)
- Automatic failover
- Monitoring dashboard

### If using Local MongoDB

Verify it's running:
```powershell
# Check service status
Get-Service MongoDB

# Connect test
mongosh
# Type: show dbs
# Type: exit
```

---

## 4. Deploy the Application

### 4.1 Create Application Directory

```powershell
# Create directory
New-Item -ItemType Directory -Path "C:\TatvaAyurved" -Force
cd C:\TatvaAyurved
```

### 4.2 Get the Code

```powershell
# Option A: Clone from GitHub
git clone https://github.com/YOUR_USERNAME/tatva-ayurved.git .

# Option B: Copy from your local machine or download ZIP
# Extract/copy files maintaining the folder structure
```

### 4.3 Setup Backend

```powershell
cd C:\TatvaAyurved\backend

# Create virtual environment
python -m venv venv

# Activate
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

Create `C:\TatvaAyurved\backend\.env`:

```ini
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=tatva_ayurved
JWT_SECRET=GENERATE-A-64-CHAR-RANDOM-STRING-HERE
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

To generate a secure JWT secret:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Test the backend:
```powershell
cd C:\TatvaAyurved\backend
.\venv\Scripts\Activate.ps1
uvicorn server:app --host 127.0.0.1 --port 8001
# Should show "Application startup complete"
# Press Ctrl+C to stop
```

### 4.4 Setup Frontend

```powershell
cd C:\TatvaAyurved\frontend

# Install dependencies
yarn install
```

Create `C:\TatvaAyurved\frontend\.env`:

```ini
REACT_APP_BACKEND_URL=https://your-domain.com
```

> If no domain yet, use `http://YOUR-SERVER-IP` temporarily.

Build the production version:
```powershell
cd C:\TatvaAyurved\frontend
set CI=false
yarn build
```

The built files will be in `C:\TatvaAyurved\frontend\build\`

### 4.5 Create Admin User

```powershell
cd C:\TatvaAyurved\backend
.\venv\Scripts\Activate.ps1

python -c @"
import bcrypt, asyncio, uuid, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'tatva_ayurved')]
    existing = await db.users.find_one({'email': 'admin@tatvaayurved.com'})
    if existing:
        print('Admin already exists!')
        client.close()
        return
    password = 'TatvaAdmin@2025'
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    await db.users.insert_one({
        'id': str(uuid.uuid4()),
        'email': 'admin@tatvaayurved.com',
        'name': 'Administrator',
        'password': hashed,
        'role': 'admin',
        'is_active': True
    })
    print('Admin created!')
    print('Email: admin@tatvaayurved.com')
    print('Password: TatvaAdmin@2025')
    print('CHANGE THIS PASSWORD AFTER FIRST LOGIN!')
    client.close()

asyncio.run(create_admin())
"@
```

---

## 5. Run as Windows Services

Using NSSM, both backend and frontend will **auto-start on boot** and **auto-restart on crash**.

### 5.1 Create Backend Service

```powershell
# Install backend as a Windows Service
nssm install TatvaBackend "C:\TatvaAyurved\backend\venv\Scripts\python.exe"
nssm set TatvaBackend AppParameters "-m uvicorn server:app --host 127.0.0.1 --port 8001"
nssm set TatvaBackend AppDirectory "C:\TatvaAyurved\backend"
nssm set TatvaBackend DisplayName "Tatva Ayurved Backend"
nssm set TatvaBackend Description "Tatva Ayurved Hospital Management - FastAPI Backend"
nssm set TatvaBackend Start SERVICE_AUTO_START
nssm set TatvaBackend AppStdout "C:\TatvaAyurved\logs\backend-out.log"
nssm set TatvaBackend AppStderr "C:\TatvaAyurved\logs\backend-err.log"
nssm set TatvaBackend AppRotateFiles 1
nssm set TatvaBackend AppRotateBytes 5242880

# Create logs directory
New-Item -ItemType Directory -Path "C:\TatvaAyurved\logs" -Force

# Start the service
nssm start TatvaBackend
```

### 5.2 Verify Backend Service

```powershell
# Check service status
nssm status TatvaBackend

# Test the API
curl http://127.0.0.1:8001/api/health
# Should return: {"status":"ok"}
```

### 5.3 Service Management Commands

```powershell
# Start / Stop / Restart
nssm start TatvaBackend
nssm stop TatvaBackend
nssm restart TatvaBackend

# View logs
Get-Content C:\TatvaAyurved\logs\backend-out.log -Tail 50
Get-Content C:\TatvaAyurved\logs\backend-err.log -Tail 50

# Edit service configuration
nssm edit TatvaBackend

# Remove service (if needed)
nssm remove TatvaBackend confirm
```

---

## 6. Setup IIS Reverse Proxy

IIS serves the React frontend and proxies API requests to the backend.

### 6.1 Create IIS Site

1. Open **IIS Manager** (inetmgr)
2. Right-click **Sites** > **Add Website**
   - Site name: `TatvaAyurved`
   - Physical path: `C:\TatvaAyurved\frontend\build`
   - Port: `80` (or `443` for HTTPS)
   - Host name: `your-domain.com`
3. Click **OK**

### 6.2 Configure URL Rewrite Rules

Create `C:\TatvaAyurved\frontend\build\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>

    <!-- URL Rewrite Rules -->
    <rewrite>
      <rules>
        <!-- Proxy API requests to backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8001/api/{R:1}" />
        </rule>

        <!-- React SPA fallback - all other routes to index.html -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- Enable WebSockets (for future use) -->
    <webSocket enabled="true" />

    <!-- Security Headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>

    <!-- MIME Types for React build assets -->
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".woff" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>

  </system.webServer>
</configuration>
```

### 6.3 Test the Setup

```powershell
# Open in browser
Start-Process "http://your-domain.com"

# Or test with curl
curl http://your-domain.com/api/health
```

---

## 7. SSL Certificate (HTTPS)

### Option A: Free SSL with Win-ACME (Let's Encrypt)

```powershell
# Download win-acme from https://www.win-acme.com/
# Extract to C:\Tools\win-acme

cd C:\Tools\win-acme

# Run the certificate manager
.\wacs.exe

# Follow the prompts:
# 1. Create certificate (simple for IIS)
# 2. Select your IIS site (TatvaAyurved)
# 3. Choose domain validation method
# 4. Certificates auto-renew every 60 days
```

### Option B: Purchase SSL Certificate

1. Buy from Namecheap, Comodo, or DigiCert (~$8-15/year)
2. Generate CSR in IIS Manager > Server Certificates
3. Install the certificate
4. Bind to your site on port 443

### Force HTTPS Redirect

Add this rule to your `web.config` inside the `<rules>` section (before other rules):

```xml
<rule name="HTTPS Redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

---

## 8. Windows Firewall Configuration

```powershell
# Allow HTTP (port 80)
New-NetFirewallRule -DisplayName "Tatva HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS (port 443)
New-NetFirewallRule -DisplayName "Tatva HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# BLOCK direct access to backend port (only accessible via IIS proxy)
New-NetFirewallRule -DisplayName "Block Direct Backend" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Block -RemoteAddress Any
# Allow localhost access to backend
New-NetFirewallRule -DisplayName "Backend Localhost" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -RemoteAddress 127.0.0.1

# If using local MongoDB, block external access
New-NetFirewallRule -DisplayName "Block External MongoDB" -Direction Inbound -Protocol TCP -LocalPort 27017 -Action Block -RemoteAddress Any
New-NetFirewallRule -DisplayName "MongoDB Localhost" -Direction Inbound -Protocol TCP -LocalPort 27017 -Action Allow -RemoteAddress 127.0.0.1
```

---

## 9. Automated Daily Backups

### 9.1 Create Backup Script

Create `C:\TatvaAyurved\scripts\backup.ps1`:

```powershell
# ============================================================
# Tatva Ayurved - Automated Backup Script
# Run daily via Windows Task Scheduler
# ============================================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupRoot = "C:\TatvaAyurved\backups"
$backupDir = "$backupRoot\$timestamp"
$logFile = "C:\TatvaAyurved\logs\backup.log"
$retainDays = 30  # Keep backups for 30 days

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

function Log($msg) {
    $entry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg"
    Add-Content -Path $logFile -Value $entry
    Write-Host $entry
}

Log "=== Backup started ==="

# ---- 1. Database Backup ----
try {
    Log "Backing up MongoDB database..."

    # Load .env to get MONGO_URL
    $envContent = Get-Content "C:\TatvaAyurved\backend\.env" -Raw
    $mongoUrl = ($envContent | Select-String 'MONGO_URL=(.+)').Matches.Groups[1].Value.Trim('"')
    $dbName = "tatva_ayurved"

    # For Atlas: use mongodump with connection string
    # For Local: use mongodump --db tatva_ayurved
    mongodump --uri="$mongoUrl" --db=$dbName --out="$backupDir\mongodb" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Log "MongoDB backup SUCCESS -> $backupDir\mongodb"
    } else {
        Log "WARNING: mongodump exited with code $LASTEXITCODE"
    }
} catch {
    Log "ERROR: MongoDB backup failed - $_"
}

# ---- 2. Application Code Backup ----
try {
    Log "Backing up application code..."
    Copy-Item -Path "C:\TatvaAyurved\backend\server.py" -Destination "$backupDir\" -Force
    Copy-Item -Path "C:\TatvaAyurved\backend\.env" -Destination "$backupDir\backend.env" -Force
    Copy-Item -Path "C:\TatvaAyurved\frontend\.env" -Destination "$backupDir\frontend.env" -Force
    Copy-Item -Path "C:\TatvaAyurved\backend\requirements.txt" -Destination "$backupDir\" -Force
    Log "Code backup SUCCESS"
} catch {
    Log "ERROR: Code backup failed - $_"
}

# ---- 3. Compress Backup ----
try {
    Log "Compressing backup..."
    $zipPath = "$backupRoot\tatva-backup-$timestamp.zip"
    Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -Force
    Remove-Item -Recurse -Force $backupDir
    $sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Log "Compressed backup: $zipPath ($sizeMB MB)"
} catch {
    Log "ERROR: Compression failed - $_"
}

# ---- 4. Cleanup Old Backups ----
try {
    Log "Cleaning up backups older than $retainDays days..."
    $cutoff = (Get-Date).AddDays(-$retainDays)
    $old = Get-ChildItem "$backupRoot\*.zip" | Where-Object { $_.LastWriteTime -lt $cutoff }
    $oldCount = ($old | Measure-Object).Count
    $old | Remove-Item -Force
    Log "Removed $oldCount old backup(s)"
} catch {
    Log "ERROR: Cleanup failed - $_"
}

Log "=== Backup completed ==="
```

### 9.2 Create Backup Directories

```powershell
New-Item -ItemType Directory -Path "C:\TatvaAyurved\backups" -Force
New-Item -ItemType Directory -Path "C:\TatvaAyurved\scripts" -Force
```

### 9.3 Schedule Daily Backup with Task Scheduler

```powershell
# Create a scheduled task to run backup daily at 2:00 AM
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File C:\TatvaAyurved\scripts\backup.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
    -TaskName "TatvaAyurved-DailyBackup" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Description "Daily backup of Tatva Ayurved database and configuration"

# Verify
Get-ScheduledTask -TaskName "TatvaAyurved-DailyBackup"
```

### 9.4 Test Backup Manually

```powershell
powershell -ExecutionPolicy Bypass -File C:\TatvaAyurved\scripts\backup.ps1
```

### 9.5 Optional: Copy Backups to External Location

Add this to the end of `backup.ps1` to copy backups to a network drive or cloud:

```powershell
# ---- 5. Copy to network drive (optional) ----
# Copy-Item $zipPath -Destination "\\NAS-SERVER\Backups\TatvaAyurved\" -Force

# ---- 5. Copy to Google Drive / OneDrive (if synced folder) ----
# Copy-Item $zipPath -Destination "C:\Users\Admin\OneDrive\TatvaBackups\" -Force
```

---

## 10. Disaster Recovery

### Recovery Scenarios

#### Scenario 1: Application Crash (5 minutes)

```powershell
# Restart the backend service
nssm restart TatvaBackend

# Check logs for the error
Get-Content C:\TatvaAyurved\logs\backend-err.log -Tail 100
```

#### Scenario 2: Server Reboot (Automatic)

Services auto-start because NSSM is configured with `SERVICE_AUTO_START`. No action needed.

#### Scenario 3: Code Corruption (15 minutes)

```powershell
# Stop service
nssm stop TatvaBackend

# Re-deploy from Git
cd C:\TatvaAyurved
git fetch origin
git reset --hard origin/main

# Reinstall dependencies
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ..\frontend
yarn install
set CI=false
yarn build

# Restart
nssm start TatvaBackend
```

#### Scenario 4: Database Corruption (20 minutes)

```powershell
# Find latest backup
Get-ChildItem C:\TatvaAyurved\backups\*.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 5

# Extract latest backup
$latestZip = (Get-ChildItem C:\TatvaAyurved\backups\*.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Expand-Archive -Path $latestZip -DestinationPath "C:\TatvaAyurved\backups\restore-temp" -Force

# Restore MongoDB
# For Atlas:
mongorestore --uri="YOUR_MONGO_URL" --db=tatva_ayurved --drop "C:\TatvaAyurved\backups\restore-temp\mongodb\tatva_ayurved"

# For Local MongoDB:
mongorestore --db=tatva_ayurved --drop "C:\TatvaAyurved\backups\restore-temp\mongodb\tatva_ayurved"

# Cleanup temp
Remove-Item -Recurse -Force "C:\TatvaAyurved\backups\restore-temp"

# Restart backend
nssm restart TatvaBackend
```

#### Scenario 5: Complete Server Failure - Fresh Rebuild (45 minutes)

On a new Windows Server:

```
1. Install software           (Step 2)     ~15 min
2. Clone code from GitHub     (Step 4.2)   ~2 min
3. Setup backend + frontend   (Step 4.3-4) ~10 min
4. Restore database backup    (Scenario 4) ~5 min
5. Setup NSSM service         (Step 5)     ~5 min
6. Setup IIS                  (Step 6)     ~5 min
7. Restore SSL certificate    (Step 7)     ~3 min
```

Total recovery time: **~45 minutes** from a fresh server.

---

## 11. Monitoring & Maintenance

### 11.1 Health Check Script

Create `C:\TatvaAyurved\scripts\healthcheck.ps1`:

```powershell
# Quick health check script
$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n=== Tatva Ayurved Health Check ===" -ForegroundColor Cyan
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

# Check Backend Service
$svc = nssm status TatvaBackend 2>$null
if ($svc -match "Running") {
    Write-Host "[OK] Backend Service: Running" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Backend Service: $svc" -ForegroundColor Red
}

# Check API Health
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 5
    if ($response.status -eq "ok") {
        Write-Host "[OK] API Health: Responding" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] API Health: Not responding" -ForegroundColor Red
}

# Check IIS
$iis = Get-Service W3SVC -ErrorAction SilentlyContinue
if ($iis.Status -eq "Running") {
    Write-Host "[OK] IIS: Running" -ForegroundColor Green
} else {
    Write-Host "[FAIL] IIS: Not running" -ForegroundColor Red
}

# Check MongoDB (if local)
$mongo = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($mongo) {
    if ($mongo.Status -eq "Running") {
        Write-Host "[OK] MongoDB: Running" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] MongoDB: Not running" -ForegroundColor Red
    }
} else {
    Write-Host "[INFO] MongoDB: Using Atlas (external)" -ForegroundColor Yellow
}

# Check Disk Space
$disk = Get-PSDrive C
$freeGB = [math]::Round($disk.Free / 1GB, 2)
if ($freeGB -gt 10) {
    Write-Host "[OK] Disk Space: ${freeGB} GB free" -ForegroundColor Green
} else {
    Write-Host "[WARN] Disk Space: ${freeGB} GB free (LOW!)" -ForegroundColor Yellow
}

# Check Last Backup
$lastBackup = Get-ChildItem C:\TatvaAyurved\backups\*.zip -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($lastBackup) {
    $age = (Get-Date) - $lastBackup.LastWriteTime
    if ($age.TotalHours -lt 26) {
        Write-Host "[OK] Last Backup: $($lastBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) ($([math]::Round($age.TotalHours,1))h ago)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Last Backup: $($lastBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) ($([math]::Round($age.TotalDays,1)) days ago!)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] Last Backup: No backups found" -ForegroundColor Yellow
}

# Log sizes
$logSize = (Get-ChildItem C:\TatvaAyurved\logs\ -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "`n[INFO] Log files total: $([math]::Round($logSize, 2)) MB" -ForegroundColor Gray

Write-Host "`n=== Health Check Complete ===`n" -ForegroundColor Cyan
```

Run anytime:
```powershell
powershell -ExecutionPolicy Bypass -File C:\TatvaAyurved\scripts\healthcheck.ps1
```

### 11.2 Log Rotation

NSSM handles log rotation automatically (configured with `AppRotateFiles` and `AppRotateBytes` in Step 5). Logs rotate at 5MB.

### 11.3 Schedule Weekly Health Check Email (Optional)

Schedule the health check to run weekly and email results using Task Scheduler (same method as backup task).

---

## 12. Security Hardening

### 12.1 Change Default Ports (Optional)

Edit IIS to use a non-standard port if needed, or keep 80/443 for standard HTTP/HTTPS.

### 12.2 Secure Environment Files

```powershell
# Restrict .env file access to Administrators only
$acl = Get-Acl "C:\TatvaAyurved\backend\.env"
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "Allow")
$acl.AddAccessRule($rule)
$rule2 = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "Allow")
$acl.AddAccessRule($rule2)
Set-Acl "C:\TatvaAyurved\backend\.env" $acl
```

### 12.3 Enable Windows Updates

```powershell
# Ensure Windows Update is enabled
Set-Service wuauserv -StartupType Automatic
Start-Service wuauserv
```

### 12.4 Strong JWT Secret

```powershell
# Generate a cryptographically strong secret
python -c "import secrets; print(secrets.token_hex(32))"
# Copy output to backend\.env JWT_SECRET value
```

### 12.5 Restrict CORS in Production

In `backend\.env`, replace wildcard with your actual domain:
```ini
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

---

## 13. Update Procedure

When you have a new version of the application:

```powershell
# 1. Take a backup first
powershell -ExecutionPolicy Bypass -File C:\TatvaAyurved\scripts\backup.ps1

# 2. Stop the backend
nssm stop TatvaBackend

# 3. Update code
cd C:\TatvaAyurved
git pull origin main

# 4. Update backend dependencies
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 5. Rebuild frontend
cd ..\frontend
yarn install
set CI=false
yarn build

# 6. Copy web.config back (yarn build may overwrite it)
# Make sure C:\TatvaAyurved\frontend\build\web.config exists

# 7. Restart backend
nssm start TatvaBackend

# 8. Verify
curl http://127.0.0.1:8001/api/health
Start-Process "https://your-domain.com"
```

---

## 14. Troubleshooting

### Backend won't start

```powershell
# Check service status
nssm status TatvaBackend

# Check error logs
Get-Content C:\TatvaAyurved\logs\backend-err.log -Tail 50

# Test manually
cd C:\TatvaAyurved\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn server:app --host 127.0.0.1 --port 8001
```

### IIS returns 502 Bad Gateway

```powershell
# Backend not running - restart it
nssm restart TatvaBackend

# Wait 5 seconds then test
Start-Sleep -Seconds 5
curl http://127.0.0.1:8001/api/health
```

### IIS returns 500 Internal Server Error

1. Check `web.config` syntax is valid XML
2. Ensure URL Rewrite and ARR modules are installed
3. Ensure ARR proxy is enabled in IIS Manager

### Frontend shows blank page

```powershell
# Rebuild frontend
cd C:\TatvaAyurved\frontend
set CI=false
yarn build

# Verify build\index.html exists
Test-Path C:\TatvaAyurved\frontend\build\index.html
```

### MongoDB connection timeout

```powershell
# Test connection
cd C:\TatvaAyurved\backend
.\venv\Scripts\Activate.ps1
python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import os, asyncio
from dotenv import load_dotenv
load_dotenv()
async def test():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'], serverSelectionTimeoutMS=5000)
    dbs = await client.list_database_names()
    print('Connected! Databases:', dbs)
    client.close()
asyncio.run(test())
"
```

### Port already in use

```powershell
# Find process using port 8001
netstat -ano | findstr :8001
# Kill it
taskkill /PID <PID> /F
```

---

## 15. Quick Reference Card

Save this for daily use:

```
=== TATVA AYURVED - QUICK REFERENCE ===

URLS:
  Website:   https://your-domain.com
  API:       https://your-domain.com/api/health
  API Docs:  https://your-domain.com/api/docs
  Login:     admin@tatvaayurved.com / TatvaAdmin@2025

SERVICES:
  Start:     nssm start TatvaBackend
  Stop:      nssm stop TatvaBackend
  Restart:   nssm restart TatvaBackend
  Status:    nssm status TatvaBackend

LOGS:
  Backend:   C:\TatvaAyurved\logs\backend-err.log
  Backup:    C:\TatvaAyurved\logs\backup.log
  IIS:       C:\inetpub\logs\LogFiles\

BACKUPS:
  Manual:    powershell -File C:\TatvaAyurved\scripts\backup.ps1
  Location:  C:\TatvaAyurved\backups\
  Auto:      Daily at 2:00 AM (Task Scheduler)

HEALTH:
  Check:     powershell -File C:\TatvaAyurved\scripts\healthcheck.ps1

RESTORE DB:
  mongorestore --uri="MONGO_URL" --db=tatva_ayurved --drop "backup\mongodb\tatva_ayurved"

UPDATE:
  1. backup.ps1 -> 2. nssm stop -> 3. git pull -> 4. pip install -> 5. yarn build -> 6. nssm start
```

---

## Cost Summary

| Component          | Free Option              | Paid Option          |
|--------------------|--------------------------|----------------------|
| Windows Server     | Your existing hardware   | Azure $15/mo (B1s)  |
| MongoDB            | Atlas M0 (512MB free)    | Atlas M2 ($9/mo)    |
| SSL Certificate    | Win-ACME (Let's Encrypt) | $0 (free)            |
| Domain             | -                        | $10/year             |
| Backups            | Local + OneDrive sync    | $0                   |
| **Total**          | **$0/month** (own server)| **~$25/month** (cloud)|

---

**Your Tatva Ayurved hospital management system is now production-ready on Windows Server!**
