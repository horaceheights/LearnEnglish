const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const qaSource = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'EngineQAScreen.tsx'),
  'utf8',
);
const embeddedCourse = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'a1-course.json'),
  'utf8',
));

assert.match(
  qaSource,
  /const unitGroups = useMemo[\s\S]*?new Map<string, LessonSummary\[]>[\s\S]*?unitIdFor\(lesson\)/,
  'Engine QA must group the complete catalog by unit instead of rendering one 70-lesson stack.',
);
assert.match(
  qaSource,
  /selectedUnitLessons\.map\(\(lesson\)/,
  'Engine QA must render only the ten lessons in the selected unit.',
);
assert.doesNotMatch(
  qaSource,
  /<View style=\{styles\.lessonList\}>[\s\S]*?lessons\.map/,
  'Engine QA must not restore the old flattened lesson list.',
);
assert.match(qaSource, /1 · UNIDAD/);
assert.match(qaSource, /2 · LECCIÓN/);
assert.match(qaSource, /3 · ETAPA/);
assert.match(qaSource, /4 · TARJETA/);
assert.match(
  qaSource,
  /QA_LOCATION_STORAGE_KEY[\s\S]*?AsyncStorage\.getItem\(QA_LOCATION_STORAGE_KEY\)/,
  'Engine QA must restore its last course location from QA-only storage.',
);
assert.match(
  qaSource,
  /saveQaLocation\(\{ cardIndex, lessonId: selectedLesson\.id \}\)[\s\S]*?onOpenCard\(selectedLesson\.id, cardIndex\)/,
  'Engine QA must save the selected card before opening the real lesson player.',
);

const countsByUnit = embeddedCourse.reduce((counts, lesson) => {
  counts[lesson.unit_id] = (counts[lesson.unit_id] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(
  countsByUnit,
  Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`unit-${index + 1}`, 10])),
  'The compact QA navigator requires seven units with ten lessons each.',
);

console.log('Engine QA keeps the complete course reachable through a compact, restorable location navigator.');
