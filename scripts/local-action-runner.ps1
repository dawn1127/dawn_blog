param(
  [Parameter(Mandatory)]
  [ValidateSet("start", "restart", "stop")]
  [string]$Action,
  [Parameter(Mandatory)]
  [string]$StdOutFile,
  [Parameter(Mandatory)]
  [string]$StdErrFile,
  [Parameter(Mandatory)]
  [string]$ExitCodeFile
)

$ErrorActionPreference = "Stop"

$scriptMap = @{
  start = "start-local.ps1"
  restart = "restart-local.ps1"
  stop = "stop-local.ps1"
}

function Write-Utf8File {
  param(
    [Parameter(Mandatory)]
    [string]$Path,
    [Parameter(Mandatory)]
    [AllowEmptyString()]
    [string]$Content
  )

  $directory = Split-Path -Parent $Path
  if (-not [string]::IsNullOrWhiteSpace($directory) -and -not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$stdout = ""
$stderr = ""
$exitCode = 1

try {
  $scriptName = $scriptMap[$Action]
  if ([string]::IsNullOrWhiteSpace($scriptName)) {
    throw "Unsupported action: $Action"
  }

  $scriptPath = Join-Path $PSScriptRoot $scriptName
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Action script not found: $scriptPath"
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command powershell.exe).Source
  $psi.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $scriptPath
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi

  $null = $process.Start()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  $exitCode = $process.ExitCode
} catch {
  $stderr = $_ | Out-String
} finally {
  Write-Utf8File -Path $StdOutFile -Content $stdout
  Write-Utf8File -Path $StdErrFile -Content $stderr
  Set-Content -LiteralPath $ExitCodeFile -Value ([string]$exitCode) -Encoding ASCII
}
