$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

$repoRoot = Get-RepoRoot

foreach ($role in @("dev", "worker")) {
  Clear-StalePidIfNeeded -Name $role | Out-Null
}

$existingLocal = @()
foreach ($role in @("dev", "worker")) {
  $state = Get-ManagedProcessState -Name $role
  if ($null -ne $state.Source) {
    $existingLocal += $state
  }
}

if ($existingLocal.Count -gt 0) {
  $details = $existingLocal | ForEach-Object {
    $ids = (Get-ManagedProcessIds -Processes $_.Processes) -join ", "
    "$($_.Name): $ids via $($_.Source)"
  }
  throw "Local mode already appears to be running ($($details -join '; ')). Use .\scripts\status-local.ps1 or .\scripts\restart-local.ps1 instead."
}

$composeConflicts = @(Get-RunningComposeAppContainers)
if ($composeConflicts.Count -gt 0) {
  $names = $composeConflicts.Name -join ", "
  throw "Compose app containers are already running ($names). Stop compose mode before starting local mode."
}

Push-Location $repoRoot
try {
  & (Join-Path $PSScriptRoot "check-env.ps1")
  & (Join-Path $PSScriptRoot "dev-services.ps1") -SkipCheckEnv

  Ensure-RuntimeDir | Out-Null

  $escapedRepoRoot = $repoRoot.Replace("'", "''")
  $devCommand = "Set-Location -LiteralPath '$escapedRepoRoot'; npm.cmd run dev"
  $workerCommand = "Set-Location -LiteralPath '$escapedRepoRoot'; npm.cmd run worker"

  $devProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $devCommand) -WorkingDirectory $repoRoot -PassThru
  $workerProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $workerCommand) -WorkingDirectory $repoRoot -PassThru

  Write-TrackedPid -Name "dev" -ProcessId $devProcess.Id
  Write-TrackedPid -Name "worker" -ProcessId $workerProcess.Id

  Write-Host "[OK] Local mode started."
  Write-Host "App URL: http://localhost:3000"
  Write-Host "Chat URL: http://localhost:3000/network-engineer/chat"
  Write-Host "Settings URL: http://localhost:3000/settings"
  Write-Host "Next step: wait 10-15 seconds, then run .\scripts\status-local.ps1"
} finally {
  Pop-Location
}
