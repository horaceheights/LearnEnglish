param(
  [string]$GroupId,
  [string]$Confirmation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

function Get-RequiredProcessEnvironmentVariable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Publicación bloqueada: falta la variable requerida $Name. Production solamente se publica mediante GitHub Actions."
  }

  return $value.Trim()
}

function Get-RemoteMainAuthorityCommit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot
  )

  $remoteLines = @(& git -C $RepositoryRoot ls-remote --exit-code origin refs/heads/main)
  if ($LASTEXITCODE -ne 0 -or $remoteLines.Count -ne 1) {
    throw 'Publicación bloqueada: no se pudo comprobar el head remoto de main.'
  }

  $remoteCommit = (($remoteLines[0] -split '\s+')[0]).Trim()
  if ($remoteCommit -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'Publicación bloqueada: GitHub devolvió un commit inválido para main.'
  }

  return $remoteCommit.ToLowerInvariant()
}

function Assert-GitHubProductionPublishAuthority {
  if ((Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_ACTIONS') -cne 'true') {
    throw 'Publicación bloqueada: Production solamente se publica mediante GitHub Actions.'
  }
  if ((Get-RequiredProcessEnvironmentVariable -Name 'RUNNER_OS') -cne 'Windows') {
    throw 'Publicación bloqueada: el workflow autorizado debe ejecutarse en el runner Windows aprobado.'
  }
  if ((Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_EVENT_NAME') -cne 'workflow_dispatch') {
    throw 'Publicación bloqueada: Production requiere la ejecución manual del workflow protegido.'
  }

  $githubRef = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REF'
  if ($githubRef -cne 'refs/heads/main') {
    throw "Publicación bloqueada: la referencia autorizada es refs/heads/main, no $githubRef."
  }
  if ((Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REF_PROTECTED') -cne 'true') {
    throw 'Publicación bloqueada: main debe tener protección o un ruleset activo en GitHub.'
  }

  $githubRepository = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REPOSITORY'
  if (-not [string]::Equals($githubRepository, 'horaceheights/LearnEnglish', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: repositorio de GitHub inesperado ($githubRepository)."
  }

  $workflowRef = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_WORKFLOW_REF'
  $expectedWorkflowSuffix = '/.github/workflows/publish-production.yml@refs/heads/main'
  if (-not $workflowRef.EndsWith($expectedWorkflowSuffix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: workflow no autorizado ($workflowRef)."
  }

  $githubSha = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_SHA'
  if ($githubSha -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'Publicación bloqueada: GITHUB_SHA no contiene un commit completo válido.'
  }
  $githubSha = $githubSha.ToLowerInvariant()

  $null = Get-RequiredProcessEnvironmentVariable -Name 'EXPO_TOKEN'
  $sharedBackendStatusUrl = Get-RequiredProcessEnvironmentVariable -Name 'SHARED_BACKEND_STATUS_URL'
  $injectedCommit = Get-RequiredProcessEnvironmentVariable -Name 'EXPO_PUBLIC_RELEASE_COMMIT'
  if (-not [string]::Equals($injectedCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Publicación bloqueada: EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA.'
  }

  $repositoryRoot = Get-ReleaseRepositoryRoot
  $headCommit = (& git -C $repositoryRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or -not [string]::Equals($headCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Publicación bloqueada: GITHUB_SHA debe coincidir exactamente con HEAD.'
  }

  $remoteCommit = Get-RemoteMainAuthorityCommit -RepositoryRoot $repositoryRoot
  if (-not [string]::Equals($remoteCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: main avanzó a $($remoteCommit.Substring(0, 7)); este job todavía contiene $($githubSha.Substring(0, 7))."
  }

  return [PSCustomObject]@{
    Commit = $githubSha
    RepositoryRoot = $repositoryRoot
    SharedBackendStatusUrl = $sharedBackendStatusUrl
  }
}

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
    $observedCommit = [string]$groupUpdate.PSObject.Properties['gitCommitHash'].Value
    $observedPlatform = [string]$groupUpdate.PSObject.Properties['platform'].Value
    $observedBranch = [string]$groupUpdate.PSObject.Properties['branch'].Value
    $observedGroup = [string]$groupUpdate.PSObject.Properties['group'].Value
    $observedPlatforms += $observedPlatform

    if (-not [string]::Equals($observedCommit, $ExpectedCommit, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Promoción bloqueada. Preview contiene el commit '$observedCommit', pero main contiene '$ExpectedCommit'. Publica y prueba nuevamente el commit exacto de main."
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

function Assert-PublishedProductionCommit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedCommit
  )

  $summaryLines = @(& npx eas-cli update:list --branch production --limit 1 --non-interactive --json)
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada después de subir: no se pudo consultar Production.'
  }
  $summary = ($summaryLines -join [Environment]::NewLine) | ConvertFrom-Json
  $latest = @($summary.currentPage)
  if ($latest.Count -eq 0 -or [string]::IsNullOrWhiteSpace([string]$latest[0].group)) {
    throw 'Publicación bloqueada después de subir: Expo no devolvió el grupo de Production.'
  }

  $groupId = [string]$latest[0].group
  $detailLines = @(& npx eas-cli update:view $groupId --json)
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada después de subir: no se pudo verificar el grupo de Production.'
  }
  $updates = @(($detailLines -join [Environment]::NewLine) | ConvertFrom-Json)
  $platforms = @()
  foreach ($update in $updates) {
    $observedCommit = [string]$update.PSObject.Properties['gitCommitHash'].Value
    $observedBranch = [string]$update.PSObject.Properties['branch'].Value
    $platforms += [string]$update.PSObject.Properties['platform'].Value
    if (
      -not [string]::Equals($observedCommit, $ExpectedCommit, [System.StringComparison]::OrdinalIgnoreCase) -or
      -not [string]::Equals($observedBranch, 'production', [System.StringComparison]::OrdinalIgnoreCase)
    ) {
      throw "Publicación bloqueada después de subir: Production no coincide con main $ExpectedCommit."
    }
  }
  if (-not ($platforms -contains 'android' -and $platforms -contains 'ios')) {
    throw 'Publicación bloqueada después de subir: Production debe contener Android e iOS.'
  }

  Write-Host "Expo Production verificado: grupo $groupId, commit $($ExpectedCommit.Substring(0, 7)), Android e iOS." -ForegroundColor Green
}

if ($GroupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
  throw 'GroupId debe ser el identificador UUID mostrado por Expo al publicar Preview.'
}
if ($Confirmation -cne 'PUBLISH PRODUCTION') {
  throw 'Promoción bloqueada. El workflow debe recibir la confirmación exacta PUBLISH PRODUCTION después de la aprobación explícita del usuario.'
}

$authority = Assert-GitHubProductionPublishAuthority
Assert-MainReleaseLineage
Assert-CleanReleaseCommit

$mobileRoot = Split-Path -Parent $PSScriptRoot
Push-Location $mobileRoot
try {
  Write-Host 'Ejecutando la validación estricta de Production...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Promoción bloqueada. Faltan aprobaciones humanas vigentes o falló el preflight de Production.' -Command {
    & npm run verify:production
  }

  $authority = Assert-GitHubProductionPublishAuthority
  Assert-MainReleaseLineage
  Assert-CleanReleaseCommit
  Assert-SharedBackendRelease `
    -ExpectedCommit $authority.Commit `
    -RepositoryRoot $authority.RepositoryRoot `
    -StatusUrl $authority.SharedBackendStatusUrl
  Assert-TestedPreviewGroup -ExpectedGroup $GroupId -ExpectedCommit $authority.Commit

  Write-Host 'Enviando el bundle probado a Production...' -ForegroundColor Yellow
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo promover Preview a Production.' -Command {
    & npx eas-cli update:republish --group $GroupId --destination-channel production --message 'Promovido después de aprobación explícita en Preview'
  }
  Assert-PublishedProductionCommit -ExpectedCommit $authority.Commit

  Write-Host ''
  Write-Host 'Aprobado: los testers de Production ya pueden recibir esta versión.' -ForegroundColor Green
} finally {
  Pop-Location
}
