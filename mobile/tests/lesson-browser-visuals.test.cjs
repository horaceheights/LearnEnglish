const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const course = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'), 'utf8'));
const courseScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'CourseScreen.tsx'), 'utf8');
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const assetRoot = path.join(mobileRoot, 'assets', 'lesson-assets');

function webpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.subarray(0, 4).toString('ascii'), 'RIFF', `${filePath} must be a RIFF image.`);
  assert.equal(data.subarray(8, 12).toString('ascii'), 'WEBP', `${filePath} must be a WebP image.`);
  let offset = 12;
  while (offset + 8 <= data.length) {
    const chunkType = data.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = data.readUInt32LE(offset + 4);
    const payload = data.subarray(offset + 8, offset + 8 + chunkSize);
    if (chunkType === 'VP8X' && payload.length >= 10) {
      return [payload.readUIntLE(4, 3) + 1, payload.readUIntLE(7, 3) + 1];
    }
    if (chunkType === 'VP8L' && payload.length >= 5 && payload[0] === 0x2f) {
      const bits = payload.readUInt32LE(1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    if (chunkType === 'VP8 ' && payload.length >= 10) {
      const marker = payload.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
      if (marker >= 0 && marker + 7 <= payload.length) {
        return [payload.readUInt16LE(marker + 3) & 0x3fff, payload.readUInt16LE(marker + 5) & 0x3fff];
      }
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

const visualsBlock = courseScreen.match(/const VISUALS:[\s\S]*?\n};/);
assert.ok(visualsBlock, 'CourseScreen must define explicit lesson visuals.');

const visualEntries = new Map();
const entryPattern = /'(lesson-[^']+)':\s*{\s*image:\s*'([^']+)'/g;
for (const match of visualsBlock[0].matchAll(entryPattern)) {
  visualEntries.set(match[1], match[2]);
}

const newLessons = course.filter((lesson) => /^unit-[2-7]$/.test(lesson.unit_id));

for (const lesson of newLessons) {
  const image = visualEntries.get(lesson.id);
  assert.ok(image, `${lesson.id} must have an explicit lesson-browser image.`);
  const imagePath = path.join(assetRoot, image);
  assert.ok(fs.existsSync(imagePath), `${lesson.id} references missing browser image ${image}.`);
  assert.deepEqual(webpDimensions(imagePath), [1536, 1024], `${lesson.id} browser image ${image} must use the 3:2 course canvas.`);
  assert.ok(
    imageSources.includes(`require('../assets/lesson-assets/${image}')`),
    `${lesson.id} browser image ${image} must use a literal Metro require.`,
  );
}

for (let unitNumber = 2; unitNumber <= 7; unitNumber += 1) {
  const unitLessons = course.filter((lesson) => lesson.unit_id === `unit-${unitNumber}`);
  const images = unitLessons.map((lesson) => visualEntries.get(lesson.id));
  assert.equal(
    new Set(images).size,
    unitLessons.length,
    `Unit ${unitNumber} lessons must not repeat one title image across the unit.`,
  );
}

console.log(`Verified explicit, distinct lesson-browser images for ${newLessons.length} Unit 2-7 lessons.`);
