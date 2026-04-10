# ============================================================
# Tatva Ayurved - Automated Backup Script
# Schedule via Task Scheduler to run daily at 2:00 AM
# ============================================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupRoot = "C:\TatvaAyurved\backups"
$backupDir = "$backupRoot\$timestamp"
$logFile = "C:\TatvaAyurved\logs\backup.log"
$retainDays = 30

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
New-Item -ItemType Directory -Path "C:\TatvaAyurved\logs" -Force | Out-Null

function Log($msg) {
    $entry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg"
    Add-Content -Path $logFile -Value $entry
    Write-Host $entry
}

Log "=== Backup started ==="

# 1. Database Backup
try {
    Log "Backing up MongoDB database..."
    $envContent = Get-Content "C:\TatvaAyurved\backend\.env" -Raw
    $mongoUrl = ($envContent | Select-String 'MONGO_URL=(.+)').Matches.Groups[1].Value.Trim('"')
    $dbName = "tatva_ayurved"
    mongodump --uri="$mongoUrl" --db=$dbName --out="$backupDir\mongodb" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Log "MongoDB backup SUCCESS" }
    else { Log "WARNING: mongodump exited with code $LASTEXITCODE" }
} catch { Log "ERROR: MongoDB backup failed - $_" }

# 2. Application Config Backup
try {
    Log "Backing up configuration files..."
    Copy-Item -Path "C:\TatvaAyurved\backend\server.py" -Destination "$backupDir\" -Force
    Copy-Item -Path "C:\TatvaAyurved\backend\.env" -Destination "$backupDir\backend.env" -Force
    Copy-Item -Path "C:\TatvaAyurved\frontend\.env" -Destination "$backupDir\frontend.env" -Force
    Copy-Item -Path "C:\TatvaAyurved\backend\requirements.txt" -Destination "$backupDir\" -Force
    Log "Config backup SUCCESS"
} catch { Log "ERROR: Config backup failed - $_" }

# 3. Compress
try {
    Log "Compressing backup..."
    $zipPath = "$backupRoot\tatva-backup-$timestamp.zip"
    Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -Force
    Remove-Item -Recurse -Force $backupDir
    $sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Log "Compressed: $zipPath ($sizeMB MB)"
} catch { Log "ERROR: Compression failed - $_" }

# 4. Cleanup Old Backups
try {
    Log "Cleaning backups older than $retainDays days..."
    $cutoff = (Get-Date).AddDays(-$retainDays)
    $old = Get-ChildItem "$backupRoot\*.zip" | Where-Object { $_.LastWriteTime -lt $cutoff }
    $oldCount = ($old | Measure-Object).Count
    $old | Remove-Item -Force
    Log "Removed $oldCount old backup(s)"
} catch { Log "ERROR: Cleanup failed - $_" }

Log "=== Backup completed ==="
