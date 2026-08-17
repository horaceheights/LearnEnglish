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
