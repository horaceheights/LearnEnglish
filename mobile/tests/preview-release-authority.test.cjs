const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '../..');
const workflowsRoot = path.join(repositoryRoot, '.github/workflows');
const integritySource = fs.readFileSync(path.join(workflowsRoot, 'preview-integrity.yml'), 'utf8');
const publishWorkflowSource = fs.readFileSync(path.join(workflowsRoot, 'publish-preview.yml'), 'utf8');
const publishScriptSource = fs.readFileSync(
  path.join(repositoryRoot, 'mobile/scripts/publish-preview.ps1'),
  'utf8',
);
const codeownersSource = fs.readFileSync(path.join(repositoryRoot, '.github/CODEOWNERS'), 'utf8');
const pinnedActions = {
  checkout: 'd23441a48e516b6c34aea4fa41551a30e30af803',
  setupNode: '249970729cb0ef3589644e2896645e5dc5ba9c38',
  setupPython: 'ece7cb06caefa5fff74198d8649806c4678c61a1',
  expo: 'eab7a230208c952974db8c3245cfd78402c7b385',
};

test('release/preview runs full integrity checks on pull requests and pushes', () => {
  assert.match(integritySource, /pull_request:[\s\S]*?branches:[\s\S]*?- release\/preview/);
  assert.match(integritySource, /push:[\s\S]*?branches:[\s\S]*?- release\/preview/);
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

test('manual publication is serialized and bound to the protected branch and environment', () => {
  assert.match(publishWorkflowSource, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(publishWorkflowSource, /\n\s+(?:push|pull_request|schedule):/);
  assert.match(publishWorkflowSource, /cancel-in-progress: false/);
  assert.match(publishWorkflowSource, /refs\/heads\/release\/preview/);
  assert.match(publishWorkflowSource, /github\.ref_protected/);
  assert.match(publishWorkflowSource, /environment:\s*\n\s*name: preview-release/);
  assert.match(publishWorkflowSource, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
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
  ]) {
    assert.match(publishScriptSource, new RegExp(`-Name '${requiredVariable}'`));
  }

  assert.match(publishScriptSource, /refs\/heads\/release\/preview/);
  assert.match(publishScriptSource, /release\/preview debe tener protección o un ruleset activo/);
  assert.match(publishScriptSource, /\.github\/workflows\/publish-preview\.yml@refs\/heads\/release\/preview/);
  assert.match(publishScriptSource, /rev-parse HEAD/);
  assert.match(publishScriptSource, /ls-remote --exit-code origin refs\/heads\/release\/preview/);
  assert.match(publishScriptSource, /EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA/);
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

test('CODEOWNERS protects the complete Preview release trust boundary', () => {
  for (const protectedPath of [
    '/.github/CODEOWNERS',
    '/.github/workflows/',
    '/mobile/release-integrity.json',
    '/mobile/scripts/publish-preview.ps1',
    '/mobile/scripts/release-guard.ps1',
    '/mobile/scripts/verify-release-integrity.cjs',
    '/mobile/tests/preview-release-authority.test.cjs',
    '/mobile/tests/preview-release-lineage.test.cjs',
  ]) {
    assert.match(codeownersSource, new RegExp(`^${protectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+@horaceheights$`, 'm'));
  }
});
