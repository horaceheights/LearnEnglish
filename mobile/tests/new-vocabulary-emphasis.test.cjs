const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const webPlayerSource = fs.readFileSync(webPlayerPath, 'utf8');

assert.match(
  lessonScreenSource,
  /currentCard\?\.stage !== 'Learn'/,
  'Animated vocabulary emphasis must remain limited to Learn cards.',
);
assert.match(
  lessonScreenSource,
  /lesson\.vocabulary\.flatMap/,
  'The lesson vocabulary contract must be the source of new-word emphasis.',
);
assert.match(
  lessonScreenSource,
  /<Animated\.Text[\s\S]*styles\.newVocabulary/,
  'New vocabulary must render through the shared animated text treatment.',
);
assert.match(
  lessonScreenSource,
  /duration: 900/,
  'New vocabulary animation must be brief and play once.',
);
assert.match(
  lessonScreenSource,
  /hasNewVocabularyInPrompt \|\| reduceMotion/,
  'Reduced-motion learners must not receive the stretch animation.',
);
assert.match(
  lessonScreenSource,
  /lesson\.id === 'lesson-7-is-are-not' && normalizedPart === 'not'/,
  'Lesson 1.7 must retain a visible focus on not after its initial Learn cards.',
);
assert.match(
  lessonScreenSource,
  /fontSize: promptFontSize \* 1\.22/,
  'The focused not must be larger than the surrounding sentence.',
);
assert.match(
  webPlayerSource,
  /fontSize: "1\.18em"[\s\S]*?activeLesson\?\.id === "lesson-7-is-are-not" && normalizedPart === "not"/,
  'Web lesson prompts must retain the same larger not focus as native Preview.',
);

console.log('New-vocabulary emphasis checks passed.');
