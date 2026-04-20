$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".env"))) {
  Copy-Item -LiteralPath (Join-Path $repoRoot ".env.example") -Destination (Join-Path $repoRoot ".env")
  Write-Host "Created .env from .env.example. Edit APP_ENCRYPTION_KEY, SESSION_SECRET, and BOOTSTRAP_ADMIN_PASSWORD before production use."
}

Push-Location $repoRoot
try {
  & (Join-Path $PSScriptRoot "check-env.ps1")

  npm.cmd install
  npm.cmd run prisma:generate

  & (Join-Path $PSScriptRoot "dev-services.ps1") -SkipCheckEnv

  Write-Host "Waiting briefly for services..."
  Start-Sleep -Seconds 8

  npm.cmd run prisma:deploy
  npm.cmd run prisma:seed

  Write-Host "First run complete. Start the app with: .\scripts\start-local.ps1"
} finally {
  Pop-Location
}
