const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'screens', 'CourseScreen.tsx'),
  'utf8',
);

assert.match(
  source,
  /<View style=\{styles\.unitMeta\}>[\s\S]*?<Text style=\{styles\.unitEyebrow\}>UNIT 1<\/Text>[\s\S]*?<Text style=\{styles\.unitLevel\}>\{lessons\[0\]\.level\}<\/Text>/,
  'The unit header must show the level from the unit lesson metadata.',
);
assert.doesNotMatch(
  source,
  /\{lesson\.level\}/,
  'Lesson rows must not repeat the Beginner A1 label.',
);
assert.doesNotMatch(
  source,
  /lessonLevel:/,
  'The retired per-lesson level badge style must not return.',
);
assert.match(
  source,
  /unitLevel: \{ backgroundColor: '#fff7e9',[\s\S]*?fontWeight: '900'/,
  'The unit-level label must retain a readable badge treatment.',
);

console.log('Beginner level label appears only in the unit header.');
