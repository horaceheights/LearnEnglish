param(
  [string]$GroupId,
  [switch]$Confirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

if ($GroupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
  throw 'GroupId debe ser el identificador UUID mostrado por Expo al publicar Preview.'
}

if (-not $Confirm) {
  throw 'Promoción bloqueada. Después de probar Preview, repite el comando con -Confirm.'
}

$mobileRoot = Split-Path -Parent $PSScriptRoot
Push-Location $mobileRoot
try {
  Write-Host 'Confirmando que este es el Preview más reciente...' -ForegroundColor Cyan
  $jsonLines = @(& npx eas-cli update:list --branch preview --limit 1 --non-interactive --json)
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo consultar el Preview más reciente.'
  }

  $preview = ($jsonLines -join [Environment]::NewLine) | ConvertFrom-Json
  $latestGroup = $preview.currentPage[0].group
  if ($latestGroup -ne $GroupId) {
    throw "Promoción bloqueada. El GroupId indicado no es el Preview más reciente ($latestGroup)."
  }

  Write-Host 'Enviando el bundle probado a Production...' -ForegroundColor Yellow
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo promover Preview a Production.' -Command {
    & npx eas-cli update:republish --group $GroupId --destination-channel production --message 'Promovido después de aprobación en Preview'
  }

  Write-Host ''
  Write-Host 'Aprobado: los testers de Production ya pueden recibir esta versión.' -ForegroundColor Green
} finally {
  Pop-Location
}
