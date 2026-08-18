Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

$repositoryRoot = Get-ReleaseRepositoryRoot
$mobileRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $repositoryRoot 'scripts\validate_lesson_cards.py'
$interactionVerifier = Join-Path $PSScriptRoot 'verify-interaction-paths.ps1'
$projectPython = Join-Path $repositoryRoot 'venv\Scripts\python.exe'
$pythonCommand = if (Test-Path -LiteralPath $projectPython) { $projectPython } else { 'python' }
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$exportDirectory = [System.IO.Path]::Combine(
  $temporaryRoot,
  "spanglish-preview-check-$([System.Guid]::NewGuid().ToString('N'))"
)

Write-Host 'Validando tarjetas y archivos multimedia...' -ForegroundColor Cyan
Push-Location $repositoryRoot
try {
  Invoke-CheckedCommand -FailureMessage 'La validación de contenido encontró errores.' -Command {
    & $pythonCommand $validator
  }
} finally {
  Pop-Location
}

Push-Location $mobileRoot
try {
  Write-Host 'Comprobando TypeScript...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'TypeScript encontró errores.' -Command {
    & npx tsc --noEmit
  }

  Write-Host 'Comprobando puntuación, reintentos y finalización...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Las pruebas de interacción encontraron errores.' -Command {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $interactionVerifier
  }

  Write-Host 'Comprobando el bundle Android de producción...' -ForegroundColor Cyan
  [System.IO.Directory]::CreateDirectory($exportDirectory) | Out-Null
  try {
    Invoke-CheckedCommand -FailureMessage 'Expo no pudo exportar el bundle Android.' -Command {
      & npx expo export --platform android --output-dir $exportDirectory
    }
  } finally {
    $resolvedExportDirectory = [System.IO.Path]::GetFullPath($exportDirectory)
    if (-not $resolvedExportDirectory.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Directorio temporal inesperado: $resolvedExportDirectory"
    }
    if (Test-Path -LiteralPath $resolvedExportDirectory) {
      Remove-Item -LiteralPath $resolvedExportDirectory -Recurse -Force
    }
  }
} finally {
  Pop-Location
}

Write-Host 'Preflight de Preview completado.' -ForegroundColor Green
