const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const qaSource = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'EngineQAScreen.tsx'),
  'utf8',
);
const courseSource = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'CourseScreen.tsx'),
  'utf8',
);

for (const [surface, source] of [
  ['normal Preview course', courseSource],
  ['Engine QA', qaSource],
]) {
  assert.match(
    source,
    /mergePreviewLessonSummaries\(\s*(?:nextLessons|backendLessons)\s*\)/,
    `${surface} must use the embedded Preview lesson catalog instead of exposing a stale backend catalog.`,
  );
}

console.log('Preview and Engine QA use the same embedded lesson catalog.');
