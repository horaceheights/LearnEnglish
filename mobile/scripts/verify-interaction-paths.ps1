Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$outputDirectory = [System.IO.Path]::Combine(
  $temporaryRoot,
  "spanglish-interaction-check-$([System.Guid]::NewGuid().ToString('N'))"
)

Push-Location $mobileRoot
try {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  & npx tsc src/config.ts src/lessonHelp.ts src/lessonMistakeHints.ts src/lessonProgress.ts src/sentenceTranslations.ts --ignoreConfig --module commonjs --outDir $outputDirectory --skipLibCheck --target ES2020
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el modelo de progreso.' }

  & node tests/lesson-help.test.cjs (Join-Path $outputDirectory 'lessonHelp.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de instrucciones de ayuda.' }

  & node tests/help-lifecycle.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de duración de la ayuda.' }

  & node tests/lesson-progress.test.cjs (Join-Path $outputDirectory 'lessonProgress.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de puntuación e intentos.' }

  & node tests/lesson-mistake-hints.test.cjs (Join-Path $outputDirectory 'lessonMistakeHints.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de pistas educativas.' }

  & node tests/sentence-translations.test.cjs (Join-Path $outputDirectory 'sentenceTranslations.js') (Join-Path $mobileRoot 'src\generated')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de traducción de oraciones.' }

  & node tests/section-review.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de repaso de secciones completadas.' }

  & node tests/image-loading-ui.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de carga visual de imágenes.' }

  & node tests/bundled-unit2-images.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de imágenes incluidas de la Unidad 2.' }

  & node tests/phrase-option-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de diseño horizontal de frases.' }

  & node tests/lesson-context-header.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de contexto de unidad y lección.' }

  & node tests/video-media-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de video unificado.' }

  & node tests/lesson-1-3-media.test.cjs (Join-Path $outputDirectory 'config.js')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de imagen y pronunciación de la lección 1.3.' }

  & node tests/audio-placeholder.test.cjs (Join-Path $outputDirectory 'config.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de espacios en audio.' }

  & node tests/diagnostics-noise.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de ruido en diagnósticos.' }

  & node tests/playful-loading.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de carga animada.' }

  & node tests/course-progress-state.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la distinción visual entre lecciones disponibles y completadas.' }

  & node tests/course-unit-level-label.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la ubicación única del nivel Beginner A1 en la unidad.' }

  & node tests/preview-qa-catalog-parity.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la paridad del catálogo entre Preview y Engine QA.' }

  & node tests/new-vocabulary-emphasis.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de énfasis para vocabulario nuevo.' }

  & node tests/pronunciation-lifecycle.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas del ciclo de pronunciación.' }
} finally {
  Pop-Location
  $resolvedOutputDirectory = [System.IO.Path]::GetFullPath($outputDirectory)
  if (-not $resolvedOutputDirectory.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Directorio temporal inesperado: $resolvedOutputDirectory"
  }
  if (Test-Path -LiteralPath $resolvedOutputDirectory) {
    Remove-Item -LiteralPath $resolvedOutputDirectory -Recurse -Force
  }
}
