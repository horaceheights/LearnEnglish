const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '../..');
const guard = path.join(root, 'mobile/scripts/store-release-guard.ps1');
const script = fs.readFileSync(path.join(root, 'mobile/scripts/release-store-testers.ps1'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/release-store-testers.yml'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'mobile/eas.json'), 'utf8'));
const commit = 'a'.repeat(40);
const id = '11111111-1111-1111-1111-111111111111';
function exercise(cases, body, setup = '') {
  const result = spawnSync('pwsh.exe', ['-NoProfile', '-Command', `
    . $env:STORE_TEST_GUARD
    ${setup}
    $cases = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $results = foreach ($case in $cases) {
      try { ${body}; $accepted = $true }
      catch { $accepted = $false; if ($case.accepted) { [Console]::Error.WriteLine($_.Exception.Message) } }
      [pscustomobject]@{ name = $case.name; accepted = $accepted }
    }
    ConvertTo-Json -InputObject @($results) -Depth 8 -Compress
  `], { encoding: 'utf8', input: JSON.stringify(cases), env: {
    ...process.env, STORE_TEST_GUARD: guard, STORE_TEST_COMMIT: commit, STORE_TEST_ID: id,
  } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), cases.map(({ name, accepted }) => ({ name, accepted })), result.stderr);
}

test('store binaries require exact IDs, project, finished status, commit, runtime and store profile', () => {
  const build = { id, status: 'FINISHED', platform: 'ANDROID', project: { id: '898830f0-4e7c-4568-82da-7cfb25c97d8f' },
    gitCommitHash: commit, channel: 'production', buildProfile: 'production', distribution: 'STORE',
    appVersion: '1.8.0', runtimeVersion: '1.8.0', appBuildVersion: '19', isForIosSimulator: false,
    artifacts: { applicationArchiveUrl: 'https://expo.dev/test.aab' } };
  exercise([
    { name: 'exact Android', build, platform: 'android', accepted: true },
    { name: 'exact iOS', build: { ...build, platform: 'IOS' }, platform: 'ios', accepted: true },
    ...Object.entries({ id: '22222222-2222-2222-2222-222222222222', status: 'IN_PROGRESS',
      platform: 'IOS', project: { id: 'another-project' }, gitCommitHash: 'b'.repeat(40),
      channel: 'preview', buildProfile: 'preview', distribution: 'INTERNAL', appVersion: '1.6.0',
      runtimeVersion: '1.6.0', appBuildVersion: '', isForIosSimulator: true,
      artifacts: { applicationArchiveUrl: '' },
    }).map(([field, value]) => ({ name: `reject ${field}`, build: { ...build, [field]: value }, platform: 'android', accepted: false })),
    { name: 'missing metadata', build: { id }, platform: 'android', accepted: false },
  ], `Assert-StoreBuild -Build $case.build -ExpectedId $env:STORE_TEST_ID -ExpectedCommit $env:STORE_TEST_COMMIT -ExpectedVersion '1.8.0' -Platform $case.platform`);
});

test('submission refuses public tracks and another app identity', () => {
  exercise([
    { name: 'existing tester tracks', config, accepted: true },
    ...['production', 'beta', 'alpha'].map(track => ({ name: track, config: {
      submit: { production: { ...config.submit.production, android: { ...config.submit.production.android, track } } },
    }, accepted: false })),
    { name: 'wrong Apple app', config: { submit: { production: { ...config.submit.production, ios: { ascAppId: '1234' } } } }, accepted: false },
    { name: 'wrong Android app', config: { submit: { production: { ...config.submit.production,
      android: { ...config.submit.production.android, applicationId: 'another.app' } } } }, accepted: false },
  ], 'Assert-StoreSubmissionConfig -Config $case.config');
});

test('store submission binds explicit approval to latest immutable Preview on both platforms', () => {
  const android = { platform: 'android', group: id, branch: 'preview', gitCommitHash: commit, runtimeVersion: '1.8.0' };
  const ios = { ...android, platform: 'ios' };
  const valid = { latest: id, confirmation: 'true', updates: [android, ios] };
  exercise([
    { name: 'approved exact group', ...valid, accepted: true },
    { name: 'no approval', ...valid, confirmation: 'false', accepted: false },
    { name: 'old group', ...valid, latest: 'another', accepted: false },
    { name: 'missing iOS', ...valid, updates: [android], accepted: false },
    { name: 'duplicate', ...valid, updates: [android, android], accepted: false },
    ...Object.entries({ group: 'another', branch: 'production', gitCommitHash: 'b'.repeat(40), runtimeVersion: '1.6.0' })
      .map(([field, value]) => ({ name: `wrong ${field}`, ...valid, updates: [android, { ...ios, [field]: value }], accepted: false })),
  ], `Assert-StorePreviewApproval -GroupId $env:STORE_TEST_ID -ExpectedCommit $env:STORE_TEST_COMMIT -ExpectedVersion '1.8.0' -Confirmation $case.confirmation`, `
    function Invoke-StoreEasJson {
      param([string[]]$Arguments)
      if ($Arguments[0] -eq 'update:list') { return @{ currentPage = @(@{ group = $case.latest }) } }
      return $case.updates
    }
  `);
});

test('store authority rejects local, unprotected, wrong workflow and stale remote candidates', () => {
  const valid = { GITHUB_ACTIONS: 'true', RUNNER_OS: 'Windows', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main', GITHUB_REF_PROTECTED: 'true', GITHUB_REPOSITORY: 'horaceheights/LearnEnglish',
    GITHUB_WORKFLOW_REF: 'horaceheights/LearnEnglish/.github/workflows/release-store-testers.yml@refs/heads/main',
    EXPO_TOKEN: 'test-only', GITHUB_SHA: commit, EXPO_PUBLIC_RELEASE_COMMIT: commit };
  exercise([
    { name: 'protected exact head', env: valid, remote: commit, head: commit, accepted: true },
    ...Object.keys(valid).map(key => ({ name: `reject ${key}`, env: { ...valid, [key]: '' }, remote: commit, head: commit, accepted: false })),
    { name: 'stale remote', env: valid, remote: 'b'.repeat(40), head: commit, accepted: false },
    { name: 'wrong checkout', env: valid, remote: commit, head: 'b'.repeat(40), accepted: false },
  ], `
    foreach ($property in $case.env.PSObject.Properties) { [Environment]::SetEnvironmentVariable($property.Name, $property.Value, 'Process') }
    $null = Assert-StoreReleaseAuthority
  `, `
    function Get-ReleaseRepositoryRoot { return 'test-repository' }
    function git {
      $global:LASTEXITCODE = 0
      if ($args -contains 'ls-remote') { return "$($case.remote) refs/heads/main" }
      return $case.head
    }
  `);
});

test('EAS metadata errors fail closed even if stdout contains valid JSON', () => {
  exercise([
    { name: 'successful query', exitCode: 0, accepted: true },
    { name: 'failed query', exitCode: 1, accepted: false },
  ], `$null = Invoke-StoreEasJson -Arguments @('build:view', $env:STORE_TEST_ID, '--json')`, `
    function eas { $global:LASTEXITCODE = $case.exitCode; return '{"status":"FINISHED"}' }
  `);
});

test('protected workflow separates builds from exact-ID submissions and retains release checks', () => {
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+(push|pull_request|schedule):/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /group: spanglish-production-publication\s+cancel-in-progress: false/);
  assert.match(workflow, /environment:\s*\n\s*name: preview-release/);
  assert.match(workflow, /EXPO_PUBLIC_RELEASE_COMMIT: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /node mobile\/scripts\/verify-release-integrity.cjs/);
  assert.match(workflow, /python scripts\/verify_cloudflare_media.py/);
  assert.match(workflow, /python -m unittest discover -s backend\/tests/);
  assert.match(workflow, /npm.cmd run verify:production/);
  assert.match(workflow, /eas-version: 21.4.0/);
  for (const line of workflow.split('\n').filter(line => line.includes('uses:'))) {
    assert.match(line, /uses: [\w/-]+@[0-9a-f]{40}/);
  }
  assert.doesNotMatch(workflow, /run:.*\$\{\{ inputs\./);
  assert.match(script, /Assert-SharedBackendRelease/);
  assert.match(script, /Assert-CleanReleaseCommit/);
  assert.match(script, /Assert-MainReleaseLineage/);
  assert.match(script, /eas submit --platform \$target --profile production --id \$ids\[\$target\] --non-interactive --wait/);
  assert.doesNotMatch(script, /--latest|--auto-submit|eas update|EAS_NO_VCS|npx/);
  assert.ok(script.indexOf('Assert-StoreBuild -Build $build -ExpectedId $ids[$target]') < script.indexOf('& eas submit'));
  const submitLoop = script.slice(script.lastIndexOf('foreach ($target in $platforms)'));
  assert.ok(submitLoop.indexOf('Assert-StoreReleaseAuthority') < submitLoop.indexOf('& eas submit'));
  assert.ok(submitLoop.indexOf('Assert-StorePreviewApproval') < submitLoop.indexOf('& eas submit'));
});
