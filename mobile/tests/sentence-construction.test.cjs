const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/sentenceConstruction.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/generated/lesson-1-people-actions.json')));
const pilots = lesson.cards.filter(api.isSentenceConstruction);
const rollout = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/generated/a1-course.json')))
  .filter(lesson => ['1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'].includes(lesson.sub_lesson_id))
  .flatMap(lesson => lesson.cards.filter(api.isSentenceConstruction));

test('three ordinary completions lead to four constructions with only required words', () => {
  assert.deepEqual(pilots.map(card => card.slide_id), ['U4', 'U5', 'U6', 'U7']);
  assert.deepEqual(pilots.map(card => card.options.length), [4, 6, 4, 6]);
  for (const card of pilots) {
    assert.doesNotMatch(card.prompt, /[a-z]/i);
    assert.equal(card.options.length, card.correct_option_ids.length);
    assert.equal(card.audio_text, card.answer_audio_text);
    assert.equal(card.audio_assets.find(a => a.purpose === 'prompt').variant, 'prompt');
  }
  for (const card of lesson.cards.filter(c => ['U1', 'U2', 'U3'].includes(c.slide_id))) {
    assert.equal(api.isSentenceConstruction(card), false);
    assert.equal(card.audio_assets[0].variant, 'completion-prompt');
  }
});

test('tap, arbitrary drop, outside drop, removal and repair share ordered validation', () => {
  assert.equal(rollout.length, 28);
  for (const card of [...pilots, ...rollout]) {
    let selected = api.sentenceSlots(card, []);
    const expected = card.correct_option_ids;
    const dropIndex = Math.min(2, expected.length - 1);
    selected = api.placeSentenceWord(card, selected, expected[dropIndex], dropIndex);
    assert.equal(selected[dropIndex], expected[dropIndex]);
    assert.equal(api.sentenceIsCorrect(card, selected), false);
    assert.deepEqual(api.placeSentenceWord(card, selected, expected[0], -1), selected);
    assert.deepEqual(api.placeSentenceWord(card, selected, expected[0], dropIndex), selected);
    assert.deepEqual(api.placeSentenceWord(card, selected, expected[dropIndex], 0), selected);
    for (const id of expected) if (!selected.includes(id)) selected = api.placeSentenceWord(card, selected, id);
    assert.equal(api.sentenceIsCorrect(card, selected), true);
    [selected[0], selected[1]] = [selected[1], selected[0]];
    assert.equal(api.sentenceIsCorrect(card, selected), false);
    const preserved = selected.slice(2);
    selected[0] = ''; selected[1] = '';
    selected = api.placeSentenceWord(card, selected, expected[0], 0);
    selected = api.placeSentenceWord(card, selected, expected[1], 1);
    assert.deepEqual(selected.slice(2), preserved);
    assert.equal(api.sentenceIsCorrect(card, selected), true);
  }
});

test('identical woman occurrences are interchangeable but one tile cannot be reused', () => {
  const card = pilots[3];
  const ids = [...card.correct_option_ids];
  [ids[1], ids[5]] = [ids[5], ids[1]];
  assert.equal(api.sentenceIsCorrect(card, ids), true);
  ids[5] = ids[1];
  assert.equal(api.sentenceIsCorrect(card, ids), false);
});

test('phone, tablet, landscape and accessibility sizes retain target and label floors', () => {
  for (const [w, h] of [[320, 568], [360, 800], [412, 915], [740, 360], [800, 1280], [1280, 800], [1440, 900]]) {
    for (const scale of [1, 1.3, 1.5, 2]) {
      for (const count of [4, 6, 8]) {
        const layout = api.sentenceLayout(w - 56, h - 230, scale, count);
        assert.ok(layout.tileWidth >= 48);
        assert.ok(layout.tileHeight >= 48);
        assert.ok(layout.tileWidth >= 5 * layout.textSize * 0.62 * scale + 20);
        assert.ok(layout.columns >= 1 && layout.rows * layout.columns >= count);
        assert.ok(layout.imageHeight >= 0);
      }
    }
  }
});

test('a placed word travels from the bank into its slot', () => {
  const bank = { x: 40, y: 600, width: 90, height: 50 };
  const slot = { x: 150, y: 200, width: 120, height: 56 };
  const path = api.tileFlightPath(bank, slot, { x: 10, y: 20 });

  // The flying view is anchored on the destination, in root-relative space.
  assert.equal(path.left, 140);
  assert.equal(path.top, 180);
  assert.equal(path.width, 120);
  assert.equal(path.height, 56);
  // It starts over the bank tile at the bank tile's size, then settles to 0/1.
  assert.equal(path.translateX, (40 + 45) - (150 + 60));
  assert.equal(path.translateY, (600 + 25) - (200 + 28));
  assert.ok(Math.abs(path.scaleX - 90 / 120) < 1e-9);
  assert.ok(Math.abs(path.scaleY - 50 / 56) < 1e-9);
});

test('an unmeasurable or already-arrived placement skips the flight', () => {
  const slot = { x: 150, y: 200, width: 120, height: 56 };
  assert.equal(api.tileFlightPath(null, slot), null);
  assert.equal(api.tileFlightPath(undefined, slot), null);
  assert.equal(api.tileFlightPath(slot, null), null);
  assert.equal(api.tileFlightPath({ x: 0, y: 0, width: 0, height: 10 }, slot), null);
  assert.equal(api.tileFlightPath({ x: NaN, y: 0, width: 10, height: 10 }, slot), null);
  // Same centre: nothing to animate.
  assert.equal(api.tileFlightPath({ x: 155, y: 202, width: 110, height: 52 }, slot), null);
});

test('the flight is decorative: placement commits first and reduced motion skips it', () => {
  const component = fs.readFileSync(path.join(__dirname, '../src/components/SentenceConstruction.tsx'), 'utf8');
  assert.match(
    component,
    /onChange\(next\);\s+if \(!reduceMotion\) startFlight\(id, target\);/,
    'The answer must be committed and validated before the decorative flight starts.',
  );
  assert.match(component, /useReducedMotion/);
  assert.match(component, /pointerEvents="none"/, 'The flying word must not intercept touches.');
  assert.match(component, /useNativeDriver: true/);
  assert.match(
    component,
    /flightAnimation\.current\?\.stop\(\)/,
    'A resize, rotation or new card must end the flight instead of replaying it.',
  );
});
