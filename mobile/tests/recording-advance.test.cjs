const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the actual playback, grading and watchdog callbacks with a virtual
// player/clock. This exercises success -> replay -> next card, including races.
const source = fs.readFileSync(path.join(__dirname, '../src/components/PronunciationPractice.tsx'), 'utf8');
const tree = ts.createSourceFile('practice.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = {};
let watchdog;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['playAttemptRecording', 'completeGradedAttempt'].includes(node.name.getText(tree))) {
    callbacks[node.name.getText(tree)] = node.initializer.arguments[0].getText(tree);
  }
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
      && node.arguments[0]?.getText(tree).includes("'pronunciation_success_advance_timeout'")) {
    watchdog = node.arguments[0].getText(tree);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
assert.ok(watchdog && callbacks.playAttemptRecording && callbacks.completeGradedAttempt);
const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const helper = {};
new Function('exports', compile(fs.readFileSync(path.join(__dirname, '../src/recordingPlayback.ts'), 'utf8')))(helper);

async function scenario(stallAt) {
  let now = 0, started = null, passedAt = null, passes = 0, released = false, phase = 'checking';
  const timers = new Map();
  let nextId = 0;
  const schedule = (fn, delay, repeat = false) => {
    const id = ++nextId;
    timers.set(id, { fn, at: now + delay, delay, repeat });
    return id;
  };
  const player = {
    isLoaded: true, duration: 25,
    play() { started = now; }, pause() {}, release() { released = true; },
    get currentStatus() {
      const position = started === null ? 0 : Math.min(25, (now - started) / 1000, stallAt ?? Infinity);
      return { currentTime: position, duration: 25, didJustFinish: position === 25 };
    },
  };
  const refs = {
    attemptPlaybackProgress: { current: { position: 0, progressedAt: 0 } },
    gradedAdvanceHandled: { current: false },
    activeAttemptPlaybackRef: { current: null },
    attemptRef: { current: 0 },
  };
  const env = {
    ...refs, Date: { now: () => now },
    setTimeout: (fn, ms) => schedule(fn, ms),
    setInterval: (fn, ms) => schedule(fn, ms, true),
    clearInterval: id => timers.delete(id),
    isCurrentRun: () => passes === 0,
    withTimeout: promise => promise,
    setAudioModeAsync: async () => {},
    createAudioPlayer: () => player,
    recordingPlaybackState: helper.recordingPlaybackState,
    addDiagnosticBreadcrumb: () => {}, captureDiagnosticError: () => {},
    setPhase: value => { phase = value; }, setMessage: () => {},
    setReviewingRecording: () => {}, setAttempt: () => {}, setContinueAfterCoaching: () => {},
    onPassed: () => { passes++; passedAt = now; }, playModel: async () => {},
    passed: true, continueAfterCoaching: false,
  };
  for (const name of ['RECORDING_REVEAL_MS', 'RECORDING_LOAD_TIMEOUT_MS', 'GRADING_REVIEW_MS', 'SUCCESS_ADVANCE_WATCHDOG_MS', 'MAX_AUTOMATIC_ATTEMPTS']) {
    env[name] = Number(source.match(new RegExp(`const ${name} = ([0-9_]+);`))[1].replaceAll('_', ''));
  }
  const compiled = compile(`const playAttemptRecording = ${callbacks.playAttemptRecording};
    const completeGradedAttempt = ${callbacks.completeGradedAttempt};
    return { completeGradedAttempt, watchdog: ${watchdog} };`);
  // phase is read when the effect runs after the successful-grade render.
  const api = new Function(...Object.keys(env), 'phase', compiled)(...Object.values(env), 'success');
  const done = api.completeGradedAttempt(true, 'Good!', 'fixture.mp3', 1);
  assert.equal(phase, 'success');
  const cleanup = api.watchdog();
  for (let step = 0; step < 700 && !passes; step++) {
    now += 50;
    for (const [id, timer] of [...timers]) if (timer.at <= now) {
      if (timer.repeat) timer.at += timer.delay;
      else timers.delete(id);
      timer.fn();
    }
    for (let flush = 0; flush < 8; flush++) await Promise.resolve();
    if (stallAt === undefined && (started === null || now - started < 25000)) {
      assert.equal(passes, 0, `Recording cut off at ${now}ms`);
    }
  }
  await done;
  cleanup();
  assert.equal(passes, 1, 'The grade advances exactly once.');
  assert.equal(released, true, 'The player is released after completion or recovery.');
  if (stallAt === undefined) assert.ok(passedAt - started >= 25000);
  else assert.ok(passedAt - started <= (stallAt + 8.3) * 1000, 'A stalled player still recovers.');
}

(async () => {
  await scenario();
  await scenario(2);
  console.log('Actual success callbacks wait for the full recording and recover once after stalled playback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
