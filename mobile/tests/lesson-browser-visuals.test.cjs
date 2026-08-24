const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
const unitVisualsBlock = courseScreen.match(/const UNIT_VISUALS:[\s\S]*?\n};/);
assert.ok(unitVisualsBlock, 'CourseScreen must define explicit unit visuals.');

function visualEntries(block, idPattern) {
  const entries = new Map();
  const entryPattern = new RegExp(`'(${idPattern})':\\s*{\\s*image:\\s*'([^']+)'`, 'g');
  for (const match of block.matchAll(entryPattern)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

const lessonVisuals = visualEntries(visualsBlock[0], 'lesson-[^\'\\s]+');
const unitVisuals = visualEntries(unitVisualsBlock[0], 'unit-\\d+');
const unitIds = [...new Set(course.map((lesson) => lesson.unit_id))];
const titleSurfaces = [
  ...course.map((lesson) => ({ id: lesson.id, image: lessonVisuals.get(lesson.id) })),
  ...unitIds.map((unitId) => ({ id: unitId, image: unitVisuals.get(unitId) })),
];
const usedImages = new Map();
const usedContent = new Map();

for (const surface of titleSurfaces) {
  const { id, image } = surface;
  assert.ok(image, `${id} must have an explicit title image.`);
  const imagePath = path.join(assetRoot, image);
  assert.ok(fs.existsSync(imagePath), `${id} references missing title image ${image}.`);
  assert.deepEqual(webpDimensions(imagePath), [1536, 1024], `${id} title image ${image} must use the 3:2 course canvas.`);
  assert.ok(
    imageSources.includes(`require('../assets/lesson-assets/${image}')`),
    `${id} title image ${image} must use a literal Metro require.`,
  );
  assert.ok(!usedImages.has(image), `${id} and ${usedImages.get(image)} reuse title image ${image}.`);
  usedImages.set(image, id);
  const contentHash = crypto.createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex');
  assert.ok(
    !usedContent.has(contentHash),
    `${id} and ${usedContent.get(contentHash)} contain the same title picture under different filenames.`,
  );
  usedContent.set(contentHash, id);
}

console.log(`Verified ${titleSurfaces.length} globally unique 3:2 lesson and unit title images.`);
