param(
  [switch]$Down
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

$repoRoot = Get-RepoRoot

Push-Location $repoRoot
try {
  $stopped = @()

  foreach ($role in @("worker", "dev")) {
    $result = Stop-ManagedProcess -Name $role
    if ($result.Stopped) {
      Write-Host "[OK] Stopped $role process ($($result.Ids -join ', ')) via $($result.Source)."
    } elseif ($result.HadStalePid) {
      Write-Host "[WARNING] Cleared stale $role PID file. No running process was found."
    } else {
      Write-Host "[WARNING] No running $role process found."
    }

    $stopped += $result
  }

  & (Join-Path $PSScriptRoot "check-env.ps1")
  Assert-DockerDaemonAvailable

  if ($Down) {
    docker compose down
    Write-Host "[OK] Docker Compose services were removed with down."
  } else {
    docker compose stop postgres redis minio
    Write-Host "[OK] Base Docker services were stopped."
  }
} finally {
  Pop-Location
}
