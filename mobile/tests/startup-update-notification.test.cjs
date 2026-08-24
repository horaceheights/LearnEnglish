const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(mobileRoot, 'App.tsx'), 'utf8');
const courseSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/CourseScreen.tsx'), 'utf8');
const updatesSource = fs.readFileSync(path.join(mobileRoot, 'src/updates.ts'), 'utf8');
const publishSource = fs.readFileSync(path.join(mobileRoot, 'scripts/publish-preview.ps1'), 'utf8');

test('automatic cold-start updates save a receipt before reloading', () => {
  const saveIndex = appSource.indexOf('await saveUpdateReceiptBeforeReload(fetchedUpdate.manifest.id)');
  const reloadIndex = appSource.indexOf('await Updates.reloadAsync()', saveIndex);

  assert.ok(saveIndex >= 0, 'startup update flow must save the prior version receipt');
  assert.ok(reloadIndex > saveIndex, 'startup update flow must save the receipt before reloading');
});

test('manual and automatic updates share the same receipt flow', () => {
  assert.match(courseSource, /saveUpdateReceiptBeforeReload\(fetchedUpdate\.manifest\.id\)/);
  assert.match(courseSource, /saveUpdateReceiptBeforeReload\(\)/);
  assert.doesNotMatch(courseSource, /UPDATE_COMPLETED_STORAGE_KEY/);
});

test('the startup popup is one-time and shows only the current version and commit', () => {
  assert.match(appSource, /consumeCompletedUpdateMessage\(\)/);
  assert.match(appSource, /Alert\.alert\('Actualización completada', completedUpdateMessage\)/);
  assert.match(updatesSource, /current\.updateId === previous\.targetUpdateId/);
  assert.match(updatesSource, /function parseUpdateReceipt/);
  assert.match(updatesSource, /return releaseVersionLabel\(current\.version, current\.commit\)/);
  assert.match(updatesSource, /Versión \$\{version\} · Commit \$\{commit\}/);
  assert.doesNotMatch(updatesSource, /Build:|Actualización:/);
  assert.match(updatesSource, /await clearUpdateReceipt\(\)/);
});

test('the Actualizar menu shows the same version and commit without other identifiers', () => {
  assert.match(courseSource, /<Text style=\{styles\.menuOptionTitle\}>Actualizar<\/Text>[\s\S]*?releaseVersionLabel\(currentVersion\)/);
  assert.doesNotMatch(courseSource, /installedVersion|currentBuild|Build:/);
});

test('Preview publishing injects the same short Git commit shown by Expo and Vercel', () => {
  assert.match(publishSource, /git -C \$repositoryRoot rev-parse --short=7 HEAD/);
  assert.match(publishSource, /EXPO_PUBLIC_RELEASE_COMMIT/);
  assert.match(updatesSource, /process\.env\.EXPO_PUBLIC_RELEASE_COMMIT/);
});
