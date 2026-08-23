const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const bundledRoot = path.join(mobileRoot, 'assets', 'lesson-assets');
const sourcePath = path.join(mobileRoot, 'src', 'lessonImageSources.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const referencedImages = new Set();

for (const filename of fs.readdirSync(generatedRoot)) {
  if (!/^lesson-(1[1-9]|20)-/.test(filename)) continue;
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
