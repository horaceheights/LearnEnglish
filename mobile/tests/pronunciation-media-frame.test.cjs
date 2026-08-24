const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(mobileRoot, 'src', 'generated');
const pronunciationSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/PronunciationPractice.tsx'),
  'utf8',
);
const optionMediaSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/OptionMediaImage.tsx'),
  'utf8',
);
const mediaFrameSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonMediaFrame.tsx'),
  'utf8',
);
const cardViewSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonCardView.tsx'),
  'utf8',
);

const pronunciationCards = [];
for (const filename of fs.readdirSync(generatedRoot)) {
  if (!/^lesson-.*\.json$/.test(filename)) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  for (const card of lesson.cards) {
    if (card.stage === 'Speak' || card.stage === 'Pronunciation Practice') {
      pronunciationCards.push({ card, lessonId: lesson.id });
    }
  }
}

assert.ok(pronunciationCards.length >= 422, 'the framing guardrail must cover the complete A1 Speak catalog');
for (const { card, lessonId } of pronunciationCards) {
  assert.equal(card.options.length, 1, `${lessonId} pronunciation cards must keep one focused model image`);
  assert.ok(card.options[0].image_url, `${lessonId} pronunciation card ${card.prompt} needs its model image`);
}

assert.match(
  pronunciationSource,
  /<LessonMediaFrame[\s\S]*?maxHeight=\{imageHeight\}[\s\S]*?<OptionMediaImage[\s\S]*?accessibilityLabel=\{imageLabel \|\| phrase\}[\s\S]*?imageUrl=\{imageUrl\}[\s\S]*?preserveSubject/,
  'Every pronunciation image must use the shared option-media image layer.',
);
assert.match(
  optionMediaSource,
  /lessonOptionImageSource\(imageUrl\)[\s\S]*?resizeMode=\{preserveSubject \? 'contain' : 'cover'\}/,
  'Pronunciation and choice cards must share normalized assets without forcing portrait model images through a destructive crop.',
);
assert.match(
  optionMediaSource,
  /const topAligned = !preserveSubject && TOP_ALIGNED_OPTION_MEDIA/,
  'Subject-preserving pronunciation images must bypass the option-card top crop.',
);
assert.match(cardViewSource, /<OptionMediaImage imageUrl=\{option\.image_url\} \/>/);
assert.match(
  mediaFrameSource,
  /LESSON_MEDIA_FRAME_STYLE = \{[\s\S]*?borderColor: '#172d35'[\s\S]*?borderRadius: 24[\s\S]*?borderWidth: 4[\s\S]*?padding: 8/,
  'Pronunciation media must use the established dark inset option frame with rounded corners.',
);
assert.match(
  mediaFrameSource,
  /media:\s*\{[\s\S]*?LESSON_MEDIA_VIEWPORT_STYLE[\s\S]*?aspectRatio: 3 \/ 2/,
  'Pronunciation media must use rounded 3:2 inner clipping.',
);
assert.doesNotMatch(
  pronunciationSource,
  /lessonImageSource\(imageUrl\)/,
  'Pronunciation lesson art must not bypass the shared framed media layer.',
);

console.log(`Verified shared rounded pronunciation framing across ${pronunciationCards.length} A1 Speak cards.`);
