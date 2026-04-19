param(
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputDir $timestamp
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

docker compose exec -T postgres pg_dump -U network -d network_engineer_ai > (Join-Path $backupDir "postgres.sql")
docker run --rm -v network_engineer_project_minio-data:/data -v "${PWD}/${backupDir}:/backup" alpine tar czf /backup/minio-data.tgz -C /data .

Copy-Item -LiteralPath ".env.example" -Destination (Join-Path $backupDir "env.example.snapshot")

Write-Host "Backup written to $backupDir"
