const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'screens', 'CourseScreen.tsx'),
  'utf8',
);

assert.match(
  source,
  /progress\?\.passed\s*\? styles\.lessonStepCompleted\s*: isCurrent \? styles\.lessonStepCurrent/,
  'Passed and current lessons must use separate badge styles.',
);
assert.match(
  source,
  /progress\?\.passed[\s\S]*?styles\.lessonStatusCompleted[\s\S]*?: isCurrent[\s\S]*?styles\.lessonStatusCurrent/,
  'Completed and current lesson status labels must use separate colors.',
);
assert.match(
  source,
  /lessonStepCurrent: \{ backgroundColor: '#e96f42' \}/,
  'The current lesson must use the orange numbered dot.',
);
assert.match(
  source,
  /lessonRowCurrent: \{ backgroundColor: '#fff5e8', borderColor: '#e6a84a'/,
  'The current lesson row must use a warm orange accent.',
);
assert.match(
  source,
  /lessonStatusCurrent: \{ color: '#c94d24' \}/,
  'The current Disponible label must be orange.',
);
assert.match(
  source,
  /lessonStepCompleted: \{ backgroundColor: '#23856f' \}/,
  'Completed lesson badges must remain green.',
);
assert.match(
  source,
  /lessonStatusCompleted: \{ color: '#16766f' \}/,
  'Completed lesson status must remain green.',
);
assert.match(
  source,
  /<MaterialIcons color="#fff" name="check" size=\{18\} \/>[\s\S]*?\{lessonStepNumber\}/,
  'Only passed lessons should show a check; current lessons must retain their lesson number.',
);

console.log('Course progress colors distinguish current lessons from completed lessons.');
