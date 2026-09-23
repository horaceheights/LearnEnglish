const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');

const mobileRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const bundledRoot = path.join(mobileRoot, 'assets', 'lesson-assets');
const sourcePath = path.join(mobileRoot, 'src', 'lessonImageSources.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const referencedImages = new Set();
const unit2SnapshotPattern = /^lesson-2-(\d+)-.+\.json$/;
const unit2Snapshots = fs.readdirSync(generatedRoot)
  .filter((filename) => unit2SnapshotPattern.test(filename))
  .sort();

const unit2Count = courseContract.lessonsByUnit['unit-2'];
assert.equal(unit2Snapshots.length, unit2Count, 'Every Unit 2 lesson snapshot must be bundled.');
assert.deepEqual(
  unit2Snapshots
    .map((filename) => Number(filename.match(unit2SnapshotPattern)[1]))
    .sort((left, right) => left - right),
  Array.from({ length: unit2Count }, (_, index) => index + 1),
  'Unit 2 snapshots must include exactly one lesson each, numbered from 2.1 without gaps.',
);

for (const filename of unit2Snapshots) {
  const lessonSource = fs.readFileSync(path.join(generatedRoot, filename), 'utf8');
  for (const match of lessonSource.matchAll(/unit2_[a-z0-9_]+\.webp/g)) {
    referencedImages.add(match[0]);
  }
}

assert.ok(referencedImages.size > 0, 'Unit 2 snapshots must reference their approved still images.');

for (const image of [...referencedImages].sort()) {
  assert.ok(fs.existsSync(path.join(bundledRoot, image)), `${image} is missing from the mobile OTA assets.`);
  assert.ok(
    source.includes(`require('../assets/lesson-assets/${image}')`),
    `${image} is missing a literal Metro require in lessonImageSources.ts.`,
  );
}

console.log(`Verified ${referencedImages.size} bundled Unit 2 lesson images.`);
