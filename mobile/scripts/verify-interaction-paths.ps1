param(
  [ValidateSet('Preview', 'Production')]
  [string]$ReviewPolicy = 'Production'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mobileRoot = Split-Path -Parent $PSScriptRoot
$typescriptCompiler = Join-Path $mobileRoot 'node_modules\typescript\bin\tsc'
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$outputDirectory = [System.IO.Path]::Combine(
  $temporaryRoot,
  "spanglish-interaction-check-$([System.Guid]::NewGuid().ToString('N'))"
)

Push-Location $mobileRoot
try {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
  & node $typescriptCompiler src/config.ts src/lessonHelp.ts src/lessonMistakeHints.ts src/lessonProgress.ts src/pronunciationAudioGate.ts src/sentenceTranslations.ts --ignoreConfig --module commonjs --outDir $outputDirectory --skipLibCheck --target ES2020
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

  & node tests/bundled-a1-images.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de imágenes A1 incluidas en Preview.' }

  & node tests/lesson-media-semantics.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la protección semántica de imágenes de lecciones.' }

  & node tests/lesson-browser-visuals.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de imágenes específicas para cada lección.' }

  & node tests/phrase-option-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de diseño horizontal de frases.' }

  & node tests/text-tile-option-limit.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló el límite global de tres opciones de texto.' }

  & node tests/option-media-standard.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la prueba global de imágenes 3:2 en opciones.' }

  $fourCardReviewArguments = @('tests/four-card-media-review.test.cjs')
  if ($ReviewPolicy -eq 'Preview') {
    $fourCardReviewArguments += '--allow-pending-review'
  }
  & node @fourCardReviewArguments
  if ($LASTEXITCODE -ne 0) { throw 'Falló la revisión semántica de imágenes para la cuadrícula 2x2.' }

  & node tests/lesson-media-frame.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación global de marcos para imágenes de lecciones.' }

  & node tests/image-choice-feedback-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la protección de espacio para pistas bajo opciones visuales.' }

  & node tests/lesson-context-header.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de contexto de unidad y lección.' }

  & node tests/tablet-lesson-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la protección de diseño para encabezados grandes en teléfonos y tabletas.' }

  & node tests/logo-home-navigation.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de navegación del logo a Inicio.' }

  & node tests/startup-update-notification.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de confirmación de actualización.' }

  & node tests/preview-release-lineage.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la protección de la línea canónica de Preview.' }

  & node tests/preview-release-authority.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la autoridad protegida de publicación de Preview.' }

  & node tests/video-media-layout.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de video unificado.' }

  & node tests/lesson-1-3-media.test.cjs (Join-Path $outputDirectory 'config.js')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación de imagen y pronunciación de la lección 1.3.' }

  & node tests/lesson-2-6-audio.test.cjs (Join-Path $outputDirectory 'config.js')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación del audio corregido de One en la lección 2.6.' }

  & node tests/course-audio-cast.test.cjs (Join-Path $outputDirectory 'config.js')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación completa del reparto de voces del curso.' }

  & node tests/correct-answer-audio.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la confirmación hablada después de una respuesta correcta.' }
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

  & node tests/engine-qa-navigation.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló la navegación compacta y persistente de Engine QA.' }

  & node tests/new-vocabulary-emphasis.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de énfasis para vocabulario nuevo.' }

  & node tests/negative-contrast-feedback.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de confirmación completa para negaciones.' }

  & node tests/pronunciation-lifecycle.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas del ciclo de pronunciación.' }

  & node tests/pronunciation-audio-gate.test.cjs (Join-Path $outputDirectory 'pronunciationAudioGate.js')
  if ($LASTEXITCODE -ne 0) { throw 'Falló la precarga consecutiva de modelos de pronunciación.' }

  & node tests/pronunciation-media-frame.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Falló el marco compartido de imágenes de pronunciación.' }
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
