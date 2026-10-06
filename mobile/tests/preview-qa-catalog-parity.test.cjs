const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');

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

assert.equal(embeddedCourse.length, courseContract.lessonCount, 'Preview must always ship the complete A1 catalog pinned by the release manifest.');
assert.equal(courseContract.courseId, 'a1', 'The release manifest must preserve the stable A1 course identity.');
for (const lesson of embeddedCourse) {
  assert.ok(Number.isInteger(lesson.content_revision) && lesson.content_revision >= 1,
    `${lesson.id} must embed a positive content revision.`);
  const cardIds = lesson.cards.map((card) => card.slide_id);
  assert.ok(cardIds.every((cardId) => typeof cardId === 'string' && cardId.trim() === cardId && cardId.length > 0),
    `${lesson.id} must embed a nonblank ID for every card.`);
  assert.equal(new Set(cardIds).size, cardIds.length,
    `${lesson.id} card IDs must be unique within the lesson.`);
}
const lessonCountsByUnit = Object.groupBy
  ? Object.fromEntries(Object.entries(Object.groupBy(embeddedCourse, (lesson) => lesson.unit_id)).map(([unitId, lessons]) => [unitId, lessons.length]))
  : embeddedCourse.reduce((counts, lesson) => ({ ...counts, [lesson.unit_id]: (counts[lesson.unit_id] || 0) + 1 }), {});
assert.deepEqual(
  lessonCountsByUnit,
  courseContract.lessonsByUnit,
  'Preview must retain every unit with exactly the lesson count pinned by the release manifest.',
);

console.log('Preview and Engine QA use the same complete seven-unit embedded lesson catalog.');
