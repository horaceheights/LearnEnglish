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

function Assert-SharedBackendRelease {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ExpectedCommit,
    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot,
    [Parameter(Mandatory = $true)]
    [string]$StatusUrl
  )

  try {
    $uri = [Uri]$StatusUrl
  } catch {
    throw 'Publicación bloqueada: SHARED_BACKEND_STATUS_URL no es una URL válida.'
  }
  if (
    $uri.Scheme -cne 'https' -or
    [string]::IsNullOrWhiteSpace($uri.Host) -or
    $uri.AbsolutePath -cne '/api/release/status'
  ) {
    throw 'Publicación bloqueada: el estado del backend compartido debe usar la ruta HTTPS autorizada.'
  }

  & git -C $RepositoryRoot fetch --no-tags origin refs/heads/main:refs/remotes/origin/main
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada: no se pudo actualizar origin/main.'
  }
  $remoteMainCommit = (& git -C $RepositoryRoot rev-parse refs/remotes/origin/main).Trim().ToLowerInvariant()
  if ($LASTEXITCODE -ne 0 -or $remoteMainCommit -notmatch '^[0-9a-f]{40}$') {
    throw 'Publicación bloqueada: origin/main no devolvió un commit válido.'
  }
  & git -C $RepositoryRoot merge-base --is-ancestor $ExpectedCommit $remoteMainCommit
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada: el candidato Preview todavía no está reconciliado en main para el backend compartido.'
  }

  $catalogPath = Join-Path $RepositoryRoot 'backend/approved-course-audio/catalog.json'
  $catalog = Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json
  # Git may check out text as CRLF on the Windows publisher while Render uses
  # LF. Hash normalized UTF-8 so identical versioned JSON has one identity.
  $catalogText = [System.IO.File]::ReadAllText($catalogPath).Replace("`r`n", "`n")
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $catalogHashBytes = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($catalogText))
  } finally {
    $sha256.Dispose()
  }
  $expectedCatalogSha256 = -join ($catalogHashBytes | ForEach-Object { $_.ToString('x2') })
  $expectedAssetCount = [int]$catalog.asset_count
  $lastObservation = 'el backend todavía no respondió.'

  for ($attempt = 1; $attempt -le 30; $attempt += 1) {
    try {
      $status = Invoke-RestMethod -Uri $StatusUrl -TimeoutSec 20
      $observedCommit = [string]$status.git_commit
      $observedBranch = [string]$status.git_branch
      $observedEnvironment = [string]$status.environment
      $audio = $status.audio
      $lastObservation = (
        "environment=$observedEnvironment, branch=$observedBranch, commit=$observedCommit, " +
        "catalog=$([string]$audio.catalog_sha256), assets=$([string]$audio.catalog_asset_count), " +
        "ready=$([string]$audio.ready), missing=$([string]$audio.missing), invalid=$([string]$audio.invalid)"
      )

      if (
        $observedEnvironment -ceq 'production' -and
        $observedBranch -ceq 'main' -and
        [string]::Equals($observedCommit, $remoteMainCommit, [System.StringComparison]::OrdinalIgnoreCase) -and
        [string]::Equals(
          [string]$audio.catalog_sha256,
          $expectedCatalogSha256,
          [System.StringComparison]::OrdinalIgnoreCase
        ) -and
        [int]$audio.catalog_asset_count -eq $expectedAssetCount -and
        [bool]$audio.ready -and
        [int]$audio.missing -eq 0 -and
        [int]$audio.invalid -eq 0 -and
        [int]$audio.error_count -eq 0
      ) {
        Write-Host "Backend compartido verificado: main $($remoteMainCommit.Substring(0, 7)), catálogo $($expectedCatalogSha256.Substring(0, 12)), $expectedAssetCount audios." -ForegroundColor Green
        return
      }
    } catch {
      $lastObservation = $_.Exception.Message
    }

    if ($attempt -lt 30) {
      Start-Sleep -Seconds 10
    }
  }

  throw "Publicación bloqueada: el backend compartido de main no coincide con el candidato o su audio no está listo ($lastObservation)."
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
  $sharedBackendStatusUrl = Get-RequiredProcessEnvironmentVariable -Name 'SHARED_BACKEND_STATUS_URL'
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
    SharedBackendStatusUrl = $sharedBackendStatusUrl
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
    $summaryLines = @(& eas update:list --branch preview --limit 1 --non-interactive --json)
    $summaryExitCode = $LASTEXITCODE

    if ($summaryExitCode -eq 0) {
      try {
        $summary = ($summaryLines -join [Environment]::NewLine) | ConvertFrom-Json
        $currentPage = @($summary.currentPage)
        if ($currentPage.Count -gt 0) {
          $latestSummary = $currentPage[0]
          $groupProperty = $latestSummary.PSObject.Properties['group']
          $observedGroup = if ($null -ne $groupProperty) { [string]$groupProperty.Value } else { '<sin grupo>' }

          if ($observedGroup -eq '<sin grupo>') {
            $lastObservation = 'el resumen de Expo no incluyó un grupo.'
          } else {
            # update:list intentionally returns summary rows without gitCommitHash.
            # Verify the immutable per-platform records from update:view instead.
            $detailLines = @(& eas update:view $observedGroup --json)
            $detailExitCode = $LASTEXITCODE
            if ($detailExitCode -eq 0) {
              $groupUpdates = @(($detailLines -join [Environment]::NewLine) | ConvertFrom-Json)
              $observedCommits = @()
              $observedPlatforms = @()
              $allMetadataMatches = $groupUpdates.Count -gt 0

              foreach ($groupUpdate in $groupUpdates) {
                $commitProperty = $groupUpdate.PSObject.Properties['gitCommitHash']
                $platformProperty = $groupUpdate.PSObject.Properties['platform']
                $branchProperty = $groupUpdate.PSObject.Properties['branch']
                $updateGroupProperty = $groupUpdate.PSObject.Properties['group']
                $observedCommit = if ($null -ne $commitProperty) { [string]$commitProperty.Value } else { '' }
                $observedPlatform = if ($null -ne $platformProperty) { [string]$platformProperty.Value } else { '' }
                $observedBranch = if ($null -ne $branchProperty) { [string]$branchProperty.Value } else { '' }
                $updateGroup = if ($null -ne $updateGroupProperty) { [string]$updateGroupProperty.Value } else { '' }
                $observedCommits += $observedCommit
                $observedPlatforms += $observedPlatform

                if (
                  -not [string]::Equals($observedCommit, $ExpectedCommit, [System.StringComparison]::OrdinalIgnoreCase) -or
                  -not [string]::Equals($observedBranch, 'preview', [System.StringComparison]::OrdinalIgnoreCase) -or
                  -not [string]::Equals($updateGroup, $observedGroup, [System.StringComparison]::OrdinalIgnoreCase)
                ) {
                  $allMetadataMatches = $false
                }
              }

              $commitSummary = @($observedCommits | Sort-Object -Unique) -join ','
              $platformSummary = @($observedPlatforms | Sort-Object -Unique) -join ','
              $lastObservation = "grupo $observedGroup, commits $commitSummary, plataformas $platformSummary"
              $hasBothPlatforms = $observedPlatforms -contains 'android' -and $observedPlatforms -contains 'ios'

              if ($allMetadataMatches -and $hasBothPlatforms) {
                Write-Host "Expo verificado: grupo $observedGroup, commit $($ExpectedCommit.Substring(0, 7)), Android e iOS." -ForegroundColor Green
                return
              }
            } else {
              $lastObservation = "update:view terminó con código $detailExitCode para el grupo $observedGroup"
            }
          }
        }
      } catch {
        $lastObservation = "respuesta JSON inválida: $($_.Exception.Message)"
      }
    } else {
      $lastObservation = "update:list terminó con código $summaryExitCode"
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
  Assert-SharedBackendRelease `
    -ExpectedCommit $authority.Commit `
    -RepositoryRoot $authority.RepositoryRoot `
    -StatusUrl $authority.SharedBackendStatusUrl

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
