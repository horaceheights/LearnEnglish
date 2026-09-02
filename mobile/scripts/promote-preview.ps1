param(
  [string]$GroupId,
  [switch]$Confirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

function Assert-TestedPreviewGroup {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedGroup,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedCommit
  )

  Write-Host 'Confirmando que este es el Preview más reciente y coincide con el commit verificado...' -ForegroundColor Cyan
  $jsonLines = @(& npx eas-cli update:list --branch preview --limit 1 --non-interactive --json)
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo consultar el Preview más reciente.'
  }

  try {
    $preview = ($jsonLines -join [Environment]::NewLine) | ConvertFrom-Json
  } catch {
    throw "Expo devolvió un resumen de Preview inválido: $($_.Exception.Message)"
  }

  $currentPage = @($preview.currentPage)
  if ($currentPage.Count -eq 0) {
    throw 'Promoción bloqueada. Expo no devolvió ningún Preview publicado.'
  }

  $latestGroup = [string]$currentPage[0].group
  if ($latestGroup -ne $ExpectedGroup) {
    throw "Promoción bloqueada. El GroupId indicado no es el Preview más reciente ($latestGroup)."
  }

  $detailLines = @(& npx eas-cli update:view $ExpectedGroup --json)
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudieron verificar los updates inmutables del grupo de Preview.'
  }

  try {
    $groupUpdates = @(($detailLines -join [Environment]::NewLine) | ConvertFrom-Json)
  } catch {
    throw "Expo devolvió detalles de Preview inválidos: $($_.Exception.Message)"
  }
  if ($groupUpdates.Count -eq 0) {
    throw 'Promoción bloqueada. El grupo de Preview no contiene updates.'
  }

  $observedPlatforms = @()
  foreach ($groupUpdate in $groupUpdates) {
    $commitProperty = $groupUpdate.PSObject.Properties['gitCommitHash']
    $platformProperty = $groupUpdate.PSObject.Properties['platform']
    $branchProperty = $groupUpdate.PSObject.Properties['branch']
    $groupProperty = $groupUpdate.PSObject.Properties['group']
    $observedCommit = if ($null -ne $commitProperty) { [string]$commitProperty.Value } else { '' }
    $observedPlatform = if ($null -ne $platformProperty) { [string]$platformProperty.Value } else { '' }
    $observedBranch = if ($null -ne $branchProperty) { [string]$branchProperty.Value } else { '' }
    $observedGroup = if ($null -ne $groupProperty) { [string]$groupProperty.Value } else { '' }
    $observedPlatforms += $observedPlatform

    if (-not [string]::Equals($observedCommit, $ExpectedCommit, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Promoción bloqueada. Preview contiene el commit '$observedCommit', pero la revisión estricta se ejecutó sobre '$ExpectedCommit'. Publica y prueba nuevamente el commit con las aprobaciones finales."
    }
    if (-not [string]::Equals($observedBranch, 'preview', [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Promoción bloqueada. El update pertenece a la rama Expo '$observedBranch', no a preview."
    }
    if (-not [string]::Equals($observedGroup, $ExpectedGroup, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Promoción bloqueada. Expo devolvió un update de otro grupo ('$observedGroup')."
    }
  }

  if (-not ($observedPlatforms -contains 'android' -and $observedPlatforms -contains 'ios')) {
    $platformSummary = @($observedPlatforms | Sort-Object -Unique) -join ', '
    throw "Promoción bloqueada. El grupo debe contener Android e iOS; Expo devolvió: $platformSummary."
  }

  Write-Host "Preview verificado: grupo $ExpectedGroup, commit $($ExpectedCommit.Substring(0, 7)), Android e iOS." -ForegroundColor Green
}

if ($GroupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
  throw 'GroupId debe ser el identificador UUID mostrado por Expo al publicar Preview.'
}

if (-not $Confirm) {
  throw 'Promoción bloqueada. Después de probar Preview, repite el comando con -Confirm.'
}

$repositoryRoot = Get-ReleaseRepositoryRoot
Assert-CleanReleaseCommit
$headCommit = (& git -C $repositoryRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $headCommit -notmatch '^[0-9a-fA-F]{40}$') {
  throw 'Promoción bloqueada. No se pudo identificar el commit verificado.'
}

$mobileRoot = Split-Path -Parent $PSScriptRoot
Push-Location $mobileRoot
try {
  Write-Host 'Ejecutando la validación estricta de Production...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Promoción bloqueada. Faltan aprobaciones humanas vigentes o falló el preflight de Production.' -Command {
    & npm run verify:production
  }

  Assert-TestedPreviewGroup -ExpectedGroup $GroupId -ExpectedCommit $headCommit

  Write-Host 'Enviando el bundle probado a Production...' -ForegroundColor Yellow
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo promover Preview a Production.' -Command {
    & npx eas-cli update:republish --group $GroupId --destination-channel production --message 'Promovido después de aprobación en Preview'
  }

  Write-Host ''
  Write-Host 'Aprobado: los testers de Production ya pueden recibir esta versión.' -ForegroundColor Green
} finally {
  Pop-Location
}
