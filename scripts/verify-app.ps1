$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Push-Location $repoRoot
try {
  npm.cmd run typecheck
  npm.cmd run lint
  npm.cmd run build
  npm.cmd audit --omit=dev
} finally {
  Pop-Location
}

Write-Host "Static verification complete."
