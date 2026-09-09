const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '../..');
const workflowsRoot = path.join(repositoryRoot, '.github/workflows');
const integritySource = fs.readFileSync(path.join(workflowsRoot, 'preview-integrity.yml'), 'utf8');
const publishWorkflowSource = fs.readFileSync(path.join(workflowsRoot, 'publish-preview.yml'), 'utf8');
const productionWorkflowSource = fs.readFileSync(
  path.join(workflowsRoot, 'publish-production.yml'),
  'utf8',
);
const publishScriptSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/publish-preview.ps1'),
  'utf8',
);
const releaseGuardSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/release-guard.ps1'),
  'utf8',
);
const promoteScriptSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/promote-preview.ps1'),
  'utf8',
);
const previewVerifierSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/verify-preview.ps1'),
  'utf8',
);
const interactionVerifierSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/verify-interaction-paths.ps1'),
  'utf8',
);
const semanticValidatorSource = fs.readFileSync(
  path.join(repositoryRoot, 'scripts/validate_lesson_cards.py'),
  'utf8',
);
const projectGuardrailsSource = fs.readFileSync(
  path.join(repositoryRoot, 'docs/product/project-guardrails.md'),
  'utf8',
);
const releaseGuideSource = fs.readFileSync(path.join(repositoryRoot, 'mobile/RELEASE.md'), 'utf8');
const agentsSource = fs.readFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'utf8');
const hygieneGuideSource = fs.readFileSync(
  path.join(repositoryRoot, 'docs/maintenance/repository-hygiene.md'),
  'utf8',
);
const audioOperationsSource = fs.readFileSync(
  path.join(repositoryRoot, 'docs/operations/persistent-course-audio.md'),
  'utf8',
);
const hygieneScriptSource = fs.readFileSync(
  path.join(repositoryRoot, 'scripts/audit-repository-hygiene.ps1'),
  'utf8',
);
const audioExporterSource = fs.readFileSync(
  path.join(repositoryRoot, 'scripts/export_persistent_audio_catalog.py'),
  'utf8',
);
const backendMainSource = fs.readFileSync(path.join(repositoryRoot, 'backend/app/main.py'), 'utf8');
const mobilePackage = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'mobile/package.json'), 'utf8'),
);
const codeownersSource = fs.readFileSync(path.join(repositoryRoot, '.github/CODEOWNERS'), 'utf8');
const pinnedActions = {
  checkout: 'd23441a48e516b6c34aea4fa41551a30e30af803',
  setupNode: '249970729cb0ef3589644e2896645e5dc5ba9c38',
  setupPython: 'ece7cb06caefa5fff74198d8649806c4678c61a1',
  expo: 'eab7a230208c952974db8c3245cfd78402c7b385',
};

test('native Preview uses the same protected publisher and verifies both exact-commit builds', () => {
  assert.match(publishWorkflowSource, /delivery:[\s\S]*?native-build/);
  assert.match(publishScriptSource, /ValidateSet\('update', 'native-build'\)/);
  const build = publishScriptSource.slice(publishScriptSource.indexOf("if ($Delivery -eq 'native-build')"));
  assert.match(build, /eas build --profile preview --platform all --non-interactive --wait --json/);
  assert.match(build, /\$build\.gitCommitHash -cne \$releaseCommit/);
  assert.match(build, /\$build\.status -cne 'FINISHED'/);
  assert.match(build, /\$build\.channel -cne 'preview'/);
  assert.match(build, /\$platforms -notcontains 'ANDROID' -or \$platforms -notcontains 'IOS'/);
  assert.ok(publishScriptSource.indexOf('Assert-SharedBackendRelease `') < publishScriptSource.indexOf("if ($Delivery -eq 'native-build')"));
  assert.doesNotMatch(build, /EAS_NO_VCS/);
  const ignore = require('ignore')().add(fs.readFileSync(path.join(repositoryRoot, '.easignore'), 'utf8'));
  for (const excluded of ['backend/app/main.py', 'frontend/app/page.js', '.codex-task-worktrees/task/mobile/app.json', 'mobile/node_modules/react/index.js', 'mobile/.env.local']) {
    assert.equal(ignore.ignores(excluded), true, excluded);
  }
  for (const included of ['mobile/src/pageCurlGeometry.ts', 'mobile/package-lock.json', 'mobile/assets/icon.png']) {
    assert.equal(ignore.ignores(included), false, included);
  }
  // EAS walks the archive directory by directory and tests the bare entry, so an
  // excluded "mobile" prunes the app before any file below it is considered.
  for (const included of ['mobile', 'mobile/src', 'mobile/assets']) {
    assert.equal(ignore.ignores(included), false, included);
  }
});

test('main runs full integrity checks on pull requests and pushes', () => {
  assert.match(integritySource, /pull_request:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(integritySource, /push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.doesNotMatch(integritySource, /release\/preview/);
  assert.match(integritySource, /permissions:[\s\S]*?contents: read/);
  assert.match(integritySource, /runs-on: windows-latest/);
  assert.match(integritySource, new RegExp(`actions/checkout@${pinnedActions.checkout} # v6[\\s\\S]*?fetch-depth: 0`));
  assert.match(integritySource, new RegExp(`actions/setup-python@${pinnedActions.setupPython} # v6`));
  assert.match(integritySource, new RegExp(`actions/setup-node@${pinnedActions.setupNode} # v6`));
  assert.match(integritySource, /node mobile\/scripts\/verify-release-integrity\.cjs --repository-root \./);
  assert.match(integritySource, /python -m pip install --requirement backend\/requirements\.txt/);
  assert.match(integritySource, /working-directory: mobile[\s\S]*?run: npm ci/);
  assert.match(integritySource, /python -m unittest discover -s backend\/tests/);
  assert.match(integritySource, /working-directory: mobile[\s\S]*?run: npm run verify:preview/);
  assert.doesNotMatch(integritySource, /eas update/);
});

test('manual Preview publication is serialized and bound to protected main and the protected environment', () => {
  assert.match(publishWorkflowSource, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(publishWorkflowSource, /\n\s+(?:push|pull_request|schedule):/);
  assert.match(publishWorkflowSource, /cancel-in-progress: false/);
  assert.match(publishWorkflowSource, /refs\/heads\/main/);
  assert.doesNotMatch(publishWorkflowSource, /release\/preview/);
  assert.match(publishWorkflowSource, /github\.ref_protected/);
  assert.match(publishWorkflowSource, /environment:\s*\n\s*name: preview-release/);
  assert.match(publishWorkflowSource, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
  assert.match(
    publishWorkflowSource,
    /SHARED_BACKEND_STATUS_URL: https:\/\/learnenglish-fxki\.onrender\.com\/api\/release\/status/,
  );
  const publishJobEnvironment = publishWorkflowSource.match(/\n    env:\n((?:      [^\n]*\n)+)/)?.[1] || '';
  assert.doesNotMatch(
    publishJobEnvironment,
    /EXPO_TOKEN/,
    'The protected Expo credential must not be visible to installs or repository tests.',
  );
  assert.equal(
    publishWorkflowSource.match(/\$\{\{ secrets\.EXPO_TOKEN \}\}/g)?.length,
    2,
    'Only the pinned Expo setup action and final publisher may receive EXPO_TOKEN.',
  );
  assert.match(publishWorkflowSource, /EXPO_PUBLIC_RELEASE_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(publishWorkflowSource, /runs-on: windows-latest/);
  assert.match(publishWorkflowSource, new RegExp(`actions/checkout@${pinnedActions.checkout} # v6[\\s\\S]*?fetch-depth: 0[\\s\\S]*?ref: \\$\\{\\{ github\\.sha \\}\\}`));
  assert.match(publishWorkflowSource, new RegExp(`actions/setup-python@${pinnedActions.setupPython} # v6`));
  assert.match(publishWorkflowSource, new RegExp(`actions/setup-node@${pinnedActions.setupNode} # v6`));
  assert.match(publishWorkflowSource, new RegExp(`expo/expo-github-action@${pinnedActions.expo} # v9`));
  assert.match(publishWorkflowSource, /eas-version: 21\.4\.0/);
  assert.match(publishWorkflowSource, /node mobile\/scripts\/verify-release-integrity\.cjs --repository-root \./);
  assert.match(publishWorkflowSource, /python -m pip install --requirement backend\/requirements\.txt/);
  assert.match(publishWorkflowSource, /working-directory: mobile[\s\S]*?run: npm ci/);
  assert.match(publishWorkflowSource, /run: npm run verify:preview/);
  assert.match(
    publishWorkflowSource,
    new RegExp(`run: npm run verify:preview[\\s\\S]*?expo/expo-github-action@${pinnedActions.expo}[\\s\\S]*?publish-preview\\.ps1`),
    'No Expo credential may be initialized before dependency installation and repository verification finish.',
  );
  assert.match(publishWorkflowSource, /publish-preview\.ps1 -Message \$env:RELEASE_MESSAGE/);
  assert.doesNotMatch(publishWorkflowSource, /run:\s*(?:npx\s+)?eas(?:-cli)?\s+update/);
});

test('the publisher fails closed outside the exact GitHub release authority', () => {
  for (const requiredVariable of [
    'GITHUB_ACTIONS',
    'RUNNER_OS',
    'GITHUB_EVENT_NAME',
    'GITHUB_REF',
    'GITHUB_REF_PROTECTED',
    'GITHUB_REPOSITORY',
    'GITHUB_WORKFLOW_REF',
    'GITHUB_SHA',
    'EXPO_TOKEN',
    'EXPO_PUBLIC_RELEASE_COMMIT',
    'SHARED_BACKEND_STATUS_URL',
  ]) {
    assert.match(publishScriptSource, new RegExp(`-Name '${requiredVariable}'`));
  }

  assert.match(publishScriptSource, /refs\/heads\/main/);
  assert.match(publishScriptSource, /main debe tener protección o un ruleset activo/);
  assert.match(publishScriptSource, /\.github\/workflows\/publish-preview\.yml@refs\/heads\/main/);
  assert.match(publishScriptSource, /rev-parse HEAD/);
  assert.match(publishScriptSource, /ls-remote --exit-code origin refs\/heads\/main/);
  assert.match(publishScriptSource, /EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA/);
  assert.match(releaseGuardSource, /function Assert-SharedBackendRelease/);
  assert.match(releaseGuardSource, /\/api\/release\/status/);
  assert.match(releaseGuardSource, /refs\/heads\/main:refs\/remotes\/origin\/main/);
  assert.match(releaseGuardSource, /\[string\]::Equals\(\$ExpectedCommit, \$remoteMainCommit/);
  assert.match(releaseGuardSource, /\$observedEnvironment -ceq 'production'/);
  assert.match(releaseGuardSource, /\$observedBranch -ceq 'main'/);
  assert.match(releaseGuardSource, /\.Replace\("`r`n", "`n"\)/);
  assert.match(releaseGuardSource, /catalog_sha256/);
  assert.match(releaseGuardSource, /audio\.ready/);
  assert.match(publishScriptSource, /Assert-SharedBackendRelease/);
  assert.doesNotMatch(publishScriptSource, /reconciliado en main/);
  assert.doesNotMatch(publishScriptSource, /rev-parse --short=7 HEAD/);
  assert.match(publishScriptSource, /eas update --channel preview[\s\S]*?--non-interactive/);
});

test('a direct local publisher invocation stops before any Expo command', () => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(repositoryRoot, 'mobile/scripts/publish-preview.ps1'),
      '-Message',
      'authority-wiring-test',
    ],
    {
      cwd: path.join(repositoryRoot, 'mobile'),
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_ACTIONS: 'false',
      },
    },
  );

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /Preview solamente se publica mediante GitHub Actions/);
  assert.doesNotMatch(output, /Publicando solamente en Preview/);
});

test('the publisher verifies Expo reports the same GitHub commit after upload', () => {
  assert.match(publishScriptSource, /function Assert-PublishedPreviewCommit/);
  assert.match(publishScriptSource, /eas update:list --branch preview --limit 1 --non-interactive --json/);
  assert.match(publishScriptSource, /eas update:view \$observedGroup --json/);
  assert.match(publishScriptSource, /PSObject\.Properties\['gitCommitHash'\]/);
  assert.match(publishScriptSource, /\$observedPlatforms -contains 'android'/);
  assert.match(publishScriptSource, /\$observedPlatforms -contains 'ios'/);
  assert.match(publishScriptSource, /Assert-PublishedPreviewCommit -ExpectedCommit \$releaseCommit/);
});

test('Preview uses human-review advisories without introducing a preapproval gate', () => {
  assert.equal(
    mobilePackage.scripts['verify:preview'],
    'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-preview.ps1',
  );
  assert.match(previewVerifierSource, /\[string\]\$ReviewPolicy = 'Preview'/);
  assert.match(
    previewVerifierSource,
    /validate_lesson_cards\.py[\s\S]*?--semantic-review-policy \$semanticReviewPolicy/,
  );
  assert.match(
    previewVerifierSource,
    /verify-interaction-paths\.ps1[\s\S]*?-ReviewPolicy \$ReviewPolicy/,
  );
  assert.match(interactionVerifierSource, /\[string\]\$ReviewPolicy = 'Production'/);
  assert.match(
    interactionVerifierSource,
    /if \(\$ReviewPolicy -eq 'Preview'\)[\s\S]*?'--allow-pending-review'/,
  );
  assert.match(
    semanticValidatorSource,
    /allow_stale_render_signatures=review_policy == "preview"/,
  );
  assert.match(
    projectGuardrailsSource,
    /Human pre-approval is not a default prerequisite[\s\S]*?only when the user explicitly requests it before implementation begins/,
  );
  assert.match(
    releaseGuideSource,
    /No se requiere una preaprobación humana[\s\S]*?Solamente se agrega una preaprobación cuando Horace la pide explícitamente antes de comenzar el cambio/,
  );
});

test('Production promotion reruns strict review against the exact tested Preview commit', () => {
  assert.equal(
    mobilePackage.scripts['verify:production'],
    'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-preview.ps1 -ReviewPolicy Production',
  );
  assert.match(promoteScriptSource, /Assert-CleanReleaseCommit/);
  assert.match(promoteScriptSource, /Assert-GitHubProductionPublishAuthority/);
  assert.match(promoteScriptSource, /refs\/heads\/main/);
  assert.match(promoteScriptSource, /publish-production\.yml@refs\/heads\/main/);
  assert.match(promoteScriptSource, /ls-remote --exit-code origin refs\/heads\/main/);
  assert.match(promoteScriptSource, /Assert-MainReleaseLineage/);
  assert.match(promoteScriptSource, /Assert-SharedBackendRelease/);
  assert.match(promoteScriptSource, /npm run verify:production/);
  assert.match(promoteScriptSource, /eas-cli update:view \$ExpectedGroup --json/);
  assert.match(promoteScriptSource, /PSObject\.Properties\['gitCommitHash'\]/);
  assert.match(promoteScriptSource, /\$observedPlatforms -contains 'android'/);
  assert.match(promoteScriptSource, /\$observedPlatforms -contains 'ios'/);
  assert.match(
    promoteScriptSource,
    /npm run verify:production[\s\S]*?Assert-SharedBackendRelease[\s\S]*?Assert-TestedPreviewGroup[\s\S]*?eas-cli update:republish[\s\S]*?Assert-PublishedProductionCommit/,
    'Strict Production verification and immutable Preview binding must finish before promotion.',
  );
});

test('main is the only active integration and release branch', () => {
  for (const [name, source] of [
    ['AGENTS.md', agentsSource],
    ['Preview workflow', publishWorkflowSource],
    ['Production workflow', productionWorkflowSource],
    ['integrity workflow', integritySource],
    ['Preview publisher', publishScriptSource],
    ['Production publisher', promoteScriptSource],
    ['release guide', releaseGuideSource],
    ['hygiene guide', hygieneGuideSource],
    ['audio operations guide', audioOperationsSource],
    ['hygiene auditor', hygieneScriptSource],
    ['audio exporter', audioExporterSource],
    ['backend release status', backendMainSource],
  ]) {
    assert.doesNotMatch(source, /release\/preview/, `${name} must not depend on a release branch.`);
  }
  assert.match(audioExporterSource, /DEFAULT_SOURCE_REF = "main"/);
  assert.match(hygieneScriptSource, /fully merged\/superseded; delete remote branch/);
  assert.match(agentsSource, /Every task branch must target a pull request into current `main`/);
});

test('Production publication is manual, confirmed, serialized, and sourced only from protected main', () => {
  assert.match(productionWorkflowSource, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(productionWorkflowSource, /\n\s+(?:push|pull_request|schedule):/);
  assert.match(productionWorkflowSource, /confirmed:[\s\S]*?type: boolean/);
  assert.match(productionWorkflowSource, /refs\/heads\/main/);
  assert.match(productionWorkflowSource, /github\.ref_protected/);
  assert.match(productionWorkflowSource, /cancel-in-progress: false/);
  assert.match(productionWorkflowSource, /environment:\s*\n\s*name: preview-release/);
  assert.match(productionWorkflowSource, /run: npm run verify:production/);
  assert.match(
    productionWorkflowSource,
    new RegExp(`run: npm run verify:production[\\s\\S]*?expo/expo-github-action@${pinnedActions.expo} # v9[\\s\\S]*?promote-preview\\.ps1`),
    'The strict Production gate must finish before the Expo credential is initialized.',
  );
  assert.equal(
    productionWorkflowSource.match(/\$\{\{ secrets\.EXPO_TOKEN \}\}/g)?.length,
    2,
    'Only the pinned Expo setup action and final production publisher may receive EXPO_TOKEN.',
  );
  assert.match(productionWorkflowSource, /-Confirmation \$env:PRODUCTION_CONFIRMATION/);
  assert.match(productionWorkflowSource, /SHARED_BACKEND_STATUS_URL: https:\/\/learnenglish-fxki\.onrender\.com\/api\/release\/status/);
  assert.doesNotMatch(productionWorkflowSource, /run:\s*(?:npx\s+)?eas(?:-cli)?\s+update/);
});

test('a direct local Production publisher invocation stops before any Expo command', () => {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(repositoryRoot, 'mobile/scripts/promote-preview.ps1'),
      '-GroupId',
      '11111111-1111-1111-1111-111111111111',
      '-Confirmation',
      'PUBLISH PRODUCTION',
    ],
    {
      cwd: path.join(repositoryRoot, 'mobile'),
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_ACTIONS: 'false',
      },
    },
  );

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /Production solamente se publica mediante GitHub Actions/);
  assert.doesNotMatch(output, /Enviando el bundle probado a Production/);
});

test('CODEOWNERS protects the complete mobile release trust boundary', () => {
  for (const protectedPath of [
    '/.github/CODEOWNERS',
    '/.github/workflows/',
    '/render.yaml',
    '/docs/maintenance/repository-hygiene.md',
    '/docs/operations/persistent-course-audio.md',
    '/mobile/release-integrity.json',
    '/scripts/validate_lesson_cards.py',
    '/scripts/audit-repository-hygiene.ps1',
    '/scripts/export_persistent_audio_catalog.py',
    '/mobile/scripts/promote-preview.ps1',
    '/mobile/scripts/publish-preview.ps1',
    '/mobile/scripts/release-guard.ps1',
    '/mobile/scripts/verify-interaction-paths.ps1',
    '/mobile/scripts/verify-preview.ps1',
    '/mobile/scripts/verify-release-integrity.cjs',
    '/backend/app/main.py',
    '/backend/app/persistent_audio_assets.py',
    '/backend/tests/test_release_status.py',
    '/mobile/tests/four-card-media-review.test.cjs',
    '/mobile/tests/preview-release-authority.test.cjs',
    '/mobile/tests/preview-release-lineage.test.cjs',
  ]) {
    assert.match(codeownersSource, new RegExp(`^${protectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@horaceheights$`, 'm'));
  }
});
