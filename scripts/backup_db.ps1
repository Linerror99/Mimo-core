# Script de sauvegarde (Dump) de la base de donnees Mimo-core / Duoflow
$ErrorActionPreference = "Stop"

# Dossier de sauvegarde
$BackupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Nom de fichier horodate
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "mimo_backup_$Timestamp.sql"

Write-Host "[*] Creation du dump de la base de donnees PostgreSQL..." -ForegroundColor Cyan

# Executer pg_dump avec --clean et --if-exists pour un dump propre et auto-restaurable
cmd.exe /c "docker compose exec -T postgres pg_dump -U duoflow --clean --if-exists duoflow > `"$BackupFile`""

if (Test-Path $BackupFile) {
    $FileSize = [math]::Round((Get-Item $BackupFile).Length / 1KB, 2)
    Write-Host "[OK] Sauvegarde reussie avec succes !" -ForegroundColor Green
    Write-Host "[+] Fichier : $BackupFile" -ForegroundColor Yellow
    Write-Host "[+] Taille  : $FileSize Ko" -ForegroundColor Yellow
} else {
    Write-Host "[!] Erreur lors de la creation de la sauvegarde." -ForegroundColor Red
}
