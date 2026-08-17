param(
  [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

if ([string]::IsNullOrWhiteSpace($Message)) {
  throw 'Incluye una descripción. Ejemplo: npm run release:preview -- -Message "Corregir audio de gramática"'
}

Assert-CleanReleaseCommit
$mobileRoot = Split-Path -Parent $PSScriptRoot

Push-Location $mobileRoot
try {
  Write-Host 'Comprobando TypeScript...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'TypeScript encontró errores. Preview no fue publicado.' -Command {
    & npx tsc --noEmit
  }

  Write-Host 'Publicando solamente en Preview...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo publicar la actualización de Preview.' -Command {
    & npx eas-cli update --channel preview --environment preview --message $Message
  }

  Write-Host ''
  Write-Host 'Preview publicado. Los testers de Production no recibieron este cambio.' -ForegroundColor Green
  Write-Host 'Abre SpanGlish Preview y selecciona Actualizar para probarlo.'
} finally {
  Pop-Location
}
