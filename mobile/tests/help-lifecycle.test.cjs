const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useContextualHelp.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

// Exercise the real shared hook with deterministic effects, storage and time.
function harness(saved = null, delayedRead = null) {
  let now = 0, timerId = 0, cursor = 0, dirty = true, effects = [], value;
  const slots = [], timers = new Map(), writes = [];
  const storage = { getItem: async () => delayedRead ? delayedRead : saved, setItem: async (key, value) => { writes.push([key, value]); saved = value; } };
  let props = { cardKey: 'slide-1', ready: true, storageKey: 'learner', storage };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, update => {
      const next = typeof update === 'function' ? update(slots[i].value) : update;
      if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
    }]; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => {
      slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
    }); },
  };
  const api = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', compiled)(
    id => { assert.equal(id, 'react'); return react; }, api,
    (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; }, id => timers.delete(id));
  function render() { for (let i = 0; dirty; i++) { assert.ok(i < 30); dirty = false; cursor = 0; effects = []; value = api.useContextualHelp(props); effects.forEach(fn => fn()); } }
  async function flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); render(); } }
  render();
  return { writes, get value() { return value; }, flush,
    async set(next) { props = { ...props, ...next }; dirty = true; await flush(); },
    async act(name) { value[name](); await flush(); },
    async tick(ms) { await flush(); const end = now + ms; while (true) {
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
    } now = end; await flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); assert.equal(timers.size, 0); },
  };
}

(async () => {
  const h = harness();
  await h.tick(3999); assert.equal(h.value.mode, null);
  await h.tick(1); assert.equal(h.value.mode, 'help', 'Idle help opens at four seconds.');
  await h.tick(10000); assert.equal(h.value.mode, 'help', 'Help waits for acknowledgement.');
  await h.act('dismiss'); await h.tick(10000); assert.equal(h.value.mode, null, 'Do not nag again on this slide.');
  assert.equal(h.writes.length, 0, 'Entiendo is not a persistent opt-out.');
  await h.set({ cardKey: 'slide-2' }); await h.tick(2500); await h.act('interact');
  await h.tick(3999); assert.equal(h.value.mode, null); await h.tick(1); assert.equal(h.value.mode, 'help');
  await h.act('suppress'); assert.equal(h.value.mode, 'reminder'); assert.deepEqual(h.writes, [['learner', 'seen']]);
  await h.tick(12000); assert.equal(h.value.mode, 'reminder'); await h.act('dismiss');
  await h.set({ cardKey: 'slide-3' }); await h.tick(20000); assert.equal(h.value.mode, null);
  await h.act('open'); assert.equal(h.value.mode, 'help', 'Manual help works after opt-out.'); h.unmount();

  const restored = harness('seen'); await restored.tick(10000); assert.equal(restored.value.mode, null);
  await restored.act('open'); assert.equal(restored.value.mode, 'help'); restored.unmount();
  const held = harness(); await held.tick(3000); await held.act('touchStart'); await held.tick(10000); assert.equal(held.value.mode, null);
  await held.act('touchEnd'); await held.tick(3999); assert.equal(held.value.mode, null); await held.tick(1); assert.equal(held.value.mode, 'help'); held.unmount();
  const paused = harness(); await paused.tick(3000); await paused.set({ ready: false }); await paused.tick(10000); assert.equal(paused.value.mode, null);
  await paused.set({ ready: true }); await paused.tick(3999); assert.equal(paused.value.mode, null); await paused.tick(1); assert.equal(paused.value.mode, 'help');
  await paused.set({ cardKey: 'next' }); assert.equal(paused.value.mode, null); paused.unmount();
  let resolve; const loading = harness(null, new Promise(done => { resolve = done; }));
  await loading.act('open'); await loading.act('suppress'); resolve(null); await loading.flush(); await loading.act('dismiss');
  await loading.set({ cardKey: 'next' }); await loading.tick(10000); assert.equal(loading.value.mode, null, 'A late preference read cannot undo No mostrar.'); loading.unmount();

  assert.deepEqual(fs.readFileSync(path.resolve(__dirname, '../assets/mascots/serious/listening-frames-normalized/listening-06.png')),
    fs.readFileSync(path.resolve(__dirname, '../../frontend/public/lesson-help-avatar.png')),
    'The web deployment packages the exact existing mobile avatar; mobile/assets is excluded by Vercel.');

  const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
  const web = fs.readFileSync(path.resolve(__dirname, '../../frontend/components/LessonPlayer.js'), 'utf8');
  for (const text of [screen, web]) {
    assert.match(text, /useContextualHelp\(\{/);
    assert.match(text, /lessonHelpText\(currentCard,/);
    assert.match(text, /on(?:Press|Click)=\{help.open\}/);
    assert.doesNotMatch(text, /HELP_DISPLAY_MS|showSentenceCoachmark|showConstructionCoachmark/);
  }
  assert.match(screen, /!sectionBriefing.*!missionChapterBreak/);
  assert.match(screen, /!courseAudioPlaybackStatus.playing && !missionCuePlayerStatus.playing/);
  assert.match(screen, /if \(helpVisibleRef.current\) \{\s*helpAdvancePendingRef.current = helpCardKey;/);
  assert.match(screen, /const handlePromptPress = useCallback\([\s\S]*openSentenceTranslation\(\)/);
  for (const file of ['../src/components/SentenceHelpOverlay.tsx', '../../frontend/components/LessonHelpPopup.js']) {
    const popup = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    assert.match(popup, /Si necesitas ayuda en el futuro, solo toca el botón/);
    assert.match(popup, /Entiendo/); assert.match(popup, /No mostrar/); assert.match(popup, />\?<\//);
    assert.doesNotMatch(popup, /LA FRASE|Ayuda y opciones/);
  }
  console.log('Contextual avatar help: idle timing, activity, suppression, persistence, manual access and both clients passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
