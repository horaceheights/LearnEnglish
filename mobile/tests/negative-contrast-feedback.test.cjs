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

const negativeRecognizeChoices = lesson.cards.filter((card) => (
  card.stage === 'Recognize'
  && /\b(?:is|are) not\b/i.test(card.audio_text || '')
  && card.options.every((option) => option.label && option.image_url)
));
const negativeListenChoices = lesson.cards.filter((card) => (
  card.stage === 'Listen'
  && /\b(?:is|are) not\b/i.test(card.audio_text || '')
  && card.options.every((option) => option.image_url)
));
const negativeContrastChoices = [...negativeRecognizeChoices, ...negativeListenChoices];

assert.equal(negativeContrastChoices.length, 10, 'Lesson 1.7 must retain all ten negative contrast choices.');
assert.equal(
  negativeRecognizeChoices.filter((card) => !card.prompt_image_url).length,
  5,
  'Each Recognize contrast must use picture choices without revealing a matching text answer.',
);
assert.equal(
  negativeListenChoices.filter((card) => !card.prompt_image_url).length,
  5,
  'Each Listen contrast must keep the answer text hidden and require a true image choice.',
);
for (const card of negativeContrastChoices) {
  assert.match(
    card.answer_audio_text || '',
    /\b(?:is|are) not\b.*(?:,|\.)\s+(?:he|she|they) (?:is|are) [a-z]+(?:\s+and\s+[a-z]+)?\.$/i,
    `Negative card must confirm the positive action only after success: ${card.audio_text}`,
  );
  assert.notEqual(card.answer_audio_text, card.audio_text, 'The pre-answer audio must remain the short negative sentence.');
}

assert.match(
  lessonScreenSource,
  /const contrastAnswerAudio = currentCard\?\.answer_audio_text\?\.trim\(\) \?\? ''[\s\S]*result === 'correct'[\s\S]*currentCard\?\.stage === 'Recognize'[\s\S]*contrastAnswerAudio !== promptAudio\.trim\(\)[\s\S]*correctContrastPrompt \|\|/,
  'Native Preview must reveal the full contrast only after a correct Recognize answer.',
);
assert.match(
  lessonScreenSource,
  /basePromptFontSize \* \(correctContrastPrompt \? 0\.76 : 1\)/,
  'Native Preview must shrink the completed contrast to fit the header.',
);
assert.match(
  webPlayerSource,
  /lastResult === "correct"[\s\S]*currentCard\?\.stage === "Recognize"[\s\S]*answer_audio_text\?\.trim\(\) !== cardPromptText\.trim\(\)[\s\S]*correctContrastPrompt \|\|/,
  'Web lessons must reveal the same full contrast only after a correct Recognize answer.',
);
assert.match(
  webPlayerSource,
  /correctContrastPrompt[\s\S]*?"1\.08rem"/,
  'Web lessons must shrink the completed contrast on mobile.',
);

console.log('Negative contrast feedback checks passed.');
