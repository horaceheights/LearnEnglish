const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relativePath, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)(
    name => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected dependency: ${name}`); },
    module, module.exports, ...Object.values(globals),
  );
  return module.exports;
}

const download = loadSource('../src/audioDownload.ts');
const response = (bytes = [1, 2, 3]) => ({ ok: true, status: 200, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

// Deterministic hooks/effects and clock: execute the production hook, not a rewritten policy.
function readinessHarness() {
  const cache = new Set();
  const downloads = new Map();
  const calls = [];
  const timers = new Map();
  let now = 0, timerId = 0, cursor = 0, needsRender = true;
  let props = { key: 'card-1', assets: [{ id: 'a' }], active: true, offline: false };
  let value;
  const slots = [];
  let effects = [];
  const equal = (a, b) => a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const react = {
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, update => {
        const next = typeof update === 'function' ? update(slots[index].value) : update;
        if (!Object.is(slots[index].value, next)) { slots[index].value = next; needsRender = true; }
      }];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!equal(slots[index]?.deps, deps)) slots[index] = { deps, value: callback };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!equal(slots[index]?.deps, deps)) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const hook = loadSource('../src/hooks/useLessonAudioReadiness.ts', {
    react,
    '../audioDownload': download,
    '../diagnostics': { addDiagnosticBreadcrumb() {} },
    '../lessonAudioCache': {
      cachedCourseAudioAssetSource: id => cache.has(id) ? `file://${id}` : null,
      cacheCourseAudioAsset: async asset => {
        calls.push(asset.id);
        if (cache.has(asset.id)) return `file://${asset.id}`;
        const result = await downloads.get(asset.id)?.promise;
        if (result) cache.add(asset.id);
        return result;
      },
    },
  }, {
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
  }).useLessonAudioReadiness;
  async function flush() {
    for (let i = 0; i < 30; i++) {
      if (needsRender) {
        needsRender = false; cursor = 0; effects = [];
        value = hook(props.key, props.assets, props.active, props.offline);
        effects.forEach(effect => effect());
      }
      await Promise.resolve();
    }
    assert.equal(needsRender, false, 'The hook must settle, without an effect loop.');
    return value;
  }
  return {
    cache, calls, downloads, flush,
    get value() { return value; },
    async update(changes) { props = { ...props, ...changes }; needsRender = true; return flush(); },
    async tick(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
      return flush();
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    get timerCount() { return timers.size; },
  };
}

(async () => {
  assert.deepEqual([...await download.downloadAudioBytes('clip', async () => response())], [1, 2, 3]);
  await assert.rejects(download.downloadAudioBytes('clip', async () => response([])), /empty/);
  await assert.rejects(download.downloadAudioBytes('clip', async () => ({ ok: false, status: 503 })), /HTTP 503/);
  for (const stalledAt of ['headers', 'body']) {
    let signal;
    const late = deferred();
    await assert.rejects(download.downloadAudioBytes('clip', async (_url, options) => {
      signal = options.signal;
      return stalledAt === 'headers' ? late.promise : { ...response(), arrayBuffer: () => late.promise };
    }, 10), /timed out/);
    assert.equal(signal.aborted, true, `${stalledAt}: cancel the native transfer, not just the UI timer.`);
    late.resolve(stalledAt === 'headers' ? response() : new ArrayBuffer(4));
  }
  let active = 0, peak = 0;
  assert.equal(await download.prepareAudioAssets(Array.from({ length: 13 }, (_, i) => i), async i => {
    peak = Math.max(peak, ++active); await Promise.resolve(); active--; return i !== 8;
  }), false);
  assert.equal(peak, 4);
  assert.equal(await download.prepareAudioAssets([1], async () => { throw new Error('offline'); }), false);

  // Exercise the actual cache: failed bytes never become local playable files;
  // in-flight deduplication is released, so a later retry is not permanently poisoned.
  const files = new Map();
  let requestCount = 0;
  let fetchResult = deferred();
  class Directory { constructor() { this.uri = 'cache'; } create() {} }
  class File {
    constructor(directory, name) { this.uri = `${directory.uri}/${name}`; }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.length ?? 0; }
    write(bytes) { files.set(this.uri, bytes); }
    delete() { files.delete(this.uri); }
    async move(destination) { files.set(destination.uri, files.get(this.uri)); files.delete(this.uri); this.uri = destination.uri; }
  }
  const cache = loadSource('../src/lessonAudioCache.ts', {
    'expo-file-system': { File, Directory, Paths: { cache: 'cache' } },
    'expo/fetch': { fetch: async () => { requestCount++; return fetchResult.promise; } },
    './config': { courseAudioAssetUrl: id => `https://audio/${id}` },
    './audioDownload': { downloadAudioBytes: (url, fetcher) => download.downloadAudioBytes(url, fetcher, 10) },
    './diagnostics': { addDiagnosticBreadcrumb() {} },
  });
  const first = cache.cacheCourseAudioAsset({ id: 'clip' });
  const duplicate = cache.cacheCourseAudioAsset({ id: 'clip' });
  assert.equal(requestCount, 1);
  assert.deepEqual(await Promise.all([first, duplicate]), [null, null]);
  assert.equal(cache.cachedCourseAudioAssetSource('clip'), null);
  assert.equal(files.size, 0);
  fetchResult = deferred(); fetchResult.resolve(response());
  assert.match(await cache.cacheCourseAudioAsset({ id: 'clip' }), /clip\.mp3$/);
  assert.equal(requestCount, 2);
  await cache.cacheCourseAudioAsset({ id: 'clip' });
  assert.equal(requestCount, 2, 'A cached clip needs no network.');
  assert.equal([...files.keys()].some(key => key.endsWith('.download')), false);

  let h = readinessHarness();
  h.cache.add('a');
  assert.equal((await h.update({ offline: true })).ready, true);
  assert.equal(h.calls.length, 0, 'Cached audio is ready even with no connection.');
  h.unmount();

  h = readinessHarness();
  assert.equal((await h.update({ offline: true })).waiting, true);
  assert.equal(h.value.ready, false);
  assert.equal(h.calls.length, 0);
  await h.tick(60000);
  assert.equal(h.calls.length, 0, 'Do not loop network requests while offline.');
  h.downloads.set('a', deferred());
  await h.update({ offline: false });
  assert.equal(h.calls.length, 1, 'Reconnection retries without a new card.');
  h.downloads.get('a').resolve('file://a');
  assert.equal((await h.flush()).ready, true);
  h.unmount();

  h = readinessHarness();
  h.downloads.set('a', deferred());
  await h.flush();
  assert.equal(h.value.busy, true);
  assert.equal(h.value.ready, false);
  await h.tick(4000);
  assert.equal(h.value.waiting, true, 'Weak signal shows the pause even when reported online.');
  h.downloads.get('a').resolve(null);
  await h.flush();
  assert.equal(h.value.busy, false, 'Retry becomes available after the bounded transfer fails.');
  h.downloads.set('a', deferred());
  await h.tick(15000);
  assert.equal(h.calls.length, 2, 'Automatically retry while foregrounded.');
  h.downloads.get('a').resolve('file://a');
  assert.equal((await h.flush()).ready, true);
  h.unmount();

  h = readinessHarness();
  await h.update({ offline: true });
  h.downloads.set('a', deferred());
  h.value.retry(); await h.flush();
  assert.equal(h.calls.length, 1, 'Manual retry may probe a stale offline signal.');
  h.downloads.get('a').resolve('file://a');
  assert.equal((await h.flush()).ready, true);
  h.unmount();

  h = readinessHarness();
  h.downloads.set('a', deferred());
  await h.flush();
  h.downloads.set('b', deferred());
  await h.update({ key: 'card-2', assets: [{ id: 'b' }] });
  h.downloads.get('a').resolve('file://a');
  assert.equal((await h.flush()).ready, false, 'A late old-card download cannot unlock the current card.');
  await h.update({ active: false });
  const requestsBeforeBackground = h.calls.length;
  await h.tick(60000);
  assert.equal(h.calls.length, requestsBeforeBackground);
  h.unmount();
  assert.equal(h.timerCount, 0, 'Exit clears the retry and slow-connection timers.');

  const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
  assert.match(screen, /const advance = useCallback\(\(\) => \{\s*if \(!lesson \|\| !cardAudioReadyRef\.current\) return;/);
  assert.match(screen, /const completeAutomaticSingleCard = useCallback[\s\S]*?!cardAudioReadyRef\.current/);
  assert.match(screen, /isAppActive=\{isAppActive && cardAudio\.ready\}/);
  assert.match(screen, /<AudioConnectionNotice[\s\S]*?onRetry=\{cardAudio\.retry\}[\s\S]*?onExit=\{onExit\}/);
  assert.doesNotMatch(screen, /single_card_completed_without_audio/);
  const hookSource = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useLessonAudioReadiness.ts'), 'utf8');
  assert.doesNotMatch(hookSource, /setCardIndex|setResult|registerCardCompletion|scorePronunciation/);
  console.log('Audio recovery: bounded body downloads, cache retry, offline/weak-signal readiness, reconnection, background, stale-card and progression guards passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
