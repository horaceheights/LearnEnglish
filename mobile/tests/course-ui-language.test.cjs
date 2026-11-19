// User decision 2026-11-19: a course taught to English speakers (German now,
// Spanish next) runs its app screens in English; A1 and A1+ keep Spanish.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const read = relative => fs.readFileSync(path.join(mobileRoot, relative), 'utf8');

function load(relative) {
  const output = ts.transpileModule(read(relative), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: () => ({}) });
  return exports;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const { UI_ENGLISH, ui } = load('src/uiText.ts');
const sources = sourceFiles(path.join(mobileRoot, 'src'))
  .filter(file => !file.endsWith('uiText.ts'))
  .map(file => fs.readFileSync(file, 'utf8'));
const literal = /ui\(lang, '((?:[^'\\]|\\.)*)'/g;

test('every Spanish screen text passed to ui() has an English version', () => {
  const missing = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(literal)) {
      const key = match[1].replace(/\\'/g, "'");
      if (!(key in UI_ENGLISH)) missing.add(key);
    }
  }
  assert.deepEqual([...missing], []);
});

test('the English table holds no text the app no longer shows', () => {
  const unused = Object.keys(UI_ENGLISH).filter(key => !sources.some(source =>
    source.includes(`'${key.replace(/'/g, "\\'")}'`)));
  assert.deepEqual(unused, []);
});

test('ui() keeps Spanish for Spanish courses and fills values in both languages', () => {
  assert.equal(ui('es', 'Continuar'), 'Continuar');
  assert.equal(ui('en', 'Continuar'), 'Continue');
  assert.equal(ui('en', 'Siguiente lección: {name}', { name: '1.2 Hallo' }), 'Next lesson: 1.2 Hallo');
  assert.equal(ui('es', 'Siguiente lección: {name}', { name: '1.2 Hello' }), 'Siguiente lección: 1.2 Hello');
});

test('only courses for English speakers declare an English app language', () => {
  const courses = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'backend/courses.json'), 'utf8'));
  const catalogs = JSON.parse(read('src/generated/course-catalogs.json'));
  for (const course of courses) {
    const exported = catalogs.find(entry => entry.id === course.id);
    assert.equal(exported.uiLanguage, course.uiLanguage, course.id);
  }
  assert.equal(courses.find(course => course.id === 'de-a1').uiLanguage, 'en');
  assert.deepEqual(courses.filter(course => !course.uiLanguage).map(course => course.id), ['a1', 'a1-plus']);
});

test('English courses see English stage names and instructions', () => {
  const instructions = load('src/lessonInstructions.ts');
  assert.equal(instructions.lessonStageLabel('x', 'Recognize', 'en'), 'Recognize');
  assert.equal(instructions.lessonStageLabel('x', 'Recognize'), 'Reconoce');
  assert.equal(instructions.lessonStageShortLabel('x', 'Use', 'en'), 'Complete');
  assert.equal(instructions.pronunciationInstruction('en'), 'Listen and repeat!');
  assert.equal(instructions.listeningChoiceInstruction([{ image_url: 'a' }, { image_url: 'b' }], 'en'), 'Listen and choose the photo!');
  assert.equal(instructions.recognizeChoiceInstruction([{ label: 'Hallo.' }, { label: 'Tschüss.' }], 'en'), 'Choose the word that matches the picture!');
  assert.equal(instructions.lessonPromptText('x', 'Listen and choose.', 'en'), 'Listen and choose!');
});

test('lessons and the course home take their course language; the Spanish-only tutor stays off', () => {
  assert.match(read('App.tsx'), /UiLanguageContext\.Provider value=\{uiLanguageForLesson\(screen\.lessonId\)\}/);
  assert.match(read('src/screens/CourseScreen.tsx'), /const lang = uiLanguageForCourse\(activeCourseId\)/);
  assert.match(read('src/screens/LessonScreen.tsx'), /tutorContext = useMemo\(\(\) => lang === 'es' &&/);
  const guardrails = fs.readFileSync(path.join(repositoryRoot, 'docs/product/project-guardrails.md'), 'utf8');
  assert.match(guardrails, /uiLanguage/);
});
