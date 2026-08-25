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

function Assert-PreviewReleaseLineage {
  $repositoryRoot = Get-ReleaseRepositoryRoot
  $authorityBranch = 'origin/release/preview'

  & git -C $repositoryRoot rev-parse --verify --quiet $authorityBranch | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "No se encontró la autoridad de Preview ($authorityBranch). Ejecuta git fetch origin release/preview antes de publicar."
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
    throw "Publicación bloqueada: HEAD ($($headCommit.Substring(0, 7))) debe ser exactamente el commit autorizado por $authorityBranch ($($authorityCommit.Substring(0, 7))). Integra y verifica el cambio, después actualiza la rama dedicada release/preview antes de publicar."
  }

  Assert-PreviewReleaseIntegrity
  Write-Host "Autoridad de Preview verificada: $authorityBranch en $($headCommit.Substring(0, 7))" -ForegroundColor Green
}

function Assert-PreviewReleaseIntegrity {
  $repositoryRoot = Get-ReleaseRepositoryRoot
  $integrityVerifier = Join-Path $repositoryRoot 'mobile\scripts\verify-release-integrity.cjs'

  if (-not (Test-Path -LiteralPath $integrityVerifier)) {
    throw "Publicación bloqueada: falta el verificador de integridad ($integrityVerifier)."
  }

  & node $integrityVerifier --repository-root $repositoryRoot
  if ($LASTEXITCODE -ne 0) {
    throw 'Publicación bloqueada: el contenido de Preview no coincide con el manifiesto versionado de integridad.'
  }
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
