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

const ts = require('../node_modules/typescript');
const { createRequire } = require('node:module');
const entry = path.join(mobileRoot, 'src', 'previewLessons.ts');
const localRequire = createRequire(entry);
const updates = { channel: 'preview' };
const compiled = ts.transpileModule(fs.readFileSync(entry, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const preview = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  id => id === 'expo-updates' ? updates : localRequire(id), preview, preview.exports,
);
const descriptors = JSON.parse(fs.readFileSync(path.resolve(mobileRoot, '../backend/courses.json'), 'utf8'));
const expected = descriptors.flatMap(course => JSON.parse(fs.readFileSync(
  path.resolve(mobileRoot, '..', course.catalogPath), 'utf8',
)).map(lesson => ({ lesson, courseId: course.id })));
const summaries = preview.exports.mergePreviewLessonSummaries([{ id: 'stale-backend-lesson' }]);
assert.deepEqual(summaries.map(lesson => [lesson.id, lesson.course_id]),
  expected.map(({ lesson, courseId }) => [lesson.id, courseId]),
  'Preview must preserve every registered course and its lesson order, without interleaving equal lesson numbers.');
for (const { lesson } of expected) {
  assert.deepEqual(preview.exports.getPreviewLessonMetadata(lesson.id), lesson);
  const copy = preview.exports.getPreviewLesson(lesson.id);
  assert.equal(copy.cards.length, lesson.cards.length);
  copy.cards[0].options.length = 0;
  assert.deepEqual(preview.exports.getPreviewLessonMetadata(lesson.id), lesson,
    'Opening or shuffling a lesson must not modify its embedded source.');
}
updates.channel = 'production';
const backend = [{ id: 'backend-owned' }];
assert.equal(preview.exports.mergePreviewLessonSummaries(backend), backend);
assert.equal(preview.exports.getPreviewLesson(expected[0].lesson.id), null);
console.log('Preview and Engine QA preserve the complete registered catalogs; Production retains backend authority.');
