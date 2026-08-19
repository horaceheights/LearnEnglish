const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

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

console.log('New-vocabulary emphasis checks passed.');
