param(
  [ValidateSet('Preview', 'Production')]
  [string]$ReviewPolicy = 'Preview'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

$repositoryRoot = Get-ReleaseRepositoryRoot
$mobileRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $repositoryRoot 'scripts\validate_lesson_cards.py'
$audioCastValidator = Join-Path $repositoryRoot 'scripts\validate_course_audio_cast.py'
$persistentAudioValidator = Join-Path $repositoryRoot 'scripts\validate_persistent_course_audio.py'
$videoFillValidator = Join-Path $repositoryRoot 'scripts\audit_video_full_bleed.py'
$interactionVerifier = Join-Path $PSScriptRoot 'verify-interaction-paths.ps1'
$typescriptCompiler = Join-Path $mobileRoot 'node_modules\typescript\bin\tsc'
$expoCli = Join-Path $mobileRoot 'node_modules\expo\bin\cli'
$projectPython = Join-Path $repositoryRoot 'venv\Scripts\python.exe'
$pythonCommand = if (Test-Path -LiteralPath $projectPython) { $projectPython } else { 'python' }
$semanticReviewPolicy = $ReviewPolicy.ToLowerInvariant()
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$exportDirectory = [System.IO.Path]::Combine(
  $temporaryRoot,
  "spanglish-preview-check-$([System.Guid]::NewGuid().ToString('N'))"
)

Write-Host "Validando tarjetas y archivos multimedia (política $ReviewPolicy)..." -ForegroundColor Cyan
Push-Location $repositoryRoot
try {
  Invoke-CheckedCommand -FailureMessage 'La prueba de detección de bandas falló.' -Command {
    & $pythonCommand (Join-Path $repositoryRoot 'scripts\test_video_full_bleed.py')
  }
  Invoke-CheckedCommand -FailureMessage 'Los videos contienen bandas vacías o archivos distintos entre web y móvil.' -Command {
    & $pythonCommand $videoFillValidator
  }
  Invoke-CheckedCommand -FailureMessage 'La validación de contenido encontró errores.' -Command {
    & $pythonCommand $validator --semantic-review-policy $semanticReviewPolicy
  }
  Invoke-CheckedCommand -FailureMessage 'La asignación de voces del curso encontró errores.' -Command {
    & $pythonCommand $audioCastValidator
  }
  Invoke-CheckedCommand -FailureMessage 'El audio persistente del curso está incompleto o es inválido.' -Command {
    & $pythonCommand $persistentAudioValidator
  }
} finally {
  Pop-Location
}

Push-Location $mobileRoot
try {
  Write-Host 'Comprobando TypeScript...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'TypeScript encontró errores.' -Command {
    & node $typescriptCompiler --noEmit
  }

  Write-Host 'Comprobando puntuación, reintentos y finalización...' -ForegroundColor Cyan
  Invoke-CheckedCommand -FailureMessage 'Las pruebas de interacción encontraron errores.' -Command {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $interactionVerifier -ReviewPolicy $ReviewPolicy
  }

  Write-Host 'Comprobando el bundle Android de producción...' -ForegroundColor Cyan
  [System.IO.Directory]::CreateDirectory($exportDirectory) | Out-Null
  try {
    Invoke-CheckedCommand -FailureMessage 'Expo no pudo exportar el bundle Android.' -Command {
      & node $expoCli export --platform android --output-dir $exportDirectory
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

Write-Host "Preflight de $ReviewPolicy completado." -ForegroundColor Green
