const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Exercise both production hooks with a deterministic clock and native/browser animations.
function harness(platform) {
  const slots = [], events = [], animations = [], timers = new Map(), listeners = new Map();
  let cursor = 0, pending = [], dirty = true, now = 0, timerId = 0, value;
  const props = { active: true, reduceMotion: false, width: 390,
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
  const window = { setTimeout: setTimer, clearTimeout: clearTimer, matchMedia: () => query };
  class Value {
    constructor(initial) { this.value = initial; }
    setValue(next) { this.value = next; }
    stopAnimation() {}
    interpolate(config) { return { value: this, ...config }; }
  }
  const native = { Animated: { Value, timing: (turn, config) => ({ start: () => animations.push({ turn, config }) }) }, Easing: { out: fn => fn, cubic: 'cubic' } };
  const sourcePath = platform === 'mobile' ? '../src/hooks/useLessonPageTurn.ts' : '../../frontend/lib/useLessonPageTurn.js';
  const source = fs.readFileSync(path.resolve(__dirname, sourcePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'window', 'document', js)(
    name => name === 'react' ? react : native, module, module.exports, setTimer, clearTimer, window, document,
  );
  const hook = module.exports.useLessonPageTurn || module.exports.default;
  function render() {
    while (dirty) {
      dirty = false; cursor = 0; pending = []; value = hook(props); pending.forEach(fn => fn());
    }
    if (platform === 'web') value.pageRef.current = { animate: (frames, config) => {
      const animation = { frames, config, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation); return animation;
    } };
    return value;
  }
  render();
  return {
    get value() { return render(); }, events, animations, timers,
    start(direction) { const accepted = value.startPageTurn(direction); render(); return accepted; },
    tick(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } render(); },
    update(changes) { Object.assign(props, changes); dirty = true; render(); },
    reduce() { query.matches = true; if (platform === 'web') listeners.get('motion')(); else this.update({ reduceMotion: true }); render(); },
    hide() { document.hidden = true; if (platform === 'web') listeners.get('visibilitychange')(); else this.update({ active: false }); render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const platform of ['mobile', 'web']) {
  test(`${platform}: one bounded turn, no initial/re-render sound or double advance`, () => {
    const h = harness(platform);
    assert.deepEqual(h.events, []);
    assert.equal(h.start(1), true);
    assert.equal(h.value.isPageTurning, true);
    assert.equal(h.start(1), false);
    h.update({ width: 844 }); // Rotation preserves the current turn, never replays it.
    assert.deepEqual(h.events, ['sound']);
    h.tick(519);
    assert.equal(h.value.isPageTurning, true);
    h.tick(1);
    assert.equal(h.value.isPageTurning, false);
    assert.equal(h.value.busy.current, false);
    assert.deepEqual(h.events, ['sound', 'stop']);
    assert.equal(h.timers.size, 0);
    assert.equal(h.start(-1), true);
    h.tick(520);
    assert.deepEqual(h.events, ['sound', 'stop', 'sound', 'stop']);
  });
  test(`${platform}: reduced stimulation skips effects without blocking navigation`, () => {
    const h = harness(platform); h.reduce();
    assert.equal(h.start(1), true);
    assert.equal(h.value.isPageTurning, false);
    assert.deepEqual(h.events, []);
    assert.equal(h.animations.length, 0);
    assert.equal(h.timers.size, 0);
  });
  for (const interrupt of ['reduce', 'hide', 'unmount']) {
    test(`${platform}: ${interrupt} cancels decorative playback and pending release`, () => {
      const h = harness(platform); h.start(); h[interrupt](); h.tick(1000);
      assert.deepEqual(h.events, ['sound', 'stop']);
      assert.equal(h.timers.size, 0);
    });
  }
}

test('every native prompt and microphone waits for the turn; only actual changes start it', () => {
  const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
  assert.match(screen, /onFinish: stopMissionSound/);
  assert.match(screen, /!usesMissionGameSurface\s+\|\| isPageTurning/);
  assert.match(screen, /isCompletedSectionPicker\s+\|\| isPageTurning/);
  assert.match(screen, /isAppActive=\{isAppActive && cardAudio.ready && !isPageTurning\}/);
  assert.match(screen, /if \(!startPageTurn\(1\)\) return;\s+setCardIndex/);
  assert.match(screen, /if \(!startPageTurn\(direction\)\) return;\s+setCardIndex/);
  assert.match(screen, /startIndex !== cardIndex && !startPageTurn/);
  assert.equal((screen.match(/playMissionSound\('page-turn'\)/g) || []).length, 1);
});
