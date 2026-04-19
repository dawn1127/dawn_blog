param(
  [switch]$SkipCheckEnv
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not $SkipCheckEnv) {
  & (Join-Path $PSScriptRoot "check-env.ps1")
}

Push-Location $repoRoot
try {
  Assert-DockerDaemonAvailable
  docker compose up -d postgres redis minio
  Write-Host "Core services started. Run npm run dev and npm run worker in separate terminals."
} finally {
  Pop-Location
}
