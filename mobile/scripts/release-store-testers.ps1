param(
  [Parameter(Mandatory = $true)][ValidateSet('build', 'verify', 'submit')][string]$Action,
  [ValidateSet('all', 'android', 'ios')][string]$Platform = 'all',
  [string]$AndroidBuildId,
  [string]$IosBuildId,
  [string]$GroupId,
  [string]$Confirmation = 'false'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'store-release-guard.ps1')

$authority = Assert-StoreReleaseAuthority
Assert-CleanReleaseCommit
Assert-MainReleaseLineage
$mobileRoot = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -Raw (Join-Path $mobileRoot 'app.json') | ConvertFrom-Json).expo.version
$config = Get-Content -Raw (Join-Path $mobileRoot 'eas.json') | ConvertFrom-Json
Assert-StoreSubmissionConfig -Config $config
$platforms = @('android', 'ios')
if ($Platform -ne 'all') { $platforms = @($Platform) }

Push-Location $mobileRoot
try {
  Assert-SharedBackendRelease -ExpectedCommit $authority.Commit -RepositoryRoot $authority.RepositoryRoot `
    -StatusUrl 'https://learnenglish-fxki.onrender.com/api/release/status'
  $authority = Assert-StoreReleaseAuthority
  if ($Action -eq 'build') {
    # Preparing binaries does not upload them to either store or change Expo updates.
    $builds = @(Invoke-StoreEasJson -Arguments @('build', '--profile', 'production', '--platform', $Platform,
      '--non-interactive', '--wait', '--json', '--message', "Store tester candidate $($authority.Commit)"))
    $authority = Assert-StoreReleaseAuthority
    if ($builds.Count -ne $platforms.Count) { throw 'EAS returned an unexpected number of builds.' }
    foreach ($target in $platforms) {
      $matching = @($builds | Where-Object { $_.platform -ceq $target.ToUpperInvariant() })
      if ($matching.Count -ne 1) { throw "Expected exactly one $target build." }
      $build = $matching[0]
      Assert-StoreBuild -Build $build -ExpectedId $build.id -ExpectedCommit $authority.Commit -ExpectedVersion $version -Platform $target
      "- ${target}: $($build.id), version $version ($($build.appBuildVersion)), commit $($authority.Commit)" | Add-Content $env:GITHUB_STEP_SUMMARY
    }
    'Binaries prepared only. Test the exact Preview and obtain explicit approval before running submit.' | Add-Content $env:GITHUB_STEP_SUMMARY
    return
  }

  Assert-StorePreviewApproval -GroupId $GroupId -ExpectedCommit $authority.Commit -ExpectedVersion $version -Confirmation $Confirmation
  $ids = @{ android = $AndroidBuildId; ios = $IosBuildId }
  # Validate every requested build before starting either submission.
  foreach ($target in $platforms) {
    if ($ids[$target] -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw "Missing valid $target build ID." }
    $build = Invoke-StoreEasJson -Arguments @('build:view', $ids[$target], '--json')
    Assert-StoreBuild -Build $build -ExpectedId $ids[$target] -ExpectedCommit $authority.Commit -ExpectedVersion $version -Platform $target
  }
  if ($Action -eq 'verify') {
    $authority = Assert-StoreReleaseAuthority
    foreach ($target in $platforms) {
      "- Verified for store-console upload: ${target} build $($ids[$target]), commit $($authority.Commit), Preview $GroupId." | Add-Content $env:GITHUB_STEP_SUMMARY
    }
    'Upload only these exact CI-built binaries to the existing tester tracks. Verify remote main again immediately before store submission.' | Add-Content $env:GITHUB_STEP_SUMMARY
    return
  }
  foreach ($target in $platforms) {
    # Recheck after a potentially long previous submission; never submit a stale second platform.
    $authority = Assert-StoreReleaseAuthority
    Assert-StorePreviewApproval -GroupId $GroupId -ExpectedCommit $authority.Commit -ExpectedVersion $version -Confirmation $Confirmation
    Invoke-CheckedCommand -FailureMessage "The $target store submission did not finish successfully." -Command {
      & eas submit --platform $target --profile production --id $ids[$target] --non-interactive --wait
    }
    "- ${target}: EAS Submit completed for build $($ids[$target]). Confirm store processing and tester availability in the console." | Add-Content $env:GITHUB_STEP_SUMMARY
  }
} finally {
  Pop-Location
}
