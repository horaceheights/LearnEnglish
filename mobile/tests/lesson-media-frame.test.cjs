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

const promptImageCards = [];
const units = new Set();
const stageCounts = new Map();
const lessonFiles = fs.readdirSync(generatedRoot).filter((filename) => /^lesson-.*\.json$/.test(filename));

for (const filename of lessonFiles) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  for (const card of lesson.cards) {
    if (!card.prompt_image_url) continue;
    promptImageCards.push({ card, lessonId: lesson.id });
    units.add(lesson.unit_id);
    stageCounts.set(card.stage, (stageCounts.get(card.stage) || 0) + 1);
  }
}

assert.equal(lessonFiles.length, 70, 'the frame audit must inspect all 70 A1 lessons');
assert.equal(units.size, 7, 'prompt-image framing must cover all seven units');
assert.ok(promptImageCards.length >= 758, 'the frame audit must cover the complete prompt-image catalog');
assert.ok((stageCounts.get('Use') || 0) >= 508, 'Completa/Use prompt images must remain in the global frame audit');
assert.ok((stageCounts.get('Recognize') || 0) >= 250, 'Recognize prompt images must remain in the global frame audit');

assert.match(
  cardViewSource,
  /\{card\.prompt_image_url \? \(\s*<LessonMediaFrame[\s\S]*?maxHeight=\{promptImageHeight\}[\s\S]*?<Image[\s\S]*?resizeMode="contain"[\s\S]*?source=\{lessonImageSource\(card\.prompt_image_url\)\}/,
  'Every prompt image, including Completa, must render inside the shared lesson-media frame.',
);
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

console.log(`Verified shared lesson-image framing across ${promptImageCards.length} prompt cards in all ${units.size} A1 units.`);
