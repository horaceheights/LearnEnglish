const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const catalogs = require('../src/generated/course-catalogs.json');
const allLessons = require('../src/generated/all-courses.json');
const summaries = catalogs.flatMap(course => course.lessonIds.map(id => ({
  ...allLessons.find(lesson => lesson.id === id), course_id: course.id,
})));
function load(file, modules) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: module.exports, require: name => modules[name] || {}, setTimeout, clearTimeout });
  return module.exports;
}
const mission = load('src/missionExperience.ts', {});
const state = [], effects = [];
let index = 0, initial = true, stored = null, opened;
const modules = {
  react: {
    useState: value => { const i = index++; if (!(i in state)) state[i] = value;
      return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
    useMemo: fn => fn(), useCallback: fn => fn, useRef: value => ({ current: value }),
    useEffect: fn => { if (initial) effects.push(fn); },
  },
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { ...Object.fromEntries(['ActivityIndicator','FlatList','Pressable','ScrollView','Text','View'].map(n => [n,n])),
    StyleSheet: { create: s => s }, BackHandler: { addEventListener: () => ({ remove() {} }) } },
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  '@react-native-async-storage/async-storage': { __esModule: true, default: {
    getItem: async () => stored, setItem: async (_key, value) => { stored = value; },
  } },
  '../api': { getLessons: async () => summaries, getLesson: async id => allLessons.find(l => l.id === id) },
  '../previewLessons': { mergePreviewLessonSummaries: value => value, previewCourseCatalogs: catalogs },
  '../diagnostics': { isCrashReportingConfigured: () => false, setDiagnosticContext() {}, captureDiagnosticError: e => { throw e; } },
  '../missionExperience': mission,
};
const { EngineQAScreen } = load('src/screens/EngineQAScreen.tsx', modules);
const render = () => { index = 0; const tree = EngineQAScreen({ onExit() {}, onOpenCard: (id, card) => { opened = [id, card]; } }); initial = false; return tree; };
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(n => walk(n, predicate));
  return [...(predicate(node) ? [node] : []), ...walk(node.props?.children, predicate), ...walk(node.props?.ListHeaderComponent, predicate)];
}
const label = (tree, value) => walk(tree, n => n.props?.accessibilityLabel === value)[0];
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
(async () => {
  render(); effects.forEach(fn => fn()); await settle();
  let tree = render();
  assert.ok(label(tree, 'Curso A1')); assert.ok(label(tree, 'Curso A1+'));
  label(tree, 'Curso A1+').props.onPress(); await settle(); tree = render();
  assert.equal(label(tree, 'Curso A1+').props.accessibilityState.selected, true);
  const lessonButtons = walk(tree, n => n.type === 'Pressable' && /^1\.\d+\./.test(n.props?.accessibilityLabel || ''));
  assert.equal(lessonButtons.length, 12, 'A1+ must expose all twelve lessons without A1 unit-number collisions.');
  for (const [position, button] of lessonButtons.entries()) {
    button.props.onPress(); await settle();
    const lessonList = walk(render(), n => n.type === 'FlatList')[0];
    assert.ok(lessonList.props.data.length);
    lessonList.props.renderItem({ item: lessonList.props.data[0] }).props.onPress();
    assert.equal(opened[0], catalogs.find(course => course.id === 'a1-plus').lessonIds[position]);
  }
  label(tree, 'Curso A1+').props.onPress(); await settle(); tree = render();
  const list = walk(tree, n => n.type === 'FlatList')[0];
  assert.ok(list.props.data.length);
  const item = list.props.data[0];
  list.props.renderItem({ item }).props.onPress();
  assert.equal(opened[0], 'a1plus-unit-1-lesson-1-1');
  assert.equal(JSON.parse(stored).lessonId, opened[0]);
  label(tree, 'Curso A1').props.onPress(); await settle(); tree = render();
  assert.equal(label(tree, 'Curso A1').props.accessibilityState.selected, true);
  assert.equal(walk(tree, n => n.type === 'Pressable' && /^Unidad /.test(n.props?.accessibilityLabel || '')).length, 7);
  // A saved A1+ location must restore both the course tab and the exact card.
  stored = JSON.stringify({ lessonId: 'a1plus-unit-1-lesson-1-1', cardIndex: 16 });
  state.length = 0; effects.length = 0; initial = true; render(); effects.forEach(fn => fn()); await settle();
  tree = render(); assert.equal(label(tree, 'Curso A1+').props.accessibilityState.selected, true);
  const restored = walk(tree, n => n.type === 'FlatList')[0];
  const target = restored.props.data.find(row => row.index === 16);
  assert.ok(target, 'Restored QA must expose the reported listening card.');
  restored.props.renderItem({ item: target }).props.onPress();
  assert.deepEqual(opened, ['a1plus-unit-1-lesson-1-1', 16]);
  console.log('QA selects A1/A1+, opens all A1+ lessons, and restores the exact listening card.');
})().catch(error => { console.error(error); process.exitCode = 1; });
