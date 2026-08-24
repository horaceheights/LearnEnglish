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
const embeddedCourse = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'a1-course.json'),
  'utf8',
));

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

assert.equal(embeddedCourse.length, 70, 'Preview must always ship the complete 70-lesson A1 catalog.');
const lessonCountsByUnit = Object.groupBy
  ? Object.fromEntries(Object.entries(Object.groupBy(embeddedCourse, (lesson) => lesson.unit_id)).map(([unitId, lessons]) => [unitId, lessons.length]))
  : embeddedCourse.reduce((counts, lesson) => ({ ...counts, [lesson.unit_id]: (counts[lesson.unit_id] || 0) + 1 }), {});
assert.deepEqual(
  lessonCountsByUnit,
  Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`unit-${index + 1}`, 10])),
  'Preview must retain Units 1–7 with exactly 10 lessons in each unit.',
);

console.log('Preview and Engine QA use the same complete seven-unit embedded lesson catalog.');
