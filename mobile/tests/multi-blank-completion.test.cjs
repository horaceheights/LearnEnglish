const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src/generated/lesson-1-people-actions.json'),
  'utf8',
));
const lessonScreenSource = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const lessonCardSource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonCardView.tsx'),
  'utf8',
);
const frontendSource = fs.readFileSync(
  path.resolve(__dirname, '../../frontend/components/LessonPlayer.js'),
  'utf8',
);

const stageCounts = Object.fromEntries(
  ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'].map((stage) => [
    stage,
    lesson.cards.filter((card) => card.stage === stage).length,
  ]),
);
assert.equal(lesson.cards.length, 42, 'Lesson 1.1 must keep the approved 42-card pilot.');
assert.deepEqual(stageCounts, { Learn: 10, Recognize: 10, Listen: 8, Speak: 7, Use: 7 });

const multiBlankCards = lesson.cards.filter((card) => card.correct_option_ids?.length);
assert.deepEqual(
  multiBlankCards.map((card) => card.slide_id),
  ['U5', 'U7'],
  'Lesson 1.1 must close each adult sequence with an ordered two-tile completion.',
);
assert.deepEqual(multiBlankCards.map((card) => card.correct_option_ids), [['he', 'a'], ['she', 'a']]);
for (const card of multiBlankCards) {
  assert.equal((card.prompt.match(/_{2,}/g) || []).length, 2);
  assert.equal(new Set(card.correct_option_ids).size, 2, `${card.slide_id} cannot reuse one tile twice.`);
  assert.equal(card.correct_option_id, card.correct_option_ids[0]);
}

assert.match(
  lessonScreenSource,
  /const nextSelectedIds = isMultiBlankCompletion[\s\S]*?setSelectedIds\(nextSelectedIds\)[\s\S]*?if \(nextSelectedIds\.length < correctOptionIds\.length\)/,
  'Mobile must preserve a visible partial sequence and wait for every required tile before grading.',
);
assert.match(
  lessonScreenSource,
  /prompt\.replace\(\/_\{2,\}\/g, \(blank\) => labels\[labelIndex\+\+\] \|\| blank\)/,
  'Mobile must fill non-contiguous blanks in authored order.',
);
assert.match(
  lessonCardSource,
  /revealPending \? styles\.pendingOption[\s\S]*?revealCorrect \? styles\.correctOption[\s\S]*?revealWrong \? styles\.wrongOption/,
  'Mobile tiles must visibly distinguish partial, correct, and wrong ordered selections.',
);
assert.match(
  lessonCardSource,
  /Math\.max\(52, Math\.min\(62, viewportHeight \* 0\.07\)\)/,
  'Mobile text tiles must retain the responsive minimum tap target.',
);
assert.match(
  lessonCardSource,
  /useCompactCompletionTiles[\s\S]*?\? '31%'/,
  'Three short mobile completion tiles must share one responsive row.',
);

assert.match(
  frontendSource,
  /const nextSelectedOptionIds = isMultiBlankCompletion[\s\S]*?setSelectedOptionIds\(nextSelectedOptionIds\)[\s\S]*?if \(nextSelectedOptionIds\.length < correctOptionIds\.length\)/,
  'Web must use the same progressive ordered-selection contract as mobile.',
);
assert.match(
  frontendSource,
  /disabled: lastResult === "correct" \|\| isPartialSequenceSelection/,
  'Web must prevent reuse of a tile during an unfinished ordered attempt.',
);
assert.match(
  frontendSource,
  /useCompactCompletionTiles[\s\S]*?"repeat\(3, minmax\(0, 1fr\)\)"/,
  'Three short web completion tiles must share one responsive row.',
);

console.log('Lesson 1.1 keeps 42 cards and ordered two-tile completion parity on mobile and web.');
