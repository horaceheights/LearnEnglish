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
const runtimeContracts = fs.readFileSync(path.join(repositoryRoot, 'scripts/a1_media_runtime_contracts.py'), 'utf8');

const optionVariants = {
  'boy.webp': 'boy_3x2.webp',
  'family_adults.webp': 'family_adults_3x2.webp',
  'family_all_members.webp': 'family_all_members_3x2.webp',
  'family_babies.webp': 'family_babies_3x2.webp',
  'family_baby.webp': 'family_baby_3x2.webp',
  'family_baby_sleeping.webp': 'family_baby_sleeping_3x2.webp',
  'family_brother_studying.webp': 'family_brother_studying_3x2.webp',
  'family_brothers.webp': 'family_brothers_3x2.webp',
  'family_children.webp': 'family_children_3x2.webp',
  'family_children_playing.webp': 'family_children_playing_3x2.webp',
  'family_children_studying.webp': 'family_children_studying_3x2.webp',
  'family_father.webp': 'family_father_3x2.webp',
  'family_father_talking.webp': 'family_father_talking_3x2.webp',
  'family_father_working.webp': 'family_father_working_3x2.webp',
  'family_grandfather.webp': 'family_grandfather_3x2.webp',
  'family_grandmother.webp': 'family_grandmother_3x2.webp',
  'family_grandparents.webp': 'family_grandparents_3x2.webp',
  'family_grandparents_sitting.webp': 'family_grandparents_sitting_3x2.webp',
  'family_grandparents_talking.webp': 'family_grandparents_talking_3x2.webp',
  'family_mother.webp': 'family_mother_3x2.webp',
  'family_mother_cooking.webp': 'family_mother_cooking_3x2.webp',
  'family_parents.webp': 'family_parents_3x2.webp',
  'family_parents_talking.webp': 'family_parents_talking_3x2.webp',
  'family_sisters.webp': 'family_sisters_3x2.webp',
  'family_sister_playing.webp': 'family_sister_playing_3x2.webp',
  'girl.webp': 'girl_3x2.webp',
  'man.webp': 'man_3x2.webp',
  'man_is_standing.webp': 'man_is_standing_3x2.webp',
  'object_backpack.webp': 'object_backpack_3x2.webp',
  'object_bike.webp': 'object_bike_3x2.webp',
  'object_book.webp': 'object_book_3x2.webp',
  'object_car.webp': 'object_car_3x2.webp',
  'place_bridge.webp': 'place_bridge_3x2.webp',
  'place_bus.webp': 'place_bus_3x2.webp',
  'place_house.webp': 'place_house_3x2.webp',
  'place_park.webp': 'place_park_3x2.webp',
  'place_street.webp': 'place_street_3x2.webp',
  'they_boy_girl.webp': 'they_boy_girl_3x2.webp',
  'they_boy_girl_are_eating.webp': 'they_boy_girl_are_eating_3x2.webp',
  'they_boy_girl_are_reading.webp': 'they_boy_girl_are_reading_3x2.webp',
  'they_boy_girl_are_running.webp': 'they_boy_girl_are_running_3x2.webp',
  'they_boy_girl_are_writing.webp': 'they_boy_girl_are_writing_3x2.webp',
  'woman.webp': 'woman_3x2.webp',
};

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
const optionImageStages = new Set();
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
        optionImageStages.add(card.stage);
      }
    }
  }
}

assert.ok(optionImages.size > 700, 'the guardrail must inspect the complete A1 option-image catalog');
assert.equal(optionImageUnits.size, 7, 'option-image subject preservation must cover all seven units');
assert.deepEqual(
  [...optionImageStages].sort(),
  ['Learn', 'Listen', 'Recognize', 'Speak'],
  'full-bleed option and model imagery must cover every section that authors image options; Use images are prompt media audited separately',
);
assert.doesNotMatch(generatedText.join('\n'), /_3x2_pilot\.webp/, 'generated lessons must not retain pilot-only media references');
assert.match(cardView, /const useThreeByTwoOptionMedia = card\.options\.some/);
assert.match(cardView, /useFourByFiveFrame=\{useFourImagePortraitGrid\}/);
assert.match(cardView, /useThreeByTwoFrame=\{useThreeByTwoOptionMedia && !useFourImagePortraitGrid\}/);
assert.match(cardView, /optionImageFourByFiveFrame:\s*\{ aspectRatio:\s*4 \/ 5, overflow:\s*'hidden' \}/);
assert.match(cardView, /optionImageThreeByTwoFrame:\s*\{ aspectRatio:\s*3 \/ 2, overflow:\s*'hidden' \}/);
assert.doesNotMatch(cardView, /preserveSubject=/, 'four-card layouts must use the same normalized fill policy');
assert.match(
  cardView,
  /<OptionMediaImage[\s\S]*?imageUrl=\{option\.image_url\}[\s\S]*?sourceOverride=\{card\.options\.length === 2 \? actionVideo\?\.posterSource : undefined\}[\s\S]*?\/>/,
);
assert.match(optionMediaImage, /const sourceIsThreeByTwo = Boolean\(/);
assert.match(optionMediaImage, /const shouldContain = !sourceIsThreeByTwo/);
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

assert.match(
  exporter,
  /from (?:scripts\.)?a1_media_runtime_contracts import \([\s\S]*?OPTION_MEDIA_VARIANTS,[\s\S]*?TWO_CARD_ACTION_POSTERS,/,
  'the mobile exporter must consume the authoritative still-variant and action-poster maps',
);

for (const [source, variant] of Object.entries(optionVariants)) {
  for (const code of [imageSources, runtimeContracts]) {
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
  const renderedName = optionVariants[name] || name;
  const imagePath = path.join(bundledRoot, renderedName);
  assert.ok(fs.existsSync(imagePath), `${renderedName} is missing from mobile option assets`);
  const [width, height] = webpDimensions(imagePath);
  const nearThreeByTwo = Math.abs((width / height) - 1.5) <= 0.005;
  if (!nearThreeByTwo) nonThreeByTwoOptionImages += 1;
  assert.ok(nearThreeByTwo, `${name} renders through ${renderedName} at ${width}x${height}; every A1 option image must resolve to 3:2`);
}

assert.equal(nonThreeByTwoOptionImages, 0, 'no published A1 option image may rely on the legacy padded contain fallback');

console.log(
  `Verified normalized 3:2 option/model media across ${optionImages.size} A1 images, all ${optionImageUnits.size} units, and all ${optionImageStages.size} lesson sections, with zero padded legacy stills.`,
);
