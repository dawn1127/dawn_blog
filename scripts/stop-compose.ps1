param(
  [switch]$Down
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

$repoRoot = Get-RepoRoot

Push-Location $repoRoot
try {
  & (Join-Path $PSScriptRoot "check-env.ps1")
  Assert-DockerDaemonAvailable

  if ($Down) {
    docker compose down
    Write-Host "[OK] Compose mode stopped and containers removed."
  } else {
    docker compose stop
    Write-Host "[OK] Compose mode stopped."
  }
} finally {
  Pop-Location
}
