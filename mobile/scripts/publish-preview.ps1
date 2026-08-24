param(
  [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

if ([string]::IsNullOrWhiteSpace($Message)) {
  throw 'Incluye una descripción. Ejemplo: npm run release:preview -- -Message "Corregir audio de gramática"'
}

Assert-PreviewReleaseLineage
Assert-CleanReleaseCommit
$repositoryRoot = Get-ReleaseRepositoryRoot
$releaseCommit = (& git -C $repositoryRoot rev-parse --short=7 HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($releaseCommit)) {
  throw 'No se pudo obtener el commit para identificar la actualización dentro de la app.'
}
$previousReleaseCommit = [Environment]::GetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', 'Process')
[Environment]::SetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', $releaseCommit, 'Process')
$mobileRoot = Split-Path -Parent $PSScriptRoot

Push-Location $mobileRoot
try {
  & (Join-Path $PSScriptRoot 'verify-preview.ps1')

  Write-Host 'Publicando solamente en Preview...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo publicar la actualización de Preview.' -Command {
    & npx eas-cli update --channel preview --environment preview --message $Message
  }

  Write-Host ''
  Write-Host 'Preview publicado. Los testers de Production no recibieron este cambio.' -ForegroundColor Green
  Write-Host 'Abre SpanGlish Preview y selecciona Actualizar para probarlo.'
} finally {
  Pop-Location
  [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', $previousReleaseCommit, 'Process')
}
