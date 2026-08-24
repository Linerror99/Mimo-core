# Script de restauration (Restore) de la base de donnees Mimo-core / Duoflow
param (
    [string]$File = ""
)

$ErrorActionPreference = "Stop"
$BackupDir = Join-Path $PSScriptRoot "..\backups"

# Si aucun fichier specifie, trouver le dump le plus recent dans backups/
if ([string]::IsNullOrWhiteSpace($File)) {
    if (-not (Test-Path $BackupDir)) {
        Write-Host "[!] Aucun dossier de backup trouve a $BackupDir" -ForegroundColor Red
        exit 1
    }

    $LatestBackup = Get-ChildItem -Path $BackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $LatestBackup) {
        Write-Host "[!] Aucun fichier de sauvegarde .sql trouve dans $BackupDir" -ForegroundColor Red
        exit 1
    }
    $File = $LatestBackup.FullName
} elseif (-not (Test-Path $File)) {
    # Tester si c'est un chemin relatif a backups/
    $Candidate = Join-Path $BackupDir $File
    if (Test-Path $Candidate) {
        $File = $Candidate
    } else {
        Write-Host "[!] Fichier de sauvegarde introuvable : $File" -ForegroundColor Red
        exit 1
    }
}

$FileSize = [math]::Round((Get-Item $File).Length / 1KB, 2)
Write-Host "[!] ATTENTION : La restauration va ecraser les donnees actuelles de la base de donnees !" -ForegroundColor Yellow
Write-Host "[+] Fichier a restaurer : $File ($FileSize Ko)" -ForegroundColor Cyan

$Confirmation = Read-Host "Etes-vous sur de vouloir continuer ? (O/N)"
if ($Confirmation -notin @('O', 'o', 'Y', 'y', 'oui', 'yes')) {
    Write-Host "[*] Restauration annulee." -ForegroundColor Gray
    exit 0
}

Write-Host "[*] Restauration en cours..." -ForegroundColor Cyan

# Injection du dump SQL dans le conteneur postgres
cmd.exe /c "docker compose exec -T postgres psql -U duoflow -d duoflow < `"$File`""

Write-Host "[*] Redemarrage du backend pour synchroniser..." -ForegroundColor Cyan
docker compose restart backend | Out-Null

Write-Host "[OK] Restauration effectuee avec succes et base de donnees remise au propre !" -ForegroundColor Green
