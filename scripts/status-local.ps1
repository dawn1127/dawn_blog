param(
  [ValidateSet("Text", "Json")]
  [string]$Format = "Text"
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "runtime-common.ps1")

function Write-StatusLine {
  param(
    [Parameter(Mandatory)]
    [ValidateSet("OK", "WARNING", "FAIL")]
    [string]$State,
    [Parameter(Mandatory)]
    [string]$Label,
    [Parameter(Mandatory)]
    [string]$Summary,
    [Parameter(Mandatory)]
    [string]$Detail
  )

  Write-Host "[$State] $Label - $Summary"
  Write-Host "      $Detail"
}

try {
  $report = Get-LocalStatusReport
} catch {
  $report = [pscustomobject][ordered]@{
    schemaVersion = 1
    checkedAt = (Get-Date).ToString("o")
    overallState = "FAIL"
    links = Get-LocalLinks
    items = @(
      New-StatusItem -Key "statusScript" -Label "Status script" -State "FAIL" -Summary "Status report generation failed." -Detail $_.Exception.Message -Meta @{ exceptionType = $_.Exception.GetType().FullName }
    )
  }
}

if ($Format -eq "Json") {
  $report | ConvertTo-Json -Depth 8
} else {
  Write-Host "Checked at: $($report.checkedAt)"
  Write-Host "Overall: $($report.overallState)"
  Write-Host ""

  foreach ($item in $report.items) {
    Write-StatusLine -State $item.state -Label $item.label -Summary $item.summary -Detail $item.detail
  }
}

if ($report.overallState -eq "FAIL") {
  exit 1
}
