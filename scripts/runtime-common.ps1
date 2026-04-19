$script:RuntimeCommonRoot = $PSScriptRoot

Set-StrictMode -Version Latest

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $script:RuntimeCommonRoot "..")).Path
}

function Get-RuntimeDir {
  return (Join-Path (Get-RepoRoot) ".runtime")
}

function Ensure-RuntimeDir {
  $runtimeDir = Get-RuntimeDir
  if (-not (Test-Path -LiteralPath $runtimeDir)) {
    New-Item -ItemType Directory -Path $runtimeDir | Out-Null
  }
  return $runtimeDir
}

function Get-PidFilePath {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  return (Join-Path (Get-RuntimeDir) "$Name.pid")
}

function Read-TrackedPid {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $pidFile = Get-PidFilePath -Name $Name
  if (-not (Test-Path -LiteralPath $pidFile)) {
    return $null
  }

  $rawValue = (Get-Content -LiteralPath $pidFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($rawValue)) {
    return $null
  }

  try {
    return [int]$rawValue
  } catch {
    return $null
  }
}

function Write-TrackedPid {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name,
    [Parameter(Mandatory)]
    [int]$ProcessId
  )

  Ensure-RuntimeDir | Out-Null
  Set-Content -LiteralPath (Get-PidFilePath -Name $Name) -Value "$ProcessId" -Encoding ASCII
}

function Clear-TrackedPid {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $pidFile = Get-PidFilePath -Name $Name
  if (Test-Path -LiteralPath $pidFile) {
    Remove-Item -LiteralPath $pidFile -Force
  }
}

function Test-CommandAvailable {
  param(
    [Parameter(Mandatory)]
    [string]$Name
  )

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Initialize-DockerCliEnvironment {
  if (-not [string]::IsNullOrWhiteSpace($env:DOCKER_CONFIG)) {
    return
  }

  $defaultDockerConfigFile = Join-Path (Join-Path $HOME ".docker") "config.json"
  try {
    if (-not (Test-Path -LiteralPath $defaultDockerConfigFile -ErrorAction Stop)) {
      return
    }

    Get-Content -LiteralPath $defaultDockerConfigFile -TotalCount 1 -ErrorAction Stop | Out-Null
  } catch {
    $fallbackDir = Join-Path (Ensure-RuntimeDir) "docker-config"
    if (-not (Test-Path -LiteralPath $fallbackDir)) {
      New-Item -ItemType Directory -Path $fallbackDir -Force | Out-Null
    }

    $env:DOCKER_CONFIG = $fallbackDir
  }
}

function Test-DockerDaemonAvailable {
  if (-not (Test-CommandAvailable -Name "docker")) {
    return $false
  }

  Initialize-DockerCliEnvironment

  try {
    & docker info *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Assert-DockerDaemonAvailable {
  if (-not (Test-CommandAvailable -Name "docker")) {
    throw "Docker CLI not found. Run .\scripts\check-env.ps1 first and install Docker Desktop if needed."
  }

  Initialize-DockerCliEnvironment

  if (-not (Test-DockerDaemonAvailable)) {
    throw "Docker Desktop is not ready. Start Docker Desktop and wait for the engine to show Running, then try again."
  }
}

function Get-ContainerState {
  param(
    [Parameter(Mandatory)]
    [string]$ContainerName
  )

  if (-not (Test-DockerDaemonAvailable)) {
    return $null
  }

  $format = "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}"

  try {
    $output = & docker inspect $ContainerName --format $format 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }

    $line = (($output | Out-String).Trim())
    if ([string]::IsNullOrWhiteSpace($line)) {
      return $null
    }

    $parts = $line.Split("|", 2)
    $health = if ($parts.Length -gt 1) { $parts[1] } else { "none" }

    return [pscustomobject]@{
      Name = $ContainerName
      Status = $parts[0]
      Health = $health
    }
  } catch {
    return $null
  }
}

function Get-RunningComposeAppContainers {
  $containers = @("network-ai-web", "network-ai-worker")
  $running = @()

  foreach ($container in $containers) {
    $state = Get-ContainerState -ContainerName $container
    if ($null -ne $state -and $state.Status -eq "running") {
      $running += $state
    }
  }

  return $running
}

function Get-LocalProcessPatterns {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  switch ($Name) {
    "dev" {
      return @("npm run dev", "npm\.cmd run dev", "next dev")
    }
    "worker" {
      return @("npm run worker", "npm\.cmd run worker", "tsx src[\\/]+worker[\\/]+parse-files\.ts", "tsx\.cmd src[\\/]+worker[\\/]+parse-files\.ts")
    }
  }
}

function Find-LocalManagedProcesses {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $repoPattern = [regex]::Escape((Get-RepoRoot))
  $patterns = Get-LocalProcessPatterns -Name $Name

  try {
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
      $commandLine = $_.CommandLine
      if ([string]::IsNullOrWhiteSpace($commandLine)) {
        return $false
      }

      if ($commandLine -notmatch $repoPattern) {
        return $false
      }

      foreach ($pattern in $patterns) {
        if ($commandLine -match $pattern) {
          return $true
        }
      }

      return $false
    }

    return @($processes | Sort-Object ProcessId -Unique)
  } catch {
    return @()
  }
}

function Get-ManagedProcessIds {
  param(
    [Parameter(Mandatory)]
    [AllowEmptyCollection()]
    [object[]]$Processes
  )

  $ids = @()

  foreach ($process in $Processes) {
    $idProperty = $process.PSObject.Properties["Id"]
    $processIdProperty = $process.PSObject.Properties["ProcessId"]

    if ($null -ne $idProperty -and $null -ne $idProperty.Value) {
      $ids += [int]$idProperty.Value
    } elseif ($null -ne $processIdProperty -and $null -ne $processIdProperty.Value) {
      $ids += [int]$processIdProperty.Value
    }
  }

  return @($ids | Sort-Object -Unique)
}

function Get-ManagedProcessState {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $trackedPid = Read-TrackedPid -Name $Name
  $trackedProcess = $null
  if ($null -ne $trackedPid) {
    $trackedProcess = Get-Process -Id $trackedPid -ErrorAction SilentlyContinue
  }

  $processes = @()
  $source = $null
  $hasStalePid = $false

  if ($null -ne $trackedProcess) {
    $processes = @($trackedProcess)
    $source = "pid"
  } else {
    if ($null -ne $trackedPid) {
      $hasStalePid = $true
    }

    $fallbackProcesses = @(Find-LocalManagedProcesses -Name $Name)
    if ($fallbackProcesses.Count -gt 0) {
      $processes = $fallbackProcesses
      $source = "fallback"
    }
  }

  return [pscustomobject]@{
    Name = $Name
    TrackedPid = $trackedPid
    Processes = $processes
    Source = $source
    HasStalePid = $hasStalePid
  }
}

function Clear-StalePidIfNeeded {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $state = Get-ManagedProcessState -Name $Name
  if ($state.HasStalePid -and $state.Source -ne "fallback") {
    Clear-TrackedPid -Name $Name
    return $true
  }

  return $false
}

function Stop-ManagedProcess {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Name
  )

  $state = Get-ManagedProcessState -Name $Name
  $ids = @(Get-ManagedProcessIds -Processes $state.Processes)

  if ($ids.Count -eq 0) {
    Clear-TrackedPid -Name $Name
    return [pscustomobject]@{
      Name = $Name
      Stopped = $false
      Source = $state.Source
      Ids = @()
      HadStalePid = $state.HasStalePid
    }
  }

  foreach ($id in $ids) {
    & taskkill.exe /PID $id /T /F *> $null
  }

  Clear-TrackedPid -Name $Name

  return [pscustomobject]@{
    Name = $Name
    Stopped = $true
    Source = if ($null -ne $state.Source) { $state.Source } else { "none" }
    Ids = $ids
    HadStalePid = $state.HasStalePid
  }
}

function Get-LocalLinks {
  $repoRoot = Get-RepoRoot

  return [pscustomobject][ordered]@{
    login = "http://localhost:3000/login"
    chat = "http://localhost:3000/network-engineer/chat"
    settings = "http://localhost:3000/settings"
    runbook = Join-Path $repoRoot "ADMIN-RUNBOOK.md"
    projectFolder = $repoRoot
  }
}

function New-StatusItem {
  param(
    [Parameter(Mandatory)]
    [string]$Key,
    [Parameter(Mandatory)]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidateSet("OK", "WARNING", "FAIL")]
    [string]$State,
    [Parameter(Mandatory)]
    [string]$Summary,
    [Parameter(Mandatory)]
    [string]$Detail,
    [hashtable]$Meta
  )

  $item = [ordered]@{
    key = $Key
    label = $Label
    state = $State
    summary = $Summary
    detail = $Detail
  }

  if ($Meta -and $Meta.Count -gt 0) {
    $orderedMeta = [ordered]@{}
    foreach ($metaKey in $Meta.Keys) {
      $orderedMeta[$metaKey] = $Meta[$metaKey]
    }

    $item.meta = [pscustomobject]$orderedMeta
  }

  return [pscustomobject]$item
}

function Get-OverallState {
  param(
    [Parameter(Mandatory)]
    [object[]]$Items
  )

  $states = @($Items | ForEach-Object { $_.state })
  if ($states -contains "FAIL") {
    return "FAIL"
  }

  if ($states -contains "WARNING") {
    return "WARNING"
  }

  return "OK"
}

function Get-DockerDaemonStatusItem {
  if (-not (Test-CommandAvailable -Name "docker")) {
    return New-StatusItem -Key "dockerDaemon" -Label "Docker daemon" -State "FAIL" -Summary "Docker CLI is missing." -Detail "Install Docker Desktop or add docker.exe to PATH." -Meta @{ commandAvailable = $false }
  }

  if (-not (Test-DockerDaemonAvailable)) {
    return New-StatusItem -Key "dockerDaemon" -Label "Docker daemon" -State "FAIL" -Summary "Docker Desktop is not ready." -Detail "Start Docker Desktop and wait for the engine to show Running." -Meta @{ commandAvailable = $true; daemonReady = $false }
  }

  return New-StatusItem -Key "dockerDaemon" -Label "Docker daemon" -State "OK" -Summary "Docker Desktop engine is reachable." -Detail "Docker CLI can talk to the local daemon." -Meta @{ commandAvailable = $true; daemonReady = $true }
}

function Get-DockerServiceStatusItem {
  param(
    [Parameter(Mandatory)]
    [string]$Key,
    [Parameter(Mandatory)]
    [string]$Label,
    [Parameter(Mandatory)]
    [string]$ContainerName
  )

  if (-not (Test-CommandAvailable -Name "docker") -or -not (Test-DockerDaemonAvailable)) {
    return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "Docker daemon is unavailable." -Detail "Cannot inspect the container until Docker Desktop is running." -Meta @{ containerName = $ContainerName }
  }

  $containerState = Get-ContainerState -ContainerName $ContainerName
  if ($null -eq $containerState) {
    return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "Container was not found." -Detail "docker inspect did not return state for $ContainerName." -Meta @{ containerName = $ContainerName }
  }

  $meta = @{
    containerName = $ContainerName
    containerStatus = $containerState.Status
    health = $containerState.Health
  }

  if ($containerState.Status -ne "running") {
    return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "Container is not running." -Detail "$ContainerName is $($containerState.Status)." -Meta $meta
  }

  if ($containerState.Health -ne "none" -and $containerState.Health -ne "healthy") {
    return New-StatusItem -Key $Key -Label $Label -State "WARNING" -Summary "Container is running with a health warning." -Detail "$ContainerName is running but health is $($containerState.Health)." -Meta $meta
  }

  return New-StatusItem -Key $Key -Label $Label -State "OK" -Summary "Container is running." -Detail "$ContainerName is running with health $($containerState.Health)." -Meta $meta
}

function Get-ManagedProcessStatusItem {
  param(
    [Parameter(Mandatory)]
    [string]$Key,
    [Parameter(Mandatory)]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidateSet("dev", "worker")]
    [string]$Role
  )

  $processState = Get-ManagedProcessState -Name $Role
  $ids = @(Get-ManagedProcessIds -Processes $processState.Processes)
  $meta = @{
    role = $Role
    trackedPid = $processState.TrackedPid
    source = $processState.Source
    pids = $ids
  }

  if ($ids.Count -eq 0) {
    if ($processState.HasStalePid) {
      return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "PID file is stale." -Detail "Tracked PID exists but the process is gone." -Meta $meta
    }

    return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "Process is not running." -Detail "No matching process was found for $Role." -Meta $meta
  }

  $pidList = $ids -join ", "
  if ($processState.Source -eq "fallback") {
    return New-StatusItem -Key $Key -Label $Label -State "WARNING" -Summary "Process was recovered from a scan." -Detail "Using process scan for PID $pidList. Re-run .\scripts\restart-local.ps1 to refresh PID files." -Meta $meta
  }

  return New-StatusItem -Key $Key -Label $Label -State "OK" -Summary "Process is running." -Detail "Tracked PID $pidList is active." -Meta $meta
}

function Invoke-UrlProbe {
  param(
    [Parameter(Mandatory)]
    [string]$Url
  )

  try {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "GET"
    $request.AllowAutoRedirect = $false
    $request.Timeout = 1500
    $request.ReadWriteTimeout = 1500

    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    $statusCode = [int]$response.StatusCode
    $location = $response.Headers["Location"]
    $response.Close()

    return [pscustomobject]@{
      Reachable = ($statusCode -ge 200 -and $statusCode -lt 400)
      StatusCode = $statusCode
      Location = $location
      Error = $null
    }
  } catch [System.Net.WebException] {
    $statusCode = $null
    $location = $null
    $reachable = $false

    if ($_.Exception.Response -is [System.Net.HttpWebResponse]) {
      $response = [System.Net.HttpWebResponse]$_.Exception.Response
      $statusCode = [int]$response.StatusCode
      $location = $response.Headers["Location"]
      $reachable = ($statusCode -ge 200 -and $statusCode -lt 400)
      $response.Close()
    }

    return [pscustomobject]@{
      Reachable = $reachable
      StatusCode = $statusCode
      Location = $location
      Error = $_.Exception.Message
    }
  } catch {
    return [pscustomobject]@{
      Reachable = $false
      StatusCode = $null
      Location = $null
      Error = $_.Exception.Message
    }
  }
}

function Get-UrlStatusItem {
  param(
    [Parameter(Mandatory)]
    [string]$Key,
    [Parameter(Mandatory)]
    [string]$Label,
    [Parameter(Mandatory)]
    [string]$Url
  )

  $probe = Invoke-UrlProbe -Url $Url
  $meta = @{
    url = $Url
    statusCode = $probe.StatusCode
    location = $probe.Location
  }

  if ($probe.Reachable) {
    $statusText = if ($null -ne $probe.StatusCode) { "HTTP $($probe.StatusCode)" } else { "reachable" }
    return New-StatusItem -Key $Key -Label $Label -State "OK" -Summary "URL is reachable." -Detail "$Url responded with $statusText." -Meta $meta
  }

  $statusText = if ($null -ne $probe.StatusCode) { "HTTP $($probe.StatusCode)" } else { "no HTTP response" }
  return New-StatusItem -Key $Key -Label $Label -State "FAIL" -Summary "URL is not reachable." -Detail "$Url returned $statusText. $($probe.Error)" -Meta $meta
}

function Get-LocalStatusReport {
  $links = Get-LocalLinks
  $items = @(
    Get-DockerDaemonStatusItem
    Get-DockerServiceStatusItem -Key "postgres" -Label "Postgres" -ContainerName "network-ai-postgres"
    Get-DockerServiceStatusItem -Key "redis" -Label "Redis" -ContainerName "network-ai-redis"
    Get-DockerServiceStatusItem -Key "minio" -Label "MinIO" -ContainerName "network-ai-minio"
    Get-ManagedProcessStatusItem -Key "devProcess" -Label "Dev server" -Role "dev"
    Get-ManagedProcessStatusItem -Key "workerProcess" -Label "Worker" -Role "worker"
    Get-UrlStatusItem -Key "loginUrl" -Label "Login URL" -Url $links.login
    Get-UrlStatusItem -Key "chatUrl" -Label "Chat URL" -Url $links.chat
    Get-UrlStatusItem -Key "settingsUrl" -Label "Settings URL" -Url $links.settings
  )

  return [pscustomobject][ordered]@{
    schemaVersion = 1
    checkedAt = (Get-Date).ToString("o")
    overallState = Get-OverallState -Items $items
    links = $links
    items = $items
  }
}
