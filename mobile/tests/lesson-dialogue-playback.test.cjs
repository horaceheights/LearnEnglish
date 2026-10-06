const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Execute the real screen callback with controlled native/network boundaries.
const source = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
const tree = ts.createSourceFile('LessonScreen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'playAudioSequence') {
    callback = node.initializer.arguments[0].getText(tree);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
assert.ok(callback);
const javascript = ts.transpileModule(`const callback = ${callback};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const controllerSource = fs.readFileSync(path.resolve(__dirname, '../src/lessonDialoguePlaylist.ts'), 'utf8');
const controllerModule = { exports: {} };
new Function('exports', ts.transpileModule(controllerSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(controllerModule.exports);
const { createDialoguePlaylistController } = controllerModule.exports;
const flush = () => new Promise(resolve => setImmediate(resolve));
const pending = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(overrides = {}) {
  const played = [], images = [], errors = [], statuses = [];
  const live = new Set();
  let allocations = 0;
  function playlist() {
    allocations += 1;
    const listeners = new Set();
    // Expo prepares its empty ExoPlayer during construction. Native errors
    // transition it to IDLE; clear/add/play alone cannot leave that state.
    const native = {
      id: `playlist-${allocations}`, state: 'ended', sources: [], currentIndex: 0, releases: 0,
      get currentStatus() {
        return { id: this.id, currentIndex: this.currentIndex, trackCount: this.sources.length,
          playing: this.state === 'ready', isLoaded: this.state === 'ready', didJustFinish: false };
      },
      emit(extra = {}) { for (const listener of [...listeners]) listener({ ...this.currentStatus, ...extra }); },
      addListener(event, listener) {
        assert.equal(event, 'playlistStatusUpdate');
        this.lastListener = listener;
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
      pause() { if (this.state === 'ready') this.state = 'paused'; },
      clear() {
        this.sources = [];
        this.currentIndex = 0;
        if (this.state !== 'idle') this.state = 'ended';
        this.emit();
      },
      add(source) {
        assert.equal(typeof source.uri, 'string', 'Native add requires a resolved URI object.');
        this.sources.push(source);
        if (this.state === 'ended') this.state = 'buffering';
        this.emit();
      },
      play() {
        assert.ok(listeners.size, 'Observe the native playlist before it starts playing.');
        if (this.state === 'idle') return;
        this.state = 'ready';
        played.push(this.sources.map(source => source.uri));
        this.emit();
      },
      finish() { this.state = 'ended'; this.currentIndex = this.sources.length - 1; this.emit({ didJustFinish: true }); },
      fail() {
        this.state = 'idle';
        this.emit({ error: { message: 'Native decoder failed', code: 3001 } });
        this.emit(); // Later native updates omit error; recovery must retain it.
      },
      release() {
        assert.equal(listeners.size, 0, 'Detach status listeners before releasing native resources.');
        this.releases += 1;
        live.delete(this);
      },
    };
    live.add(native);
    return native;
  }
  const nativePlaylist = playlist();
  const playlistRef = { current: nativePlaylist };
  const controller = createDialoguePlaylistController(nativePlaylist, playlist, status => statuses.push(status));
  const refs = { current: 0 };
  const globals = {
    isAppActive: true, isOffline: false,
    AppState: { currentState: 'active' }, cardAudioReadyRef: { current: true },
    pageTurnBusy: { current: false }, stopMissionSound() {},
    lessonAudioAssetSource: asset => `file:///cache/${asset.id}.mp3`,
    isRemoteAudioSource: source => source.startsWith('https:'),
    audioPlaybackRequestRef: refs, audioPlayerActiveRef: { current: true },
    ensureAudioPreloaded: async () => true,
    ensureImagePreloaded: () => new Promise(() => {}),
    setAudioModeAsync: async () => {},
    audioPlayerRef: { current: { pause() {} } }, audioPlaylistRef: playlistRef,
    audioPlaylistControllerRef: { current: controller },
    setActiveAudioSequence() {}, setActiveTurnImageUrl: image => images.push(image),
    addDiagnosticBreadcrumb() {}, captureDiagnosticError: error => errors.push(error),
    ...overrides,
  };
  const play = new Function(...Object.keys(globals), `${javascript}; return callback;`)(...Object.values(globals));
  return { play, played, images, errors, refs, statuses, controller, native: () => playlistRef.current,
    allocations: () => allocations, live: () => live.size };
}
const course = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/generated/a1-course.json'), 'utf8'));
const lesson = course.find(item => item.id === 'lesson-4-what-time-is-it');
const dialogues = lesson.cards.filter(card => card.stage === 'Listen' && card.audio_turns?.length)
  .map(card => card.audio_turns.map((turn, index) => ({
    turn, asset: card.audio_assets.find(asset => asset.purpose === `prompt-turn-${index + 1}`),
  })));
assert.equal(dialogues.length, 5);

test('all five time dialogues play their exact ordered clips while images are stalled', async () => {
  const h = harness();
  for (const sequence of dialogues) {
    h.play(sequence);
    await flush();
    assert.deepEqual(h.played.at(-1), sequence.map(({ asset }) => `file:///cache/${asset.id}.mp3`));
    assert.equal(h.images.at(-1), sequence[0].turn.image_url);
  }
});

test('replay restarts both turns without accumulating native playlists', async () => {
  const h = harness({ ensureImagePreloaded: async () => {} });
  for (let repeat = 0; repeat < 50; repeat += 1) {
    h.play(dialogues[3]);
    await flush();
    h.native().finish();
  }
  assert.equal(h.played.length, 50);
  assert.equal(h.allocations(), 1);
  assert.ok(h.played.every(sources => sources.length === 2));
  assert.equal(h.live(), 1);
});

for (const next of ['replay', 'next dialogue']) {
  test(`an Android native error recovers on ${next} with an observed prepared replacement`, async () => {
    const h = harness();
    h.play(dialogues[0]);
    await flush();
    const failed = h.native();
    failed.fail();
    assert.equal(failed.state, 'idle');
    assert.equal(h.statuses.at(-1).error.message, 'Native decoder failed');
    const sequence = dialogues[next === 'replay' ? 0 : 1];
    h.play(sequence);
    await flush();
    assert.notEqual(h.native(), failed);
    assert.equal(h.native().state, 'ready');
    assert.deepEqual(h.played.at(-1), sequence.map(({ asset }) => `file:///cache/${asset.id}.mp3`));
    assert.equal(h.allocations(), 2);
    assert.equal(failed.releases, 1);
    assert.equal(h.live(), 1);
    assert.equal(h.statuses.at(-1).error, null);
    assert.equal(h.statuses.at(-1).playing, true);
    assert.equal(h.errors.length, 0);
  });
}

test('obsolete native errors cannot poison a replacement and cleanup releases each owner once', async () => {
  const h = harness();
  h.native().fail();
  const failed = h.native();
  const queuedListener = failed.lastListener;
  h.play(dialogues[0]);
  await flush();
  queuedListener({ ...failed.currentStatus, error: { message: 'Obsolete queued error' } });
  assert.equal(h.statuses.at(-1).error, null);
  h.play(dialogues[1]);
  await flush();
  assert.equal(h.allocations(), 2);
  const current = h.native();
  h.controller.stopObserving();
  h.controller.release();
  h.controller.release();
  assert.equal(current.releases, 1);
  assert.equal(failed.releases, 1);
  assert.equal(h.live(), 0);
});

test('navigation cancels a dialogue still preparing audio', async () => {
  const audio = pending();
  const h = harness({ ensureAudioPreloaded: () => audio.promise });
  h.play(dialogues[3]);
  h.refs.current += 1;
  audio.resolve(true);
  await flush();
  assert.equal(h.played.length, 0);
});

test('navigation during audio-mode preparation does not allocate a replacement or start playback', async () => {
  const mode = pending();
  const h = harness({ setAudioModeAsync: () => mode.promise });
  h.native().fail();
  h.play(dialogues[0]);
  await flush();
  h.refs.current += 1;
  mode.resolve();
  await flush();
  assert.equal(h.played.length, 0);
  assert.equal(h.allocations(), 1);
});

test('unavailable audio is never marked as started', async () => {
  const h = harness({ ensureAudioPreloaded: async () => false });
  h.play(dialogues[3]);
  await flush();
  assert.equal(h.played.length, 0);
});
