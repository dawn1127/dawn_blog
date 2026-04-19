$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Test-Command($Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
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
    $fallbackDir = Join-Path $repoRoot ".runtime\\docker-config"
    if (-not (Test-Path -LiteralPath $fallbackDir)) {
      New-Item -ItemType Directory -Path $fallbackDir -Force | Out-Null
    }

    $env:DOCKER_CONFIG = $fallbackDir
    Write-Host "[WARN] Default Docker config is not readable. Using local DOCKER_CONFIG at $fallbackDir"
  }
}

$npmCommand = if (Test-Command "npm.cmd") { "npm.cmd" } else { "npm" }

if (-not (Test-Command "docker")) {
  $dockerDesktopBin = "C:\Program Files\Docker\Docker\resources\bin"
  $dockerExe = Join-Path $dockerDesktopBin "docker.exe"

  if (Test-Path -LiteralPath $dockerExe) {
    $env:Path = "$dockerDesktopBin;$env:Path"
    Write-Host "[OK] Added Docker Desktop CLI to current PATH"
  }
}

Initialize-DockerCliEnvironment

$checks = @(
  @{ Name = "node"; Required = $true },
  @{ Name = $npmCommand; Label = "npm"; Required = $true },
  @{ Name = "docker"; Required = $true }
)

$failed = $false

foreach ($check in $checks) {
  $label = if ($check.ContainsKey("Label") -and -not [string]::IsNullOrWhiteSpace($check["Label"])) {
    $check["Label"]
  } else {
    $check["Name"]
  }

  if (Test-Command $check.Name) {
    try {
      $version = (& $check.Name --version 2>$null | Out-String).Trim()
      if ([string]::IsNullOrWhiteSpace($version)) {
        $version = "available"
      }
    } catch {
      $version = "available"
    }
    Write-Host "[OK] $label $version"
  } else {
    Write-Host "[FAIL] Missing $label"
    if ($check.Required) {
      $failed = $true
    }
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".env"))) {
  Write-Host "[WARN] .env not found. Copy .env.example to .env and replace secrets before starting services."
} else {
  Write-Host "[OK] .env exists"
}

if ($failed) {
  Write-Host "Environment check failed."
  exit 1
}

Write-Host "Environment check passed."
