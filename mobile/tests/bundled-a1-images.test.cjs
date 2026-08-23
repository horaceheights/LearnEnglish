const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const bundledRoot = path.join(mobileRoot, 'assets', 'lesson-assets');
const sourcePath = path.join(mobileRoot, 'src', 'lessonImageSources.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const referencedImages = new Set([
  'family_all_members.webp',
  'place_park.webp',
  'a1_ana.webp',
  'a1_home.webp',
  'a1_apple.webp',
  'a1_station.webp',
]);

for (const filename of fs.readdirSync(generatedRoot)) {
  if (!/^lesson-.*\.json$/.test(filename)) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  for (const card of lesson.cards) {
    const paths = [card.prompt_image_url, ...card.options.map((option) => option.image_url)];
    for (const imageUrl of paths) {
      const match = String(imageUrl || '').match(/\/lesson-assets\/(a1_[a-z0-9_-]+\.webp)(?:[?#].*)?$/);
      if (match) referencedImages.add(match[1]);
    }
  }
}

assert.ok(referencedImages.size > 0, 'A1 snapshots must reference approved bundled still images.');

for (const image of [...referencedImages].sort()) {
  const bundledPath = path.join(bundledRoot, image);
  assert.ok(fs.existsSync(bundledPath), `${image} is missing from the mobile OTA assets.`);
  assert.ok(fs.statSync(bundledPath).size > 0, `${image} is empty in the mobile OTA assets.`);
  assert.ok(
    source.includes(`require('../assets/lesson-assets/${image}')`),
    `${image} is missing a literal Metro require in lessonImageSources.ts.`,
  );
}

console.log(`Verified ${referencedImages.size} bundled A1 course and lesson images.`);
