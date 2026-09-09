const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

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
assert.match(qaSource, /4 · TARJETA/);
assert.match(
  qaSource,
  /const missionExperience = isMissionLesson\(selectedLesson\);[\s\S]*?lessonNavigationGroups\(selectedLesson\)/,
  'Engine QA must select its navigation model from mission metadata rather than a lesson ID.',
);
assert.match(
  qaSource,
  /const groupSingular = missionExperience \? 'capítulo' : 'etapa';[\s\S]*?3 · \{groupSingular\.toUpperCase\(\)\}[\s\S]*?navigationGroups\.length\} \{groupPlural\}/,
  'Engine QA must label and count the third navigation level as chapters for missions and stages otherwise.',
);
assert.match(
  qaSource,
  /navigationGroups\.map\(\(group, groupIndex\)[\s\S]*?const count = group\.cardIndexes\.length;[\s\S]*?group\.label[\s\S]*?chooseGroup\(group\.id\)/,
  'Engine QA must render mission chapter labels and counts from the declared navigation groups.',
);
assert.match(
  qaSource,
  /\(selectedGroup\?\.cardIndexes \|\| \[\]\)\.flatMap/,
  'The QA card list must filter through the selected chapter or stage grouping.',
);
assert.match(
  qaSource,
  /missionExperience \? ` · modalidad \$\{item\.card\.stage\}` : ''/,
  'Mission QA rows may expose the hidden engine stage only when it is labeled as a modality.',
);
assert.match(
  qaSource,
  /if \(selectedCardPosition < 0 \|\| !visibleCards\.length\) return undefined;/,
  'Changing groups must also scroll the card list back to its selected first row.',
);
assert.doesNotMatch(
  qaSource,
  /lesson-10-family-mission/,
  'Mission-aware Engine QA behavior must never depend on the current mission lesson ID.',
);
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

// Render the course entry with native boundaries stubbed: the shortcut must be
// available before opening a modal, use the existing callback, and honor access.
const courseSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/CourseScreen.tsx'), 'utf8');
const state = [];
let stateIndex = 0;
const native = Object.fromEntries(
  ['ActivityIndicator', 'Image', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(name => [name, name]),
);
const modules = {
  react: {
    useCallback: callback => callback,
    useEffect: () => {},
    useMemo: factory => factory(),
    useState: initial => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
  },
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': {
    ...native,
    StyleSheet: { create: styles => styles, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 360, height: 780, fontScale: 1 }),
  },
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
  'expo-constants': { default: { nativeAppVersion: '1.6.0' } },
  'expo-updates': { channel: 'preview', useUpdates: () => ({ isUpdatePending: false }) },
  '../previewLessons': { getPreviewLessonMetadata: () => undefined },
  '../updates': { releaseVersionLabel: () => 'Versión de prueba' },
  '../components/PlayfulLoading': { PlayfulLoading: 'PlayfulLoading' },
};
const courseModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(courseSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: courseModule.exports,
  require: name => modules[name] || {},
});
function walk(element, predicate) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(child => walk(child, predicate));
  return [...(predicate(element) ? [element] : []), ...walk(element.props?.children, predicate)];
}
const byLabel = label => element => element.props?.accessibilityLabel === label;
let qaOpened = 0;
const courseProps = {
  profile: { displayName: 'QA reviewer', userId: 1 },
  onHome: () => {}, onViewProfile: () => {}, onSignOut: () => {},
  onOpenLesson: () => assert.fail('Opening QA must not start a learner lesson.'),
  onOpenQA: () => { qaOpened++; },
};
function renderCourse(props = courseProps) {
  stateIndex = 0;
  return courseModule.exports.CourseScreen(props);
}
let course = renderCourse();
const shortcuts = walk(course, byLabel('QA test'));
assert.equal(shortcuts.length, 1, 'An authorized account has exactly one QA shortcut.');
const modal = walk(course, element => element.type === 'Modal')[0];
assert.equal(modal.props.visible, false);
assert.equal(walk(modal, byLabel('QA test')).length, 0, 'QA must be outside the account popup.');
const settings = walk(course, byLabel('Opciones'))[0];
assert.ok(walk(course, element => element.type === 'View'
  && walk(element, byLabel('QA test')).length === 1
  && walk(element, byLabel('Opciones')).length === 1).length,
'QA and account controls must share the main header.');
shortcuts[0].props.onPress();
assert.equal(qaOpened, 1, 'One direct tap opens the existing QA hub.');
settings.props.onPress();
course = renderCourse();
assert.equal(walk(course, element => element.type === 'Modal')[0].props.visible, true,
  'The account menu must remain functional.');
walk(course, byLabel('Cerrar'))[0].props.onPress();
assert.equal(walk(renderCourse(), element => element.type === 'Modal')[0].props.visible, false);
assert.equal(walk(renderCourse({ ...courseProps, onOpenQA: undefined }), byLabel('QA test')).length, 0,
  'Accounts without QA access must not see the shortcut.');

console.log('Engine QA keeps the complete course reachable through a compact, restorable location navigator.');
