import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const lesson = JSON.parse(fs.readFileSync(new URL('../src/generated/lesson-5-parents-grandparents.json', import.meta.url), 'utf8'));
const examples = ['complete2', 'complete-sentence'].map(type => lesson.cards.find(card => card.interaction_type === type));
const noop = () => {};
const forbidden = /Escucha y forma|Toca o arrastra|Devuelve aquí|Frase completa\.|Deshacer|Reintentar|¡Muy bien!/;

test('native guided and full constructions celebrate only graded success and retain translation/replay', () => {
  for (const card of examples) {
    const viewport = { width: 390, height: 844, fontScale: 1 };
    const h = lessonHarness(viewport);
    const { SentenceConstruction } = h.load('components/SentenceConstruction.tsx');
    let result = null, selected = [], changes = 0, replays = 0, retries = 0;
    const render = (preserve = false) => h.render(() => e(SentenceConstruction, {
      card, result, selected, disabled: false, showHelp: true,
      onChange: () => changes++, onReplay: () => replays++, onRetry: () => retries++,
    }), 378, 530, preserve);
    assert.ok(render().some(r => r.props.accessibilityLabel === 'Palabras disponibles'));
    selected = [...card.correct_option_ids].reverse(); result = 'wrong';
    let records = render(true);
    assert.ok(records.some(r => r.props.accessibilityLabel === 'Reintentar'));
    assert.ok(records.some(r => r.props.accessibilityLabel?.startsWith('Respuesta incorrecta.')));
    assert.ok(!records.some(r => r.props.testID === 'construction-celebration'));
    records.find(r => r.props.accessibilityLabel === 'Reintentar').props.onPress();
    assert.equal(retries, 1);
    result = null; selected = [];
    assert.ok(render(true).some(r => r.props.accessibilityLabel === 'Palabras disponibles'));
    selected = card.correct_option_ids; result = 'correct';
    records = render(true);
    assert.equal(records.filter(r => r.props.testID === 'construction-celebration').length, 1);
    assert.ok(!records.some(r => forbidden.test(r.text)));
    assert.ok(!records.some(r => r.props.accessibilityLabel === 'Palabras disponibles'));
    assert.ok(records.some(r => r.props.accessibilityLabel === '¡Perfecto! ¡Buen trabajo!'));
    records.find(r => r.props.accessibilityLabel === 'Repetir frase en inglés').props.onPress();
    records.find(r => r.props.accessibilityLabel?.endsWith('. Mostrar traducción')).props.onPress();
    records = render(true);
    assert.ok(records.some(r => r.text === card.spanish_translation));
    assert.equal(changes, 0, 'A successful word tap translates without editing/scoring again.');
    assert.equal(replays, 1);
    assert.equal(records.filter(r => r.props.testID === 'construction-celebration').length, 1);
  }
});

// Render the actual web components, rather than testing source conditionals.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const react = { useState: value => [value, noop], useRef: value => ({ current: value }), useEffect: noop, useCallback: fn => fn };
const modules = new Map();
function loadWeb(file) {
  if (!path.extname(file)) file = ['.js', '.ts'].map(ext => file + ext).find(fs.existsSync);
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file.endsWith('.js') ? file + 'x' : file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require: id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx: e, jsxs: e, Fragment: 'Fragment' };
    if (id.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    return loadWeb(path.resolve(path.dirname(file), id));
  } });
  return exports;
}
function webTree(node) {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(webTree);
  if (typeof node !== 'object') return [String(node)];
  if (typeof node.type === 'function') return webTree(node.type(node.props));
  return [{ type: node.type, ...Object.fromEntries(Object.entries(node.props).filter(([key]) => key !== 'children')) }, ...webTree(node.props.children)];
}
test('web guided and full construction success removes correction UI, with the same praise as mobile', () => {
  const { default: SentenceConstruction } = loadWeb(fileURLToPath(new URL('../../frontend/components/SentenceConstruction.js', import.meta.url)));
  for (const card of examples) {
    const render = result => JSON.stringify(webTree(e(SentenceConstruction, {
      card, result, selected: result ? card.correct_option_ids : [], showHelp: true, imageSrc: '/scene.webp', location: 'UNIT 1 | LESSON 1.5',
      onChange: noop, onReplay: noop, onRetry: noop,
    })));
    const correct = render('correct');
    assert.doesNotMatch(correct, forbidden);
    assert.doesNotMatch(correct, /Palabras disponibles|word-correction-help/);
    assert.match(correct, /¡Perfecto!/); assert.match(correct, /¡Buen trabajo!/);
    assert.match(correct, /Repetir frase en inglés/); assert.match(correct, /Mostrar traducción/);
    assert.match(correct, /"role":"status"/);
    for (const state of [null, 'wrong']) assert.doesNotMatch(render(state), /construction-celebration/);
    assert.match(render('wrong'), /Reintentar/);
  }
});

test('both clients ship identical transparent celebration pixels and reduced-motion fallbacks', () => {
  const image = fs.readFileSync(new URL('../assets/mascots/serious/squirrel-professor-celebrating-v1.png', import.meta.url));
  assert.deepEqual(image, fs.readFileSync(new URL('../../frontend/public/mascots/squirrel-professor-celebrating-v1.png', import.meta.url)));
  assert.equal(image[25], 6, 'PNG uses RGBA, retaining generated transparency.');
  const native = fs.readFileSync(new URL('../src/components/ConstructionCelebration.tsx', import.meta.url), 'utf8');
  const web = fs.readFileSync(new URL('../../frontend/components/ConstructionCelebration.module.css', import.meta.url), 'utf8');
  assert.match(native, /if \(!active \|\| reduceMotion\) return/);
  assert.match(native, /return \(\) => animation.stop\(\)/);
  assert.doesNotMatch(native, /Animated.loop|onComplete|advance\(/);
  assert.match(web, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
});
