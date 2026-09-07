const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  gitBlobId,
  verifyReleaseIntegrity,
} = require('../scripts/verify-release-integrity.cjs');

const scriptsRoot = path.resolve(__dirname, '../scripts');
const guardSource = fs.readFileSync(path.join(scriptsRoot, 'release-guard.ps1'), 'utf8');
const publishSource = fs.readFileSync(path.join(scriptsRoot, 'publish-preview.ps1'), 'utf8');
const integrityManifest = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../release-integrity.json'),
  'utf8',
));

function writeFile(repositoryRoot, relativePath, content) {
  const target = path.join(repositoryRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createFixture(t) {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spanglish-release-integrity-'));
  t.after(() => fs.rmSync(repositoryRoot, { force: true, recursive: true }));

  const lessons = Array.from({ length: 7 }, (_, unitIndex) => (
    Array.from({ length: 10 }, (_, lessonIndex) => ({
      id: `${unitIndex + 1}.${lessonIndex + 1}`,
      unit_id: `unit-${unitIndex + 1}`,
    }))
  )).flat();
  const catalogContent = `${JSON.stringify(lessons, null, 2)}\n`;
  const identityFiles = [
    {
      path: 'mobile/src/updates.ts',
      content: 'process.env.EXPO_PUBLIC_RELEASE_COMMIT\nreleaseVersionLabel\n',
      requiredMarkers: ['process.env.EXPO_PUBLIC_RELEASE_COMMIT', 'releaseVersionLabel'],
    },
    {
      path: 'mobile/src/screens/CourseScreen.tsx',
      content: 'releaseVersionLabel(currentVersion)\n<Text style={styles.menuVersion}>\n',
      requiredMarkers: ['releaseVersionLabel(currentVersion)', '<Text style={styles.menuVersion}>'],
    },
    {
      path: 'mobile/scripts/publish-preview.ps1',
      content: [
        "Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_SHA'",
        'EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA',
        "PSObject.Properties['gitCommitHash']",
        '',
      ].join('\n'),
      requiredMarkers: [
        "Get-RequiredProcessEnvironmentVariable -Name 'GITHUB_SHA'",
        'EXPO_PUBLIC_RELEASE_COMMIT debe ser exactamente GITHUB_SHA',
        "PSObject.Properties['gitCommitHash']",
      ],
    },
  ];

  writeFile(repositoryRoot, 'mobile/src/generated/a1-course.json', catalogContent);
  for (const file of identityFiles) writeFile(repositoryRoot, file.path, file.content);

  const manifest = {
    manifestVersion: 1,
    baselineCommit: '657ab19487e37851de1229c08219d44d59ab199b',
    catalog: {
      path: 'mobile/src/generated/a1-course.json',
      expectedGitBlob: gitBlobId(catalogContent),
      lessonCount: 70,
      unitCount: 7,
      lessonsByUnit: Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`unit-${index + 1}`, 10])),
    },
    requiredReleaseIdentityFiles: identityFiles.map((file) => ({
      path: file.path,
      expectedGitBlob: gitBlobId(file.content),
      requiredMarkers: file.requiredMarkers,
    })),
  };
  writeFile(repositoryRoot, 'mobile/release-integrity.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { catalogContent, identityFiles, lessons, manifest, repositoryRoot };
}

function writeManifest(repositoryRoot, manifest) {
  writeFile(repositoryRoot, 'mobile/release-integrity.json', `${JSON.stringify(manifest, null, 2)}\n`);
}

function verifyFixture(repositoryRoot) {
  return verifyReleaseIntegrity({ repositoryRoot, verifyGitBaseline: false });
}

test('Preview publishing requires the exact dedicated release authority and integrity check', () => {
  assert.match(guardSource, /\$authorityBranch = 'origin\/release\/preview'/);
  assert.match(guardSource, /if \(\$headCommit -ne \$authorityCommit\)/);
  assert.match(guardSource, /Assert-PreviewReleaseIntegrity/);
  assert.doesNotMatch(guardSource, /origin\/codex\/restore-complete-a1-preview/);
  assert.doesNotMatch(guardSource, /merge-base --is-ancestor \$canonicalBranch HEAD/);
  assert.match(
    publishSource,
    /Assert-PreviewReleaseLineage[\s\S]*?Assert-CleanReleaseCommit/,
    'The Preview publisher must verify the exact release authority before publishing.',
  );
});

test('the versioned manifest locks the complete recovery baseline and release identity', () => {
  assert.equal(integrityManifest.manifestVersion, 1);
  assert.equal(integrityManifest.baselineCommit, '657ab19487e37851de1229c08219d44d59ab199b');
  assert.equal(integrityManifest.catalog.expectedGitBlob, 'da7400e435c4fd38fc249ef988a7546159bfdfc4');
  assert.equal(integrityManifest.catalog.lessonCount, 70);
  assert.equal(integrityManifest.catalog.unitCount, 7);
  assert.deepEqual(Object.values(integrityManifest.catalog.lessonsByUnit), Array(7).fill(10));
  assert.deepEqual(
    integrityManifest.requiredReleaseIdentityFiles.map((file) => file.path),
    [
      'mobile/src/updates.ts',
      'mobile/src/screens/CourseScreen.tsx',
      'mobile/scripts/publish-preview.ps1',
    ],
  );
  assert.equal(
    integrityManifest.requiredReleaseIdentityFiles.at(-1).expectedGitBlob,
    '246a7cecc3bdef9d3d6434d9a3cf2784bc7812aa',
  );
});

test('a complete 70-lesson, seven-unit fixture passes integrity verification', (t) => {
  const fixture = createFixture(t);
  assert.doesNotThrow(() => verifyFixture(fixture.repositoryRoot));
});

test('a stale 20-lesson aggregate is blocked', (t) => {
  const fixture = createFixture(t);
  writeFile(
    fixture.repositoryRoot,
    fixture.manifest.catalog.path,
    `${JSON.stringify(fixture.lessons.slice(0, 20), null, 2)}\n`,
  );
  assert.throws(() => verifyFixture(fixture.repositoryRoot), /contiene 20 lecciones; debe conservar 70/u);
});

test('a missing aggregate catalog is blocked', (t) => {
  const fixture = createFixture(t);
  fs.rmSync(path.join(fixture.repositoryRoot, fixture.manifest.catalog.path));
  assert.throws(() => verifyFixture(fixture.repositoryRoot), /Falta el catálogo agregado de Preview/u);
});

test('a wrong lesson distribution by unit is blocked even with 70 lessons', (t) => {
  const fixture = createFixture(t);
  const changedLessons = fixture.lessons.map((lesson, index) => (
    index === 0 ? { ...lesson, unit_id: 'unit-2' } : lesson
  ));
  const changedContent = `${JSON.stringify(changedLessons, null, 2)}\n`;
  writeFile(fixture.repositoryRoot, fixture.manifest.catalog.path, changedContent);
  fixture.manifest.catalog.expectedGitBlob = gitBlobId(changedContent);
  writeManifest(fixture.repositoryRoot, fixture.manifest);
  assert.throws(
    () => verifyFixture(fixture.repositoryRoot),
    /unit-1 contiene 9 lecciones; debe conservar 10/u,
  );
});

test('aggregate blob drift is blocked even when lesson counts remain valid', (t) => {
  const fixture = createFixture(t);
  writeFile(fixture.repositoryRoot, fixture.manifest.catalog.path, `${fixture.catalogContent}\n`);
  assert.throws(() => verifyFixture(fixture.repositoryRoot), /catálogo agregado de Preview cambió de contenido \(Git blob/u);
});

test('a missing release identity file is blocked', (t) => {
  const fixture = createFixture(t);
  fs.rmSync(path.join(fixture.repositoryRoot, fixture.identityFiles[0].path));
  assert.throws(() => verifyFixture(fixture.repositoryRoot), /Falta el archivo requerido de identidad de versión y commit/u);
});
