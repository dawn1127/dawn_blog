$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

$repoRoot = Get-RepoRoot

foreach ($role in @("dev", "worker")) {
  Clear-StalePidIfNeeded -Name $role | Out-Null
}

$localConflicts = @()
foreach ($role in @("dev", "worker")) {
  $state = Get-ManagedProcessState -Name $role
  if ($null -ne $state.Source) {
    $localConflicts += $state
  }
}

if ($localConflicts.Count -gt 0) {
  $details = $localConflicts | ForEach-Object {
    $ids = (Get-ManagedProcessIds -Processes $_.Processes) -join ", "
    "$($_.Name): $ids via $($_.Source)"
  }
  throw "Local mode is already running ($($details -join '; ')). Stop local mode before starting compose mode."
}

Push-Location $repoRoot
try {
  & (Join-Path $PSScriptRoot "check-env.ps1")
  Assert-DockerDaemonAvailable
  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose up -d --build failed."
  }
  Write-Host "[OK] Compose production mode started."
  Write-Host "App URL: http://localhost:3000"
} finally {
  Pop-Location
}
