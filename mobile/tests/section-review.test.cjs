const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

assert.doesNotMatch(
  lessonScreenSource,
  /result === 'correct' \|\| completedCardsRef\.current\.has\(cardIndex\)/,
  'Completed cards must not reject taps when a learner reopens an earlier section.',
);

assert.match(
  lessonScreenSource,
  /if \(!currentCard \|\| result === 'correct' \|\| correctChoiceHandledRef\.current\) return;/,
  'Rapid correct taps must be stopped by a per-card interaction lock.',
);

assert.match(
  lessonScreenSource,
  /const attempt = prepareCardChoice\([\s\S]*?completedCardsRef\.current,[\s\S]*?cardIndex,[\s\S]*?\);/,
  'Choice handling must explicitly support completed-card review state.',
);

const lockResetCount = (lessonScreenSource.match(/correctChoiceHandledRef\.current = false;/g) || []).length;
assert.ok(
  lockResetCount >= 2,
  'The correct-choice lock must reset on both card advance and manual section/card navigation.',
);

const reviewCompletionCount = (
  lessonScreenSource.match(/setCompletedLessonMode\('review-complete'\);/g) || []
).length;
assert.equal(
  reviewCompletionCount,
  2,
  'Automatic and swipe-based section review completion must leave the final card for a distinct completion screen.',
);

assert.match(
  lessonScreenSource,
  /completedLessonMode === 'review-complete'[\s\S]*?SECCIÓN TERMINADA[\s\S]*?Practicar otra sección[\s\S]*?Volver a las lecciones/,
  'A completed section review must offer clear next actions instead of leaving a dimmed final card on screen.',
);

console.log('Completed-section review checks passed.');
