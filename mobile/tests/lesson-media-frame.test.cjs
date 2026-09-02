const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const cardViewSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonCardView.tsx'),
  'utf8',
);
const pronunciationSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/PronunciationPractice.tsx'),
  'utf8',
);
const mediaFrameSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonMediaFrame.tsx'),
  'utf8',
);
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src/lessonImageSources.ts'), 'utf8');
const lessonPlayerSource = fs.readFileSync(
  path.join(mobileRoot, '..', 'frontend/components/LessonPlayer.js'),
  'utf8',
);
const bundledRoot = path.join(mobileRoot, 'assets', 'lesson-assets');

const mediaVariants = new Map(
  [...imageSources.matchAll(/'([^']+\.webp)': '([^']+_3x2\.webp)'/g)]
    .map((match) => [match[1], match[2]]),
);

function webpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${filePath} is not a RIFF image`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${filePath} is not WebP`);
  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8X') return [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)];
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  assert.fail(`Unsupported WebP chunk ${chunk} in ${filePath}`);
}

const promptImageCards = [];
const promptImages = new Set();
const units = new Set();
const stageCounts = new Map();
const lessonFiles = fs.readdirSync(generatedRoot).filter((filename) => /^lesson-.*\.json$/.test(filename));

for (const filename of lessonFiles) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  for (const card of lesson.cards) {
    if (!card.prompt_image_url) continue;
    promptImageCards.push({ card, lessonId: lesson.id });
    promptImages.add(path.basename(String(card.prompt_image_url).split(/[?#]/, 1)[0]));
    units.add(lesson.unit_id);
    stageCounts.set(card.stage, (stageCounts.get(card.stage) || 0) + 1);
  }
}

assert.equal(lessonFiles.length, 70, 'the frame audit must inspect all 70 A1 lessons');
assert.equal(units.size, 7, 'prompt-image framing must cover all seven units');
assert.ok(promptImageCards.length >= 753, 'the frame audit must cover the complete prompt-image catalog');
assert.ok((stageCounts.get('Use') || 0) >= 505, 'Completa/Use prompt images must remain in the global frame audit');
assert.ok((stageCounts.get('Recognize') || 0) >= 248, 'Recognize prompt images must remain in the global frame audit');

let paddedPromptImages = 0;
for (const name of [...promptImages].sort()) {
  const renderedName = mediaVariants.get(name) || name;
  const imagePath = path.join(bundledRoot, renderedName);
  assert.ok(fs.existsSync(imagePath), `${name} resolves to missing prompt image ${renderedName}`);
  const [width, height] = webpDimensions(imagePath);
  const nearThreeByTwo = Math.abs((width / height) - 1.5) <= 0.005;
  if (!nearThreeByTwo) paddedPromptImages += 1;
  assert.ok(nearThreeByTwo, `${name} renders through ${renderedName} at ${width}x${height}; every prompt image must resolve to 3:2`);
}
assert.equal(paddedPromptImages, 0, 'no Learn, Recognize, Listen, Speak, or Use prompt image may rely on padded contain rendering');

assert.match(
  cardViewSource,
  /\{card\.prompt_image_url \? \(\s*<LessonMediaFrame[\s\S]*?maxHeight=\{promptImageHeight\}[\s\S]*?<OptionMediaImage[\s\S]*?imageUrl=\{card\.prompt_image_url\}/,
  'Every prompt image, including Completa, must use the shared normalized full-bleed image layer.',
);
assert.doesNotMatch(cardViewSource, /lessonImageSource\(card\.prompt_image_url\)/, 'mobile prompt images must not bypass normalized media mapping');
assert.match(
  lessonPlayerSource,
  /src=\{lessonOptionImageSrc\(currentCard\.prompt_image_url\)\}[\s\S]*?aspectRatio: "3 \/ 2"[\s\S]*?objectFit: "cover"/,
  'Web prompt images must use the same mapped 3:2 full-bleed policy.',
);
assert.doesNotMatch(lessonPlayerSource, /lessonImageSrc\(currentCard\.prompt_image_url\)/, 'web prompt images must not bypass normalized media mapping');
assert.match(
  cardViewSource,
  /option\.image_url \? styles\.imageOptionFrame : null[\s\S]*?imageOptionFrame:\s*\{[\s\S]*?LESSON_MEDIA_FRAME_STYLE/,
  'Image choices must keep the same outer frame standard in portrait and landscape.',
);
assert.match(
  cardViewSource,
  /optionImage:\s*\{[\s\S]*?LESSON_MEDIA_VIEWPORT_STYLE/,
  'Image choices must keep the same rounded inner viewport standard.',
);
assert.match(
  pronunciationSource,
  /<LessonMediaFrame[\s\S]*?maxHeight=\{imageHeight\}[\s\S]*?<OptionMediaImage/,
  'Speak images must use the same shared frame component.',
);
assert.match(
  mediaFrameSource,
  /LESSON_MEDIA_FRAME_STYLE = \{[\s\S]*?borderColor: '#172d35'[\s\S]*?borderRadius: 24[\s\S]*?borderWidth: 4[\s\S]*?padding: 8/,
  'The global lesson image frame must retain the approved dark rounded inset treatment.',
);
assert.match(
  mediaFrameSource,
  /LESSON_MEDIA_VIEWPORT_STYLE = \{[\s\S]*?backgroundColor: '#f2ebde'[\s\S]*?borderRadius: 17[\s\S]*?overflow: 'hidden'/,
  'Every framed image must retain rounded inner clipping and the warm fallback.',
);
assert.match(
  mediaFrameSource,
  /media:\s*\{[\s\S]*?LESSON_MEDIA_VIEWPORT_STYLE[\s\S]*?aspectRatio: 3 \/ 2/,
  'The shared framed viewport must remain 3:2.',
);

console.log(`Verified full-bleed normalized lesson imagery across ${promptImageCards.length} prompt cards and ${promptImages.size} prompt assets in all ${units.size} A1 units.`);
