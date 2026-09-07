Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ReleaseRepositoryRoot {
  $repositoryRoot = (& git rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repositoryRoot)) {
    throw 'No se pudo encontrar el repositorio Git.'
  }

  return $repositoryRoot.Trim()
}

function Assert-CleanReleaseCommit {
  $repositoryRoot = Get-ReleaseRepositoryRoot
  $statusLines = @(& git -C $repositoryRoot status --porcelain=v1 --untracked-files=all)
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo comprobar el estado de Git.'
  }

  if ($statusLines.Count -gt 0) {
    Write-Host ''
    Write-Host 'Publicación bloqueada: hay archivos sin commit:' -ForegroundColor Red
    $statusLines | ForEach-Object { Write-Host "  $_" }
    Write-Host ''
    throw 'Guarda los cambios en un commit antes de publicar. Esto evita versiones imposibles de reproducir.'
  }

  $remoteBranches = @(& git -C $repositoryRoot branch -r --contains HEAD)
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo comprobar si el commit está respaldado en GitHub.'
  }

  if (-not ($remoteBranches | Where-Object { $_.Trim().StartsWith('origin/') })) {
    throw 'El commit actual todavía no está en GitHub. Haz push antes de publicar.'
  }

  $commit = (& git -C $repositoryRoot log -1 --format='%h %s').Trim()
  Write-Host "Commit verificado: $commit" -ForegroundColor Green
}

function Assert-MainReleaseLineage {
  $repositoryRoot = Get-ReleaseRepositoryRoot
  $authorityBranch = 'origin/main'

  & git -C $repositoryRoot rev-parse --verify --quiet $authorityBranch | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "No se encontró la autoridad de publicación ($authorityBranch). Ejecuta git fetch origin main antes de publicar."
  }

  $headCommit = (& git -C $repositoryRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($headCommit)) {
    throw 'No se pudo identificar el commit que se intenta publicar.'
  }

  $authorityCommit = (& git -C $repositoryRoot rev-parse $authorityBranch).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($authorityCommit)) {
    throw "No se pudo identificar el commit autorizado en $authorityBranch."
  }

  if ($headCommit -ne $authorityCommit) {
    throw "Publicación bloqueada: HEAD ($($headCommit.Substring(0, 7))) debe ser exactamente el commit autorizado por $authorityBranch ($($authorityCommit.Substring(0, 7))). Integra y verifica el cambio en main antes de publicar."
  }

  Assert-ReleaseIntegrity
  Write-Host "Autoridad de publicación verificada: $authorityBranch en $($headCommit.Substring(0, 7))" -ForegroundColor Green
}

function Assert-ReleaseIntegrity {
  $repositoryRoot = Get-ReleaseRepositoryRoot
  $integrityVerifier = Join-Path $repositoryRoot 'mobile\scripts\verify-release-integrity.cjs'

  if (-not (Test-Path -LiteralPath $integrityVerifier)) {
    throw "Publicación bloqueada: falta el verificador de integridad ($integrityVerifier)."
  }

  & node $integrityVerifier --repository-root $repositoryRoot
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada: el contenido no coincide con el manifiesto versionado de integridad.'
  }
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
  if (-not [string]::Equals($ExpectedCommit, $remoteMainCommit, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Publicación bloqueada: el candidato debe ser exactamente origin/main ($remoteMainCommit), no $ExpectedCommit."
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

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command,

    [Parameter(Mandatory = $true)]
    [string]$FailureMessage
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw $FailureMessage
  }
}
