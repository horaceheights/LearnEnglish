const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const bundledRoot = path.join(mobileRoot, 'assets', 'lesson-assets');
const canonicalRoot = path.join(repositoryRoot, 'Lessons', 'Lesson1', 'images');
const webRoot = path.join(repositoryRoot, 'frontend', 'public', 'lesson-assets');
const cardView = fs.readFileSync(path.join(mobileRoot, 'src/components/LessonCardView.tsx'), 'utf8');
const optionMediaImage = fs.readFileSync(path.join(mobileRoot, 'src/components/OptionMediaImage.tsx'), 'utf8');
const lessonPlayer = fs.readFileSync(path.join(repositoryRoot, 'frontend/components/LessonPlayer.js'), 'utf8');
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src/lessonImageSources.ts'), 'utf8');
const exporter = fs.readFileSync(path.join(repositoryRoot, 'scripts/export_mobile_preview_lessons.py'), 'utf8');

const optionVariants = {
  'family_children_playing.webp': 'family_children_playing_3x2.webp',
  'family_father_working.webp': 'family_father_working_3x2.webp',
  'family_grandparents_sitting.webp': 'family_grandparents_sitting_3x2.webp',
  'family_mother_cooking.webp': 'family_mother_cooking_3x2.webp',
  'family_parents_talking.webp': 'family_parents_talking_3x2.webp',
};

const topAlignedCrops = new Set([
  'boy.webp',
  'family_brothers.webp',
  'family_children.webp',
  'family_grandfather.webp',
  'family_grandmother.webp',
  'family_grandparents.webp',
  'family_mother.webp',
  'family_sisters.webp',
  'girl.webp',
  'man.webp',
  'woman.webp',
]);

// These reviewed sources have enough non-teaching background for a centered
// 3:2 crop. New non-3:2 option art must be reviewed and added deliberately.
const approvedCenterCrops = new Set([
  'family_adults.webp',
  'family_all_members.webp',
  'family_babies.webp',
  'family_baby.webp',
  'family_baby_sleeping.webp',
  'family_brother_studying.webp',
  'family_children_studying.webp',
  'family_father.webp',
  'family_grandparents_talking.webp',
  'family_parents.webp',
  'family_parents_talking.webp',
  'man_is_standing.webp',
  'object_backpack.webp',
  'object_bike.webp',
  'object_book.webp',
  'object_car.webp',
  'place_bridge.webp',
  'place_bus.webp',
  'place_house.webp',
  'place_park.webp',
  'place_street.webp',
  'they_boy_girl.webp',
  'they_boy_girl_are_eating.webp',
  'they_boy_girl_are_reading.webp',
  'they_boy_girl_are_running.webp',
  'they_boy_girl_are_writing.webp',
]);

function webpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${filePath} is not a RIFF image`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${filePath} is not WebP`);
  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  }
  if (chunk === 'VP8X') {
    return [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)];
  }
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  assert.fail(`Unsupported WebP chunk ${chunk} in ${filePath}`);
}

function optionFilename(imageUrl) {
  return path.basename(String(imageUrl || '').split(/[?#]/, 1)[0]);
}

const optionImages = new Set();
const optionImageUnits = new Set();
const generatedText = [];
for (const filename of fs.readdirSync(generatedRoot)) {
  if (!/^lesson-.*\.json$/.test(filename)) continue;
  const source = fs.readFileSync(path.join(generatedRoot, filename), 'utf8');
  generatedText.push(source);
  const lesson = JSON.parse(source);
  for (const card of lesson.cards) {
    for (const option of card.options || []) {
      if (option.image_url) {
        optionImages.add(optionFilename(option.image_url));
        optionImageUnits.add(lesson.unit_id);
      }
    }
  }
}

assert.ok(optionImages.size > 700, 'the guardrail must inspect the complete A1 option-image catalog');
assert.equal(optionImageUnits.size, 7, 'option-image subject preservation must cover all seven units');
assert.doesNotMatch(generatedText.join('\n'), /_3x2_pilot\.webp/, 'generated lessons must not retain pilot-only media references');
assert.match(cardView, /const useThreeByTwoOptionMedia = card\.options\.some/);
assert.match(cardView, /useThreeByTwoFrame=\{useThreeByTwoOptionMedia && !useExpandedFourImagePortraitGrid\}/);
assert.match(cardView, /optionImageThreeByTwoFrame:\s*\{ aspectRatio:\s*3 \/ 2, overflow:\s*'hidden' \}/);
assert.match(cardView, /<OptionMediaImage[\s\S]*?imageUrl=\{option\.image_url\}[\s\S]*?preserveSubject=\{useExpandedFourImagePortraitGrid\}/);
assert.match(optionMediaImage, /const sourceIsThreeByTwo = Boolean\(/);
assert.match(optionMediaImage, /const shouldContain = preserveSubject \|\| !sourceIsThreeByTwo/);
assert.match(optionMediaImage, /resizeMode=\{shouldContain \? 'contain' : 'cover'\}/);
assert.doesNotMatch(optionMediaImage, /TOP_ALIGNED_OPTION_MEDIA|topAligned/);
assert.match(lessonPlayer, /const useThreeByTwoOptionMedia = currentCard\?\.options\?\.some/);
assert.match(lessonPlayer, /useThreeByTwoOptionMedia[\s\S]*?aspectRatio:\s*"3 \/ 2"[\s\S]*?objectFit:\s*"cover"/);
assert.match(lessonPlayer, /lessonOptionImageSrc\(option\.image_url\)/);
assert.doesNotMatch(lessonPlayer, /src=\{lessonImageSrc\(option\.image_url\)\}/);

// Preserve the user's explicit Lesson 1.7 still-image choice without disabling
// action-video behavior on the rest of the now-global 3:2 catalog.
assert.match(cardView, /useStillOnlyLesson17Comparison[\s\S]*?lessonId === 'lesson-7-is-are-not'/);
assert.match(cardView, /const actionVideo = useStillOnlyLesson17Comparison\s*\?\s*null/);
assert.match(lessonPlayer, /useStillOnlyLesson17Comparison[\s\S]*?activeLesson\.id === "lesson-7-is-are-not"/);
assert.match(lessonPlayer, /const actionVideoName = !isPronunciationCard && !useStillOnlyLesson17Comparison/);

for (const name of topAlignedCrops) {
  assert.ok(lessonPlayer.includes(`"${name}"`), `${name} is missing the web top-aligned crop policy`);
}

for (const [source, variant] of Object.entries(optionVariants)) {
  for (const code of [imageSources, exporter]) {
    assert.ok(code.includes(source) && code.includes(variant), `${source} -> ${variant} is missing from generated mobile policy`);
  }
  assert.ok(lessonPlayer.includes(source) && lessonPlayer.includes(variant), `${source} -> ${variant} is missing from web policy`);

  const copies = [canonicalRoot, bundledRoot, webRoot].map((root) => path.join(root, variant));
  for (const copy of copies) {
    assert.ok(fs.existsSync(copy), `${variant} is missing from ${path.dirname(copy)}`);
    assert.deepEqual(webpDimensions(copy), [1536, 1024], `${variant} must be exact 3:2 at 1536x1024`);
  }
  const canonicalBytes = fs.readFileSync(copies[0]);
  assert.ok(canonicalBytes.equals(fs.readFileSync(copies[1])), `${variant} mobile copy drifted from canonical`);
  assert.ok(canonicalBytes.equals(fs.readFileSync(copies[2])), `${variant} web copy drifted from canonical`);
}

let nonThreeByTwoOptionImages = 0;
for (const name of [...optionImages].sort()) {
  const imagePath = path.join(bundledRoot, name);
  assert.ok(fs.existsSync(imagePath), `${name} is missing from mobile option assets`);
  const [width, height] = webpDimensions(imagePath);
  const nearThreeByTwo = Math.abs((width / height) - 1.5) <= 0.005;
  if (!nearThreeByTwo && !optionVariants[name]) nonThreeByTwoOptionImages += 1;
  const hasReviewedPolicy = nearThreeByTwo || topAlignedCrops.has(name) || approvedCenterCrops.has(name) || optionVariants[name];
  assert.ok(hasReviewedPolicy, `${name} (${width}x${height}) needs an explicit safe 3:2 crop or normalized variant`);
}

assert.ok(nonThreeByTwoOptionImages > 30, 'the mobile contain guardrail must protect the legacy non-3:2 catalog');

console.log(
  `Verified subject-preserving option media across ${optionImages.size} A1 images in all ${optionImageUnits.size} units, including ${nonThreeByTwoOptionImages} legacy non-3:2 stills.`,
);
