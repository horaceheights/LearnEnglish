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
  & npx tsc src/lessonHelp.ts src/lessonProgress.ts --ignoreConfig --module commonjs --outDir $outputDirectory --skipLibCheck --target ES2020
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el modelo de progreso.' }

  & node tests/lesson-help.test.cjs (Join-Path $outputDirectory 'lessonHelp.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de instrucciones de ayuda.' }

  & node tests/lesson-progress.test.cjs (Join-Path $outputDirectory 'lessonProgress.js')
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de puntuación e intentos.' }

  & node tests/section-review.test.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de repaso de secciones completadas.' }

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
