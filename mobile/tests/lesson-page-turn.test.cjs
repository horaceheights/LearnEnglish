const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const geometry = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/pageCurlGeometry.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(geometry.exports);
const { curlStrip, CURL_STRIPS } = geometry.exports;
test('the sheet starts flat, bends nonuniformly, and leaves the viewport in both directions', () => {
  for (const width of [320, 390, 844, 1024]) {
    for (let i = 0; i < CURL_STRIPS; i++) {
      const flat = curlStrip(i, 0, width);
      assert.ok(Math.abs(flat.x - (i + 0.5) * width / CURL_STRIPS) < 0.001);
      assert.ok(Math.abs(flat.scaleX - 1) < 0.001);
      assert.equal(flat.scaleY, 1);
      for (let p = 0; p <= 1; p += 0.025) {
        const forward = curlStrip(i, p, width), backward = curlStrip(i, p, width, -1);
        assert.ok(Object.values(forward).every(Number.isFinite));
        assert.ok(Math.abs(forward.x + backward.x - width) < 0.001);
      }
      assert.ok(curlStrip(i, 1, width).x < 0);
      assert.ok(curlStrip(i, 1, width, -1).x > width);
    }
    const middle = Array.from({ length: CURL_STRIPS }, (_, i) => curlStrip(i, 0.4, width));
    assert.ok(middle.some(s => Math.abs(s.scaleX - 1) < 0.001 && s.scaleY === 1));
    assert.ok(middle.some(s => s.scaleX > 0 && s.scaleX < 0.9 && s.scaleY < 1));
    assert.ok(middle.some(s => s.back === 1 && s.scaleX < 0));
  }
});

// Exercise both production hooks with a deterministic clock and native/browser animations.
function harness(platform) {
  const slots = [], events = [], animations = [], timers = new Map(), listeners = new Map();
  let cursor = 0, pending = [], dirty = true, now = 0, timerId = 0, value, resolveCapture, rejectCapture;
  const captures = [], released = [];
  const props = { active: true, reduceMotion: false, viewportWidth: 390, viewportHeight: 844,
    onStart: () => events.push('sound'), onFinish: () => events.push('stop') };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: initial };
      return [slots[i].value, update => {
        const next = typeof update === 'function' ? update(slots[i].value) : update;
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
      }];
    },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    },
  };
  const setTimer = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; };
  const clearTimer = id => timers.delete(id);
  const document = { hidden: false, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const query = { matches: false, addEventListener: (key, fn) => listeners.set('motion', fn), removeEventListener: () => listeners.delete('motion') };
  const window = { setTimeout: setTimer, clearTimeout: clearTimer, matchMedia: () => query,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  class Value {
    constructor(initial) { this.value = initial; }
    setValue(next) { this.value = next; }
    stopAnimation() {}
    interpolate(config) { return { value: this, ...config }; }
  }
  const native = { Animated: { Value, timing: (turn, config) => ({ start: () => animations.push({ turn, config }) }) }, Easing: { inOut: fn => fn, cubic: 'cubic' } };
  const capture = () => new Promise((resolve, reject) => { captures.push('capture'); resolveCapture = resolve; rejectCapture = reject; });
  const modules = { react, 'react-native': native,
    'react-native-view-shot': { captureRef: capture, releaseCapture: uri => released.push(uri) },
    '../pageCurlGeometry': { PAGE_TURN_MS: 720 }, '../../mobile/src/pageCurlGeometry': { PAGE_TURN_MS: 720 },
    './pageCurl': { capturePage: capture, createPageCurl: () => { animations.push('curl'); return { draw() {}, remove: () => released.push('canvas') }; } } };
  const sourcePath = platform === 'mobile' ? '../src/hooks/useLessonPageTurn.ts' : '../../frontend/lib/useLessonPageTurn.js';
  const source = fs.readFileSync(path.resolve(__dirname, sourcePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'window', 'document', js)(
    name => modules[name], module, module.exports, setTimer, clearTimer, window, document,
  );
  const hook = module.exports.useLessonPageTurn || module.exports.default;
  function render() {
    while (dirty) {
      dirty = false; cursor = 0; pending = []; value = hook(props); pending.forEach(fn => fn());
    }
    value.pageRef.current = {};
    return value;
  }
  render();
  if (platform === 'mobile') value.onPageLayout({ nativeEvent: { layout: { width: 390, height: 640 } } });
  return {
    get value() { return render(); }, events, animations, timers, captures, released,
    start(direction = 1) { const accepted = value.startPageTurn(direction, () => events.push('navigate')); render(); return accepted; },
    async ready() { resolveCapture('snapshot'); await Promise.resolve(); render(); if (platform === 'mobile') value.revealPage(); render(); },
    async fail() { rejectCapture(new Error('Unavailable surface')); await Promise.resolve(); await Promise.resolve(); render(); },
    tick(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } render(); },
    update(changes) { Object.assign(props, changes); dirty = true; render(); },
    reduce() { query.matches = true; if (platform === 'web') listeners.get('motion')(); else this.update({ reduceMotion: true }); render(); },
    hide() { document.hidden = true; if (platform === 'web') listeners.get('visibilitychange')(); else this.update({ active: false }); render(); },
    rotate() { if (platform === 'web') listeners.get('resize')(); else this.update({ viewportWidth: 844, viewportHeight: 390 }); render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const platform of ['mobile', 'web']) {
  test(`${platform}: capture precedes navigation, one bounded turn, no double advance`, async () => {
    const h = harness(platform);
    assert.deepEqual(h.events, []);
    assert.equal(h.start(1), true);
    assert.equal(h.value.isPageTurning, true);
    assert.equal(h.start(1), false);
    assert.deepEqual(h.events, []);
    await h.ready();
    assert.deepEqual(h.events, ['navigate', 'sound']);
    h.tick(719);
    assert.equal(h.value.isPageTurning, true);
    h.tick(1);
    assert.equal(h.value.isPageTurning, false);
    assert.equal(h.value.busy.current, false);
    assert.deepEqual(h.events, ['navigate', 'sound', 'stop']);
    assert.equal(h.timers.size, 0);
    assert.equal(h.start(-1), true);
    await h.ready();
    h.tick(720);
    assert.deepEqual(h.events, ['navigate', 'sound', 'stop', 'navigate', 'sound', 'stop']);
    assert.equal(h.released.length, 2);
  });
  test(`${platform}: reduced stimulation skips effects without blocking navigation`, () => {
    const h = harness(platform); h.reduce();
    assert.equal(h.start(1), true);
    assert.equal(h.value.isPageTurning, false);
    assert.deepEqual(h.events, ['navigate']);
    assert.equal(h.animations.length, 0);
    assert.equal(h.timers.size, 0);
  });
  for (const interrupt of ['reduce', 'hide', 'unmount', 'rotate']) {
    test(`${platform}: ${interrupt} cancels decorative playback and pending release`, async () => {
      const h = harness(platform); h.start(); await h.ready(); h[interrupt](); h.tick(1000);
      assert.deepEqual(h.events, ['navigate', 'sound', 'stop']);
      assert.equal(h.timers.size, 0);
    });
  }
  test(`${platform}: capture rejection still navigates once without a sound`, async () => {
    const h = harness(platform); h.start(); await h.fail();
    assert.deepEqual(h.events, ['stop', 'navigate']);
    assert.equal(h.value.busy.current, false);
  });
  test(`${platform}: late capture cannot replay an expired transition`, async () => {
    const h = harness(platform); h.start(); h.tick(801); await h.ready();
    assert.deepEqual(h.events, ['stop', 'navigate']);
    assert.equal(h.animations.length, 0);
    if (platform === 'mobile') assert.deepEqual(h.released, ['snapshot']);
  });
  test(`${platform}: unmount during capture never navigates a departed screen`, async () => {
    const h = harness(platform); h.start(); h.unmount(); await h.ready();
    assert.deepEqual(h.events, ['stop']);
  });
}

test('every native prompt and microphone waits for the turn; only actual changes start it', () => {
  const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
  assert.match(screen, /onFinish: stopMissionSound/);
  assert.match(screen, /!usesMissionGameSurface\s+\|\| isPageTurning/);
  assert.match(screen, /isCompletedSectionPicker\s+\|\| isPageTurning/);
  assert.match(screen, /pronunciationAutoplayReady=\{!isPageTurning\}/);
  assert.match(screen, /isAppActive=\{isAppActive && cardAudio\.ready\}/);
  const cardView = fs.readFileSync(path.resolve(__dirname, '../src/components/LessonCardView.tsx'), 'utf8');
  const pronunciation = fs.readFileSync(path.resolve(__dirname, '../src/components/PronunciationPractice.tsx'), 'utf8');
  assert.match(cardView, /autoplayReady=\{pronunciationAutoplayReady\}/);
  assert.match(pronunciation, /if \(!autoplayReady\) return undefined;\s+const runId[\s\S]*?playModelEvent\(runId\)/);
  assert.match(pronunciation, /\[autoplayReady, discardNativeRecording, phrase\]/);
  assert.match(screen, /startPageTurn\(1, \(\) => \{\s+setCardIndex/);
  assert.match(screen, /startPageTurn\(direction, \(\) => setCardIndex/);
  assert.match(screen, /startPageTurn\(startIndex > cardIndex \? 1 : -1, navigate\)/);
  assert.equal((screen.match(/playMissionSound\('page-turn'\)/g) || []).length, 1);
});

test('two consecutive Speak cards start only when the page settles, without an interruption', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/PronunciationPractice.tsx'), 'utf8');
  const body = source.match(/useEffect\(\(\) => \{(\s+if \(!autoplayReady\) return undefined;[\s\S]*?)\n  \}, \[autoplayReady, discardNativeRecording, phrase\]\);/)[1];
  const plays = [];
  for (const phrase of ['He is a boy.', 'She is a girl.']) {
    const refs = { runIdRef: { current: 0 }, attemptRef: { current: 0 }, noSpeechRound: { current: 0 }, retryTimer: { current: null }, modelLoadTimer: { current: null }, phraseCompleteTimer: { current: null }, streamingCapture: { current: false } };
    const effect = new Function('autoplayReady', 'setAttempt', 'playModelEvent', 'clearTimeout', 'discardNativeRecording', ...Object.keys(refs), body);
    const run = ready => effect(ready, () => {}, id => plays.push({ phrase, id }), () => {}, () => {}, ...Object.values(refs));
    assert.equal(run(false), undefined);
    assert.equal(refs.runIdRef.current, 0);
    const cleanup = run(true);
    assert.equal(plays.at(-1).phrase, phrase);
    assert.equal(plays.at(-1).id, 1);
    cleanup();
    assert.equal(refs.runIdRef.current, 2, 'Leaving the card invalidates any pending model playback.');
  }
  assert.equal(plays.length, 2);
});
