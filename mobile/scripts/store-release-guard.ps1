Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'release-guard.ps1')

function Assert-StoreReleaseAuthority {
  $required = @{
    GITHUB_ACTIONS = 'true'; RUNNER_OS = 'Windows'; GITHUB_EVENT_NAME = 'workflow_dispatch'
    GITHUB_REF = 'refs/heads/main'; GITHUB_REF_PROTECTED = 'true'
    GITHUB_REPOSITORY = 'horaceheights/LearnEnglish'
    GITHUB_WORKFLOW_REF = 'horaceheights/LearnEnglish/.github/workflows/release-store-testers.yml@refs/heads/main'
  }
  foreach ($name in $required.Keys) {
    if ([Environment]::GetEnvironmentVariable($name, 'Process') -cne $required[$name]) {
      throw "Store release requires the protected main workflow ($name)."
    }
  }
  if ([string]::IsNullOrWhiteSpace($env:EXPO_TOKEN) -or
      $env:GITHUB_SHA -cnotmatch '^[0-9a-f]{40}$' -or
      $env:EXPO_PUBLIC_RELEASE_COMMIT -cne $env:GITHUB_SHA) {
    throw 'Store release requires the CI credential and exact release commit label.'
  }
  $root = Get-ReleaseRepositoryRoot
  $head = (& git -C $root rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $head -cne $env:GITHUB_SHA) { throw 'Checkout does not match GITHUB_SHA.' }
  $remote = @(& git -C $root ls-remote --exit-code origin refs/heads/main)
  if ($LASTEXITCODE -ne 0 -or $remote.Count -ne 1 -or
      ($remote[0] -split '\s+')[0] -cne $head) {
    throw 'Remote main advanced or could not be verified. Prepare the new exact candidate.'
  }
  return [pscustomobject]@{ Commit = $head; RepositoryRoot = $root }
}

function Invoke-StoreEasJson {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  $lines = @(& eas @Arguments)
  if ($LASTEXITCODE -ne 0) { throw "EAS command failed: $($Arguments[0])." }
  return (($lines -join [Environment]::NewLine) | ConvertFrom-Json)
}

function Assert-StoreBuild {
  param(
    [Parameter(Mandatory = $true)]$Build,
    [Parameter(Mandatory = $true)][string]$ExpectedId,
    [Parameter(Mandatory = $true)][string]$ExpectedCommit,
    [Parameter(Mandatory = $true)][string]$ExpectedVersion,
    [Parameter(Mandatory = $true)][ValidateSet('android', 'ios')][string]$Platform
  )
  if ($ExpectedId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' -or
      $Build.id -cne $ExpectedId -or $Build.status -cne 'FINISHED' -or
      $Build.project.id -cne '898830f0-4e7c-4568-82da-7cfb25c97d8f' -or
      $Build.gitCommitHash -cne $ExpectedCommit -or $Build.platform -cne $Platform.ToUpperInvariant() -or
      $Build.buildProfile -cne 'production' -or $Build.channel -cne 'production' -or
      $Build.distribution -cne 'STORE' -or $Build.appVersion -cne $ExpectedVersion -or
      $Build.runtimeVersion -cne $ExpectedVersion -or [string]::IsNullOrWhiteSpace($Build.appBuildVersion) -or
      $Build.artifacts.applicationArchiveUrl -notmatch '^https://' -or $Build.isForIosSimulator -eq $true) {
    throw "The $Platform build does not match the exact finished store candidate."
  }
}

function Assert-StoreSubmissionConfig {
  param([Parameter(Mandatory = $true)]$Config)
  $profile = $Config.submit.production
  if ($profile.android.track -cne 'internal' -or $profile.android.releaseStatus -cne 'completed' -or
      $profile.android.applicationId -cne 'com.gorre.spanglish' -or
      $profile.ios.ascAppId -cne '6800510214') {
    throw 'Store submission is restricted to SpanGlish Google Play internal testing and TestFlight.'
  }
}

function Assert-StorePreviewApproval {
  param(
    [Parameter(Mandatory = $true)][string]$GroupId,
    [Parameter(Mandatory = $true)][string]$ExpectedCommit,
    [Parameter(Mandatory = $true)][string]$ExpectedVersion,
    [Parameter(Mandatory = $true)][string]$Confirmation
  )
  if ($Confirmation -cne 'true' -or $GroupId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') {
    throw 'Submission needs explicit approval after testing this exact Preview group.'
  }
  $latest = Invoke-StoreEasJson -Arguments @('update:list', '--branch', 'preview', '--limit', '1', '--non-interactive', '--json')
  if (@($latest.currentPage).Count -eq 0 -or $latest.currentPage[0].group -cne $GroupId) {
    throw 'The approved group is not the latest Preview.'
  }
  $updates = @(Invoke-StoreEasJson -Arguments @('update:view', $GroupId, '--json'))
  if ($updates.Count -ne 2) { throw 'Preview requires exactly one Android and one iOS update.' }
  foreach ($platform in @('android', 'ios')) {
    $matching = @($updates | Where-Object { $_.platform -ceq $platform })
    if ($matching.Count -ne 1 -or $matching[0].group -cne $GroupId -or
        $matching[0].branch -cne 'preview' -or $matching[0].gitCommitHash -cne $ExpectedCommit -or
        $matching[0].runtimeVersion -cne $ExpectedVersion) {
      throw 'Preview does not match the exact main commit, runtime and platforms.'
    }
  }
}
