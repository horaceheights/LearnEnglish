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
// Lesson ids are stable across renumbering, so the unit and number come from the snapshot.
const snapshotNumber = new Map();
const unit2Snapshots = fs.readdirSync(generatedRoot)
  .filter((filename) => /^lesson-.+\.json$/.test(filename))
  .filter((filename) => {
    const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
    snapshotNumber.set(filename, Number(String(lesson.sub_lesson_id).split('.')[1]));
    return lesson.unit_id === 'unit-2';
  })
  .sort();

const unit2Count = courseContract.lessonsByUnit['unit-2'];
assert.equal(unit2Snapshots.length, unit2Count, 'Every Unit 2 lesson snapshot must be bundled.');
assert.deepEqual(
  unit2Snapshots
    .map((filename) => snapshotNumber.get(filename))
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
