const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(mobileRoot, 'App.tsx'), 'utf8');
const courseSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/CourseScreen.tsx'), 'utf8');
const updatesSource = fs.readFileSync(path.join(mobileRoot, 'src/updates.ts'), 'utf8');

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

test('the startup popup is one-time and includes previous and current version details', () => {
  assert.match(appSource, /consumeCompletedUpdateMessage\(\)/);
  assert.match(appSource, /Alert\.alert\('Actualización completada', completedUpdateMessage\)/);
  assert.match(updatesSource, /current\.updateId === previous\.targetUpdateId/);
  assert.match(updatesSource, /function parseUpdateReceipt/);
  assert.match(updatesSource, /detailedVersion\('ANTERIOR', previous\)/);
  assert.match(updatesSource, /detailedVersion\('ACTUAL', current\)/);
  assert.match(updatesSource, /await clearUpdateReceipt\(\)/);
});
