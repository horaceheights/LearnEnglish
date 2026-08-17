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
$previousNoVcs = [Environment]::GetEnvironmentVariable('EAS_NO_VCS', 'Process')
$previousProjectRoot = [Environment]::GetEnvironmentVariable('EAS_PROJECT_ROOT', 'Process')

Push-Location $mobileRoot
try {
  # This repository also contains the backend, web frontend, lesson source, and
  # a large Git history. Package only mobile/; the release guard above still
  # requires the selected commit to be clean and pushed before this opt-out.
  $env:EAS_NO_VCS = '1'
  $env:EAS_PROJECT_ROOT = $mobileRoot
  Write-Host "Creando SpanGlish Preview para $Platform en Expo..." -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo crear el build de Preview.' -Command {
    & npx eas-cli build --profile preview --platform $Platform
  }
} finally {
  if ($null -eq $previousNoVcs) {
    Remove-Item Env:EAS_NO_VCS -ErrorAction SilentlyContinue
  } else {
    $env:EAS_NO_VCS = $previousNoVcs
  }
  if ($null -eq $previousProjectRoot) {
    Remove-Item Env:EAS_PROJECT_ROOT -ErrorAction SilentlyContinue
  } else {
    $env:EAS_PROJECT_ROOT = $previousProjectRoot
  }
  Pop-Location
}
