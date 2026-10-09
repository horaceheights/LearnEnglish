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

test('Completa translates the full authored target in empty, partial, wrong and correct states in every unit', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../src/generated/a1-course.json', import.meta.url), 'utf8'));
  const cards = catalog.flatMap(lesson => lesson.cards.filter(card => ['complete2', 'complete-sentence'].includes(card.interaction_type)));
  assert.ok(cards.length > 500);
  for (const card of cards) assert.ok(card.spanish_translation && !card.spanish_translation.includes('___'), card.slide_id);
  for (let unit = 1; unit <= 7; unit++) for (const type of ['complete2', 'complete-sentence']) {
    const card = catalog.filter(lesson => lesson.unit_id === `unit-${unit}`).flatMap(lesson => lesson.cards).find(card => card.interaction_type === type);
    for (const state of ['empty', 'partial', 'wrong', 'correct']) {
      const h = lessonHarness({ width: 390, height: 844, fontScale: 1 });
      const { SentenceConstruction } = h.load('components/SentenceConstruction.tsx');
      const selected = state === 'empty' ? [] : state === 'partial' ? card.correct_option_ids.slice(0, 1) : [...card.correct_option_ids];
      if (state === 'wrong') selected.reverse();
      const result = ['wrong', 'correct'].includes(state) ? state : null;
      let changes = 0, replays = 0;
      const render = preserve => h.render(() => e(SentenceConstruction, {
        card, selected, result, disabled: false, onChange: () => changes++, onReplay: () => replays++, onRetry: noop,
      }), 378, 530, preserve);
      let records = render(false);
      assert.ok(!records.some(r => r.text === card.spanish_translation), 'No automatic assessment translation.');
      assert.ok(!records.some(r => r.text === 'Traducir frase' || r.props.accessibilityLabel === 'Mostrar traducción'), 'No extra translation control.');
      records.find(r => r.props.accessibilityLabel?.endsWith('. Mostrar traducción')).props.onPress();
      records = render(true);
      assert.ok(records.some(r => r.text === card.spanish_translation), `Unit ${unit}, ${type}, ${state}`);
      const spanish = records.find(r => r.text === card.spanish_translation);
      const sentence = records.find(r => r.props.testID === 'construction-sentence-surface');
      assert.ok(spanish.box.top >= sentence.box.top && spanish.box.top + spanish.box.height <= sentence.box.top + sentence.box.height + 1,
        `Spanish stays inside the sentence surface: ${JSON.stringify({unit, type, state, spanish: spanish.box, sentence: sentence.box})}`);
      assert.equal(changes, 0, 'Translation must never place, remove or grade a tile.');
      records.find(r => r.props.accessibilityLabel === 'Repetir frase en inglés').props.onPress();
      assert.equal(replays, 1);
      if (state === 'partial') {
        records.find(r => r.props.accessibilityLabel?.startsWith('Espacio 1:')).props.onPress();
        assert.equal(changes, 1, 'A placed tile remains editable while translation is visible.');
      }
    }
  }
});

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

test('long manual translations fit the native sentence surface in portrait and short landscape', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../src/generated/a1-course.json', import.meta.url), 'utf8'));
  const cards = ['complete2', 'complete-sentence'].flatMap(type => catalog.flatMap(lesson => lesson.cards)
    .filter(card => card.interaction_type === type)
    .sort((a, b) => b.spanish_translation.length - a.spanish_translation.length).slice(0, 2));
  for (const [width, height] of [[320, 568], [390, 844], [740, 360], [915, 412]]) for (const fontScale of [1, 2]) {
    const viewport = { width, height, fontScale }, h = lessonHarness(viewport);
    const { SentenceConstruction } = h.load('components/SentenceConstruction.tsx');
    const landscape = width > height;
    const paneWidth = landscape ? (width - 56) * .72 - 8 : width - 20;
    const paneHeight = landscape ? height - 32 : height - 300;
    for (const card of cards) for (const result of [null, 'correct']) {
      const selected = result ? card.correct_option_ids : [];
      const render = preserve => h.render(() => e(SentenceConstruction, {
        card, selected, result, disabled: false, onChange: noop, onReplay: noop, onRetry: noop,
      }), paneWidth, paneHeight, preserve);
      let records = render(false);
      records.find(r => r.props.accessibilityLabel?.endsWith('. Mostrar traducción')).props.onPress();
      records = render(true);
      const spanish = records.find(r => r.text === card.spanish_translation);
      const sentence = records.find(r => r.props.testID === 'construction-sentence-surface');
      const context = `${width}/${height}/${fontScale}/${card.slide_id}/${result}`;
      const sentenceScroll = records.find(r => r.type === 'ScrollView' && r.props.accessibilityLabel?.startsWith('Frase'));
      if (landscape) assert.ok(spanish.box.top >= sentence.box.top && spanish.box.top + spanish.box.height <= sentence.box.top + sentence.box.height + 1,
        `${context}: Spanish remains within the sentence surface: ${JSON.stringify({spanish: spanish.box, sentence: sentence.box, text: spanish.text})}`);
      else {
        assert.ok(sentenceScroll.box.top >= sentence.box.top && sentenceScroll.box.top + sentenceScroll.box.height <= sentence.box.top + sentence.box.height + 1,
          `${context}: enlarged sentence content stays within its existing portrait scroll surface.`);
        let shown = 0;
        sentenceScroll.props.ref({ scrollToEnd: () => shown++ });
        sentenceScroll.props.onContentSizeChange();
        assert.equal(shown, 1, 'Opening Spanish brings it into view in the existing scroll surface.');
      }
      assert.ok(spanish.textHeight <= spanish.box.height + 1, `${context}: full Spanish remains readable.`);
      assert.ok(sentence.box.top + sentence.box.height <= paneHeight + 1, `${context}: sentence fits the activity pane.`);
      if (landscape) for (const record of records) {
        assert.ok(record.box.top + record.box.height <= paneHeight + 1,
          `${context}: ${record.text || record.props.accessibilityLabel || record.type} extends beyond the activity pane: ${JSON.stringify(record.box)}`);
        if (record.text.trim()) assert.ok(record.textHeight <= record.box.height + 1.5, `${context}: ${record.text} is clipped.`);
      }
    }
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
  vm.runInNewContext(source, { exports, setTimeout, clearTimeout, requestAnimationFrame: noop, require: id => {
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

test('web translation remains interactive for both construction types in all seven units and all answer states', () => {
  const { default: SentenceConstruction } = loadWeb(fileURLToPath(new URL('../../frontend/components/SentenceConstruction.js', import.meta.url)));
  const catalog = JSON.parse(fs.readFileSync(new URL('../src/generated/a1-course.json', import.meta.url), 'utf8'));
  const originalState = react.useState;
  try {
    for (let unit = 1; unit <= 7; unit++) for (const type of ['complete2', 'complete-sentence']) {
      const card = catalog.filter(l => l.unit_id === `unit-${unit}`).flatMap(l => l.cards).find(c => c.interaction_type === type);
      for (const state of ['empty', 'partial', 'wrong', 'correct']) {
        const values = []; let cursor = 0, edits = 0, replays = 0;
        react.useState = initial => {
          const index = cursor++;
          if (!(index in values)) values[index] = initial;
          return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
        };
        const selected = state === 'empty' ? [] : state === 'partial' ? card.correct_option_ids.slice(0, 1) : [...card.correct_option_ids];
        if (state === 'wrong') selected.reverse();
        const render = () => {
          cursor = 0;
          return webTree(e(SentenceConstruction, {card, selected, result: ['wrong', 'correct'].includes(state) ? state : null,
            onChange: () => edits++, onReplay: () => replays++, onRetry: noop}));
        };
        let nodes = render();
        assert.ok(!nodes.includes(card.spanish_translation));
        assert.ok(!nodes.includes('Traducir frase'));
        assert.ok(!nodes.some(n => n['aria-label'] === 'Mostrar traducción'));
        nodes.find(n => n['aria-label']?.endsWith('. Mostrar traducción')).onClick();
        nodes = render();
        assert.ok(nodes.includes(card.spanish_translation), `Unit ${unit}/${type}/${state}`);
        assert.equal(edits, 0);
        nodes.find(n => n['aria-label'] === 'Repetir frase en inglés').onClick();
        assert.equal(replays, 1);
        if (state === 'partial') {
          nodes.find(n => n['aria-label']?.startsWith('Espacio 1:')).onClick({ detail: 0 });
          assert.equal(edits, 1, 'Keyboard activation still returns a placed word while Spanish is visible.');
        }
        assert.ok(!nodes.some(n => n['aria-label'] === 'Ocultar traducción'), 'Translation is inline text, not another button.');
      }
    }
  } finally { react.useState = originalState; }
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
