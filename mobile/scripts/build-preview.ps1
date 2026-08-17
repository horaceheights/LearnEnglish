param(
  [ValidateSet('android', 'ios', 'all')]
  [string]$Platform
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

if ([string]::IsNullOrWhiteSpace($Platform)) {
  throw 'Indica la plataforma. Ejemplo: npm run build:preview -- -Platform ios'
}

Assert-CleanReleaseCommit
$mobileRoot = Split-Path -Parent $PSScriptRoot

Push-Location $mobileRoot
try {
  Write-Host "Creando SpanGlish Preview para $Platform en Expo..." -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo crear el build de Preview.' -Command {
    & npx eas-cli build --profile preview --platform $Platform
  }
} finally {
  Pop-Location
}
