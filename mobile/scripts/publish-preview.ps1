param(
  [string]$Message
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
    throw "Publicación bloqueada: falta la variable requerida $Name. Preview solamente se publica mediante GitHub Actions."
  }

  return $value.Trim()
}

function Get-RemotePreviewAuthorityCommit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot
  )

  $remoteLines = @(& git -C $RepositoryRoot ls-remote --exit-code origin refs/heads/release/preview)
  if ($LASTEXITCODE -ne 0 -or $remoteLines.Count -ne 1) {
    throw 'Publicación bloqueada: no se pudo comprobar el head remoto de release/preview.'
  }

  $remoteCommit = (($remoteLines[0] -split '\s+')[0]).Trim()
  if ($remoteCommit -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'Publicación bloqueada: GitHub devolvió un commit inválido para release/preview.'
  }

  return $remoteCommit.ToLowerInvariant()
}

function Assert-GitHubPreviewPublishAuthority {
  $githubActions = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_ACTIONS'
  if ($githubActions -cne 'true') {
    throw 'Publicación bloqueada: Preview solamente se publica mediante GitHub Actions.'
  }

  $runnerOs = Get-RequiredProcessEnvironmentVariable -Name 'RUNNER_OS'
  if ($runnerOs -cne 'Windows') {
    throw 'Publicación bloqueada: el workflow autorizado debe ejecutarse en el runner Windows aprobado.'
  }

  $eventName = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_EVENT_NAME'
  if ($eventName -cne 'workflow_dispatch') {
    throw 'Publicación bloqueada: Preview requiere la ejecución manual del workflow protegido.'
  }

  $githubRef = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REF'
  if ($githubRef -cne 'refs/heads/release/preview') {
    throw "Publicación bloqueada: la referencia autorizada es refs/heads/release/preview, no $githubRef."
  }

  $githubRefProtected = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REF_PROTECTED'
  if ($githubRefProtected -cne 'true') {
    throw 'Publicación bloqueada: release/preview debe tener protección o un ruleset activo en GitHub.'
  }

  $githubRepository = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_REPOSITORY'
  if (-not [string]::Equals(
    $githubRepository,
    'horaceheights/LearnEnglish',
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
    throw "Publicación bloqueada: repositorio de GitHub inesperado ($githubRepository)."
  }

  $workflowRef = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_WORKFLOW_REF'
  $expectedWorkflowSuffix = '/.github/workflows/publish-preview.yml@refs/heads/release/preview'
  if (-not $workflowRef.EndsWith($expectedWorkflowSuffix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: workflow no autorizado ($workflowRef)."
  }

  $githubSha = Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_SHA'
  if ($githubSha -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'Publicación bloqueada: GITHUB_SHA no contiene un commit completo válido.'
  }
  $githubSha = $githubSha.ToLowerInvariant()

  $null = Get-RequiredProcessEnvironmentVariable -Name 'EXPO_TOKEN'
  $injectedCommit = Get-RequiredProcessEnvironmentVariable -Name 'EXPO_PUBLIC_RELEASE_COMMIT'
  if (-not [string]::Equals($injectedCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Publicación bloqueada: EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA.'
  }

  $repositoryRoot = Get-ReleaseRepositoryRoot
  $headCommit = (& git -C $repositoryRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $headCommit -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'Publicación bloqueada: no se pudo identificar HEAD.'
  }

  if (-not [string]::Equals($headCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: GITHUB_SHA ($($githubSha.Substring(0, 7))) no coincide con HEAD ($($headCommit.Substring(0, 7)))."
  }

  $remoteCommit = Get-RemotePreviewAuthorityCommit -RepositoryRoot $repositoryRoot
  if (-not [string]::Equals($remoteCommit, $githubSha, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: release/preview avanzó a $($remoteCommit.Substring(0, 7)); este job todavía contiene $($githubSha.Substring(0, 7))."
  }

  return [PSCustomObject]@{
    Commit = $githubSha
    RepositoryRoot = $repositoryRoot
  }
}

function Assert-PublishedPreviewCommit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedCommit
  )

  $attemptCount = 5
  $lastObservation = 'Expo todavía no devolvió un update.'
  for ($attempt = 1; $attempt -le $attemptCount; $attempt += 1) {
    $jsonLines = @(& eas update:list --branch preview --limit 1 --non-interactive --json)
    $queryExitCode = $LASTEXITCODE

    if ($queryExitCode -eq 0) {
      try {
        $response = ($jsonLines -join [Environment]::NewLine) | ConvertFrom-Json
        $currentPage = @($response.currentPage)
        if ($currentPage.Count -gt 0) {
          $latestUpdate = $currentPage[0]
          $commitProperty = $latestUpdate.PSObject.Properties['gitCommitHash']
          $groupProperty = $latestUpdate.PSObject.Properties['group']
          $observedCommit = if ($null -ne $commitProperty) { [string]$commitProperty.Value } else { '' }
          $observedGroup = if ($null -ne $groupProperty) { [string]$groupProperty.Value } else { '<sin grupo>' }
          $lastObservation = "grupo $observedGroup, commit $observedCommit"

          if ([string]::Equals(
            $observedCommit,
            $ExpectedCommit,
            [System.StringComparison]::OrdinalIgnoreCase
          )) {
            Write-Host "Expo verificado: grupo $observedGroup, commit $($ExpectedCommit.Substring(0, 7))." -ForegroundColor Green
            return
          }
        }
      } catch {
        $lastObservation = "respuesta JSON inválida: $($_.Exception.Message)"
      }
    } else {
      $lastObservation = "la consulta de Expo terminó con código $queryExitCode"
    }

    if ($attempt -lt $attemptCount) {
      Start-Sleep -Seconds 3
    }
  }

  throw "Publicación bloqueada después de subir: Expo no confirmó GITHUB_SHA $ExpectedCommit ($lastObservation)."
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  throw 'Incluye una descripción para el workflow manual de Preview.'
}

$authority = Assert-GitHubPreviewPublishAuthority
Assert-PreviewReleaseLineage
Assert-CleanReleaseCommit
$releaseCommit = $authority.Commit
$previousReleaseCommit = [Environment]::GetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', 'Process')
[Environment]::SetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', $releaseCommit, 'Process')
$mobileRoot = Split-Path -Parent $PSScriptRoot

Push-Location $mobileRoot
try {
  # Check the live remote head again immediately before the irreversible upload.
  $authority = Assert-GitHubPreviewPublishAuthority
  Assert-PreviewReleaseLineage
  Assert-CleanReleaseCommit

  Write-Host 'Publicando solamente en Preview...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Expo no pudo publicar la actualización de Preview.' -Command {
    & eas update --channel preview --environment preview --message $Message --non-interactive
  }

  Assert-PublishedPreviewCommit -ExpectedCommit $releaseCommit

  Write-Host ''
  Write-Host 'Preview publicado. Los testers de Production no recibieron este cambio.' -ForegroundColor Green
  Write-Host 'Abre SpanGlish Preview y selecciona Actualizar para probarlo.'
} finally {
  Pop-Location
  [Environment]::SetEnvironmentVariable('EXPO_PUBLIC_RELEASE_COMMIT', $previousReleaseCommit, 'Process')
}
