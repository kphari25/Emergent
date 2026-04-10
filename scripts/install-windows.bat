@echo off
REM ============================================================
REM Tatva Ayurved - One-Click Installer for Windows Server
REM Run as Administrator
REM ============================================================

echo ============================================
echo  Tatva Ayurved - Windows Server Setup
echo ============================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/7] Creating directories...
mkdir C:\TatvaAyurved\logs 2>nul
mkdir C:\TatvaAyurved\backups 2>nul
mkdir C:\TatvaAyurved\scripts 2>nul
echo Done.

echo.
echo [2/7] Setting up Backend...
cd /d C:\TatvaAyurved\backend
python -m venv venv
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
echo Done.

echo.
echo [3/7] Setting up Frontend...
cd /d C:\TatvaAyurved\frontend
call yarn install
set CI=false
call yarn build
echo Done.

echo.
echo [4/7] Copying scripts...
copy /Y C:\TatvaAyurved\scripts\backup.ps1 C:\TatvaAyurved\scripts\ 2>nul
copy /Y C:\TatvaAyurved\scripts\healthcheck.ps1 C:\TatvaAyurved\scripts\ 2>nul
echo Done.

echo.
echo [5/7] Installing Backend as Windows Service...
where nssm >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: NSSM not found. Please install NSSM first.
    echo Download from https://nssm.cc/download
    echo Then re-run this script.
) else (
    nssm install TatvaBackend "C:\TatvaAyurved\backend\venv\Scripts\python.exe" 2>nul
    nssm set TatvaBackend AppParameters "-m uvicorn server:app --host 127.0.0.1 --port 8001"
    nssm set TatvaBackend AppDirectory "C:\TatvaAyurved\backend"
    nssm set TatvaBackend DisplayName "Tatva Ayurved Backend"
    nssm set TatvaBackend Start SERVICE_AUTO_START
    nssm set TatvaBackend AppStdout "C:\TatvaAyurved\logs\backend-out.log"
    nssm set TatvaBackend AppStderr "C:\TatvaAyurved\logs\backend-err.log"
    nssm set TatvaBackend AppRotateFiles 1
    nssm set TatvaBackend AppRotateBytes 5242880
    nssm start TatvaBackend
    echo Backend service installed and started.
)

echo.
echo [6/7] Scheduling daily backup...
schtasks /create /tn "TatvaAyurved-DailyBackup" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\TatvaAyurved\scripts\backup.ps1" /sc daily /st 02:00 /ru SYSTEM /rl HIGHEST /f
echo Daily backup scheduled at 2:00 AM.

echo.
echo [7/7] Setup complete!
echo.
echo ============================================
echo  NEXT STEPS:
echo  1. Configure backend\.env with your MongoDB URL and JWT secret
echo  2. Configure frontend\.env with your domain
echo  3. Rebuild frontend: cd frontend ^& yarn build
echo  4. Setup IIS reverse proxy (see WINDOWS_SERVER_GUIDE.md)
echo  5. Setup SSL certificate
echo  6. Create admin user (see guide)
echo ============================================
echo.
pause
