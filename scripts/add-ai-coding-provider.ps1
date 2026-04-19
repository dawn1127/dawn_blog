$ErrorActionPreference = "Stop"

$apiKeySecure = Read-Host "Paste AI Coding 2233 API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKeySecure)

try {
  $apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

  if ([string]::IsNullOrWhiteSpace($apiKeyPlain)) {
    throw "API key is required."
  }

  $env:AICODING_API_KEY = $apiKeyPlain
  npx tsx scripts/add-ai-coding-provider.ts
} finally {
  $env:AICODING_API_KEY = $null

  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
