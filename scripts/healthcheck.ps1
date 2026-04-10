# ============================================================
# Tatva Ayurved - Health Check Script
# Run anytime to verify system status
# ============================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n=== Tatva Ayurved Health Check ===" -ForegroundColor Cyan
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

# Backend Service
$svc = nssm status TatvaBackend 2>$null
if ($svc -match "Running") {
    Write-Host "[OK] Backend Service: Running" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Backend Service: $svc" -ForegroundColor Red
}

# API Health
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 5
    if ($response.status -eq "ok") {
        Write-Host "[OK] API Health: Responding" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] API Health: Not responding" -ForegroundColor Red
}

# IIS
$iis = Get-Service W3SVC -ErrorAction SilentlyContinue
if ($iis.Status -eq "Running") {
    Write-Host "[OK] IIS: Running" -ForegroundColor Green
} else {
    Write-Host "[FAIL] IIS: Not running" -ForegroundColor Red
}

# MongoDB (local only)
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

# Disk Space
$disk = Get-PSDrive C
$freeGB = [math]::Round($disk.Free / 1GB, 2)
if ($freeGB -gt 10) {
    Write-Host "[OK] Disk Space: ${freeGB} GB free" -ForegroundColor Green
} elseif ($freeGB -gt 5) {
    Write-Host "[WARN] Disk Space: ${freeGB} GB free" -ForegroundColor Yellow
} else {
    Write-Host "[CRITICAL] Disk Space: ${freeGB} GB free!" -ForegroundColor Red
}

# Last Backup
$lastBackup = Get-ChildItem C:\TatvaAyurved\backups\*.zip -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($lastBackup) {
    $age = (Get-Date) - $lastBackup.LastWriteTime
    $sizeMB = [math]::Round($lastBackup.Length / 1MB, 2)
    if ($age.TotalHours -lt 26) {
        Write-Host "[OK] Last Backup: $($lastBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) ($sizeMB MB, $([math]::Round($age.TotalHours,1))h ago)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Last Backup: $($lastBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) ($([math]::Round($age.TotalDays,1)) days ago!)" -ForegroundColor Yellow
    }
    # Count total backups
    $totalBackups = (Get-ChildItem C:\TatvaAyurved\backups\*.zip | Measure-Object).Count
    $totalSizeMB = [math]::Round((Get-ChildItem C:\TatvaAyurved\backups\*.zip | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host "[INFO] Total Backups: $totalBackups files ($totalSizeMB MB)" -ForegroundColor Gray
} else {
    Write-Host "[WARN] No backups found" -ForegroundColor Yellow
}

# Log sizes
$logSize = (Get-ChildItem C:\TatvaAyurved\logs\ -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "[INFO] Log files: $([math]::Round($logSize, 2)) MB" -ForegroundColor Gray

Write-Host "`n=== Health Check Complete ===`n" -ForegroundColor Cyan
