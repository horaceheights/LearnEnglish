const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenSource = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/LessonScreen.tsx'),
  'utf8',
);
const webPlayerSource = fs.readFileSync(
  path.resolve(__dirname, '../../frontend/components/LessonPlayer.js'),
  'utf8',
);
const lesson = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../src/generated/lesson-7-is-are-not.json'),
  'utf8',
));

const negativeImageChoices = lesson.cards.filter((card) => (
  ['Recognize', 'Listen'].includes(card.stage)
  && /\b(?:is|are) not\b/i.test(card.audio_text || '')
  && card.options.every((option) => option.image_url)
));

assert.equal(negativeImageChoices.length, 8, 'Lesson 1.7 must retain all eight negative image choices.');
for (const card of negativeImageChoices) {
  assert.match(
    card.answer_audio_text || '',
    /\b(?:is|are) not\b[^,]*,\s+(?:he|she|they) (?:is|are) [a-z]+\.$/i,
    `Negative card must confirm the positive action after the comma: ${card.audio_text}`,
  );
}

assert.match(
  lessonScreenSource,
  /result === 'correct'[\s\S]*currentCard\?\.stage === 'Recognize'[\s\S]*answer_audio_text\?\.includes\(','\)[\s\S]*correctContrastPrompt \|\|/,
  'Native Preview must reveal the full contrast only after a correct Recognize answer.',
);
assert.match(
  lessonScreenSource,
  /basePromptFontSize \* \(correctContrastPrompt \? 0\.76 : 1\)/,
  'Native Preview must shrink the completed contrast to fit the header.',
);
assert.match(
  webPlayerSource,
  /lastResult === "correct"[\s\S]*currentCard\?\.stage === "Recognize"[\s\S]*answer_audio_text\?\.includes\(","\)[\s\S]*correctContrastPrompt \|\|/,
  'Web lessons must reveal the same full contrast only after a correct Recognize answer.',
);
assert.match(
  webPlayerSource,
  /correctContrastPrompt[\s\S]*?"1\.08rem"/,
  'Web lessons must shrink the completed contrast on mobile.',
);

console.log('Negative contrast feedback checks passed.');
