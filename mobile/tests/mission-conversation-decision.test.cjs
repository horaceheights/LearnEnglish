const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function loader(overrides = {}) {
  const modules = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (modules.has(file)) return modules.get(file);
    const module = { exports: {} };
    modules.set(file, module.exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const req = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.endsWith('TutorButton')) return { TutorButton: 'TutorButton' };
      if (id.endsWith('OptionMediaImage')) return { OptionMediaImage: 'Image' };
      if (id.startsWith('@expo/') || id === 'next/image') return 'Image';
      let next = path.resolve(path.dirname(file), id);
      if (!path.extname(next)) next += ['.ts', '.tsx', '.js'].find(extension => fs.existsSync(next + extension));
      return load(next);
    };
    new Function('require', 'exports', 'module', code)(req, module.exports, module);
    modules.set(file, module.exports);
    return module.exports;
  }
  return load;
}
const { createConversationDecision, createDecisionPlaybackGate, playDecisionTurns } = loader()('mobile/src/missionConversationDecision.ts');
const options = [{ id: 'frequency', label: 'How often do you study?' }, { id: 'time', label: 'What time do you study?' }];
const card = { slide_id: 'shared-decision-example', stage: 'Listen', activity_type: 'a2t', prompt: 'I study at seven.',
  answer_audio_text: 'I usually study.', answer_audio_turns: [{ text: 'I usually study.' }],
  correct_option_id: 'frequency', options, mission_game: { kind: 'conversation-decision', validation: 'single', targets: [], cues: [] } };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function productionCallback(file, name, context) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(found, `Production callback ${name} exists`);
  const code = ts.transpileModule(`exports.run = ${found.getText(ast)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(context), code)(exports, ...Object.values(context));
  return exports.run;
}

test('web speech reports persistent clip failures without claiming audible completion or changing the browser voice', async () => {
  let completed = 0, failed = 0, legacyEnds = 0, rejectPlayback = true;
  const speechSequenceRef = { current: 0 };
  const speak = productionCallback('frontend/components/LessonPlayer.js', 'speakText', {
    window: { speechSynthesis: { cancel() {} } }, speechSequenceRef,
    hasVisualAudioPlaceholder: () => false, sanitizeCourseAudioText: value => value,
    clearSpeechTimers() {}, stopAudioPlayback() {}, getCourseAudioUrl: () => 'approved-clip',
    playAudioUrl: async () => { if (rejectPlayback) throw Error('missing'); },
    speakWithBrowserVoice: () => assert.fail('Decision audio cannot change voices'), console: { info() {} },
  });
  const callbacks = { audioAssetId: 'exact-turn', onAudioCompleted: () => completed++, onPlaybackError: () => failed++, onEnd: () => legacyEnds++ };
  speak('I study at seven.', callbacks); await flush();
  assert.equal(completed, 0); assert.equal(failed, 1); assert.equal(legacyEnds, 1);
  rejectPlayback = false; speak('I study at seven.', callbacks); await flush();
  assert.equal(completed, 1); assert.equal(failed, 1);
});

test('web production decision route ignores legacy completion and consumes the full ordered prompt and response', async () => {
  const calls = [], timers = [];
  const prompt = [{ asset: { id: 'one' }, turn: { text: 'First.', image_url: 'one.png' } }, { asset: { id: 'two' }, turn: { text: 'Second.', image_url: 'two.png' } }];
  const answer = [{ asset: { id: 'answer' }, turn: { text: 'Reply.', image_url: 'reply.png' } }];
  const decisionPlaybackRef = { current: null }, decisionPausedRef = { current: false };
  const play = productionCallback('frontend/components/LessonPlayer.js', 'playDecisionSequence', {
    currentCard: card, cardAudioTurnSequence: (_card, purpose) => purpose === 'prompt' ? prompt : answer,
    decisionPlaybackRef, decisionPausedRef, courseTurnRunRef: { current: 0 }, playDecisionTurns,
    setActiveTurnImageUrl() {}, speakText: (text, options) => calls.push({ text, options }), stopSpeech() {},
    window: { setTimeout: fn => { timers.push(fn); return 0; } }, clearTimeout() {},
  });
  let unlocked = false; const playback = play('prompt').then(result => { unlocked = result; });
  assert.equal(calls.length, 1); calls[0].options.onEnd(); await flush(); assert.equal(unlocked, false);
  calls[0].options.onAudioCompleted(); assert.equal(calls.length, 2); await flush(); assert.equal(unlocked, false);
  calls[1].options.onAudioCompleted(); await playback; assert.equal(unlocked, true);
  const response = play('answer'); assert.equal(calls.length, 2); timers.shift()();
  assert.equal(calls[2].text, 'Reply.'); calls[2].options.onPlaybackError(); assert.equal(await response, false);
  const interrupted = play('prompt'); const late = calls[3].options; decisionPlaybackRef.current.cancel();
  late.onAudioCompleted(); assert.equal(await interrupted, false); assert.equal(calls.length, 4);
});

test('native production decision route passes the full prompt and response and rejects interrupted delayed playback', async () => {
  const calls = [], timers = [];
  const promptTurnSequence = [{ turn: { text: 'First.' } }, { turn: { text: 'Second.' } }], answerTurnSequence = [{ turn: { text: 'Reply.' } }];
  const decisionPlaybackRef = { current: null }, decisionPausedRef = { current: false };
  const play = productionCallback('mobile/src/screens/LessonScreen.tsx', 'playDecisionSequence', {
    promptTurnSequence, answerTurnSequence, decisionPlaybackRef, decisionPausedRef, createDecisionPlaybackGate,
    COURSE_AUDIO_FALLBACK_MS: 12000, missionCuePlayer: { pause() {} }, audioPlaylistRef: { current: { pause() {} } }, audioPlaybackRequestRef: { current: 0 },
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    playAudioSequence: (sequence, purpose, _variant, observer) => { calls.push({ sequence, purpose }); observer.onStarted(); },
  });
  const playback = play('prompt'); assert.equal(calls[0].sequence, promptTurnSequence);
  const gate = decisionPlaybackRef.current.gate;
  gate.observe({ currentIndex: 0, trackCount: 2, playing: true, didJustFinish: false });
  gate.observe({ currentIndex: 0, trackCount: 2, playing: false, didJustFinish: true });
  assert.equal(decisionPlaybackRef.current.gate, gate, 'First track completion retains the playback transaction');
  gate.observe({ currentIndex: 1, trackCount: 2, playing: true, didJustFinish: false });
  gate.observe({ currentIndex: 1, trackCount: 2, playing: false, didJustFinish: true }); assert.equal(await playback, true);
  const response = play('answer'); timers.find(timer => timer.delay === 520).fn();
  assert.equal(calls[1].sequence, answerTurnSequence); decisionPlaybackRef.current.gate.fail(); assert.equal(await response, false);
  const interrupted = play('answer'); decisionPausedRef.current = true;
  timers.filter(timer => timer.delay === 520).at(-1).fn(); assert.equal(await interrupted, false); assert.equal(calls.length, 2);
});

for (const platform of ['native', 'web']) test(`${platform}: an unauthored response needs only the success cue, while missing authored audio stays blocked`, async () => {
  let done;
  const currentCard = { ...card, answer_audio_text: null, answer_audio_turns: [] };
  const decisionPausedRef = { current: false };
  const context = { currentCard, decisionPausedRef, decisionPlaybackRef: { current: null },
    cardAudioTurnSequence: () => null, promptTurnSequence: null, answerTurnSequence: null,
    setTimeout: fn => { done = fn; }, window: { setTimeout: fn => { done = fn; } },
  };
  const file = platform === 'native' ? 'mobile/src/screens/LessonScreen.tsx' : 'frontend/components/LessonPlayer.js';
  const play = productionCallback(file, 'playDecisionSequence', context);
  let advanced = false; const response = play('answer').then(played => { advanced = played; });
  await flush(); assert.equal(advanced, false, 'Success feedback gets its own audible dwell');
  done(); await response; assert.equal(advanced, true);
  const interrupted = play('answer'); decisionPausedRef.current = true; done(); assert.equal(await interrupted, false);
  decisionPausedRef.current = false; currentCard.answer_audio_text = 'An authored reply.';
  assert.equal(await play('answer'), false, 'An authored but unresolved reply must not be silently skipped');
  currentCard.answer_audio_text = null; assert.equal(await play('prompt'), false, 'No prompt can never unlock a decision');
});

test('decision locks synchronously, shuffles once, and preserves wrong choices until explicit retry', async () => {
  let ready = false, submitted = [], advanced = 0, responseCount = 0, retryCount = 0, resolveResponse;
  const state = createConversationDecision(options, 'frequency', false, {
    ready: () => ready, active: () => true, submit: ids => submitted.push(ids), retry: () => retryCount++,
    response: () => { responseCount++; return new Promise(resolve => { resolveResponse = resolve; }); },
    advance: () => advanced++, changed: () => {},
  }, () => 0);
  assert.deepEqual(state.state.options.map(option => option.id), ['time', 'frequency']);
  state.choose('frequency'); assert.equal(submitted.length, 0);
  ready = true; state.choose('time'); state.choose('frequency');
  assert.equal(state.state.phase, 'wrong'); assert.equal(state.state.selectedId, 'time');
  assert.deepEqual(submitted, [['time']]); assert.equal(responseCount, 0);
  state.retry(); assert.equal(retryCount, 1);
  assert.deepEqual(state.state.options.map(option => option.id), ['time', 'frequency']);
  state.choose('frequency'); state.choose('frequency'); state.retry();
  assert.deepEqual(submitted, [['time'], ['frequency']]); assert.equal(responseCount, 1);
  assert.equal(advanced, 0); resolveResponse(true); await flush();
  assert.equal(advanced, 1); assert.equal(state.state.phase, 'finished');
  state.continue(); state.choose('frequency'); assert.equal(advanced, 1);
});

test('response failure, interruption and disposal cannot advance or rescore; completion needs Continue', async () => {
  let active = true, advanced = 0, submissions = 0, resolveResponse;
  const state = createConversationDecision(options, 'frequency', true, {
    ready: () => true, active: () => active, submit: () => submissions++, retry: () => {},
    response: () => new Promise(resolve => { resolveResponse = resolve; }), advance: () => advanced++, changed: () => {},
  });
  state.choose('frequency'); resolveResponse(false); await flush();
  assert.equal(state.state.phase, 'response-error'); assert.equal(advanced, 0);
  state.retryResponse(); const stale = resolveResponse; state.pause(true); stale(true); await flush();
  assert.equal(state.state.phase, 'response-error');
  state.retryResponse(); assert.equal(resolveResponse, stale, 'No response starts while paused');
  state.pause(false); state.retryResponse(); resolveResponse(true); await flush();
  assert.equal(state.state.phase, 'completion'); assert.equal(advanced, 0); assert.equal(submissions, 1);
  active = false; state.continue(); assert.equal(advanced, 0);
  active = true; state.continue(); state.continue(); assert.equal(advanced, 1);
  const disposed = createConversationDecision(options, 'frequency', false, {
    ready: () => true, active: () => true, submit: () => {}, retry: () => {},
    response: () => new Promise(resolve => { resolveResponse = resolve; }), advance: () => advanced++, changed: () => {},
  });
  disposed.choose('frequency'); disposed.dispose(); resolveResponse(true); await flush(); assert.equal(advanced, 1);
});

test('native audio gate requires every ordered track and final completion, and fails closed', async () => {
  const gate = createDecisionPlaybackGate(2); let settled;
  gate.promise.then(value => { settled = value; });
  const status = (index, playing = true, didJustFinish = false) => ({ currentIndex: index, trackCount: 2, playing, didJustFinish });
  gate.observe(status(0)); gate.arm(); gate.observe(status(1, false, true)); await flush(); assert.equal(settled, undefined);
  gate.observe(status(0)); gate.observe(status(0, false, true)); await flush(); assert.equal(settled, undefined);
  gate.observe(status(1)); gate.observe(status(1, false, true)); assert.equal(await gate.promise, true);
  gate.fail(); assert.equal(await gate.promise, true);
  const failed = createDecisionPlaybackGate(2); failed.arm(); failed.observe({ ...status(0), error: 'missing clip' });
  failed.observe(status(1, false, true)); assert.equal(await failed.promise, false);
  const cancelled = createDecisionPlaybackGate(1); cancelled.arm(); cancelled.fail();
  cancelled.observe({ currentIndex: 0, trackCount: 1, playing: true, didJustFinish: true });
  assert.equal(await cancelled.promise, false);
});

test('web audio plays all turns in order, ignores duplicate callbacks, and rejects failure or cancellation', async () => {
  const calls = [];
  const run = playDecisionTurns(['first', 'second'], (turn, done, fail) => calls.push({ turn, done, fail }));
  assert.deepEqual(calls.map(call => call.turn), ['first']);
  calls[0].done(); calls[0].done(); calls[0].fail();
  assert.deepEqual(calls.map(call => call.turn), ['first', 'second']);
  calls[1].done(); assert.equal(await run.promise, true);
  const failure = playDecisionTurns(['first', 'second'], (_turn, _done, fail) => fail()); assert.equal(await failure.promise, false);
  let late; const cancelled = playDecisionTurns(['first', 'second'], (_turn, done) => { late = done; });
  cancelled.cancel(); late(); assert.equal(await cancelled.promise, false);
  assert.equal(await playDecisionTurns([], () => assert.fail('Empty sequence must never play')).promise, false);
  assert.equal(await playDecisionTurns(['silent'], () => {}, 5).promise, false, 'No completion signal cannot unlock');
});

function harness(platform, completion = false, imageOptions = false) {
  let cursor = 0, dirty = true, tree, effects = [], width = 390, height = 844, resolveResponse;
  const slots = [], submits = [], responses = [], advances = [], replays = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn(), effect: fn }; }); },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const load = loader({ react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width, height }) } });
  const Component = platform === 'native' ? load('mobile/src/components/MissionConversationDecision.tsx').MissionConversationDecision
    : load('frontend/components/MissionConversationDecision.js').default;
  const props = { card: { ...card, options: imageOptions ? options.map(option => ({ ...option, image_url: `${option.id}.png` })) : options,
    mission_game: { ...card.mission_game, ...(completion ? { completion_scene: { image_url: 'outcome.png', context_es: 'La historia continúa.' } } : {}) } },
    paused: false, interactionReady: false, cueUnavailable: false, imageUrl: 'prompt.png', imageSrc: 'prompt.png', resolveImage: value => value,
    onSubmit: ids => submits.push(ids), onRetry: () => {}, onResponse: () => { responses.push(true); return new Promise(resolve => { resolveResponse = resolve; }); },
    onAdvance: () => advances.push(true), onReplay: () => replays.push(true), onTutor: () => {} };
  const nodes = () => { const result = []; const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (node && typeof node === 'object') { result.push(node); walk(node.props?.children); } }; walk(tree); return result; };
  const text = () => { const parts = []; const walk = node => { if (typeof node === 'string') parts.push(node); else if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === 'object') walk(node.props?.children); }; walk(tree); return parts.join(' '); };
  function render() { for (let i = 0; dirty; i++) { assert.ok(i < 30, 'No render loop'); dirty = false; cursor = 0; effects = []; tree = Component(props); effects.forEach(fn => fn()); } }
  function click(node) { assert.ok(node, 'Control exists'); assert.ok(!node.props.disabled, 'Control is enabled'); (node.props.onPress || node.props.onClick)(); render(); }
  render();
  return { nodes, text, submits, responses, advances, replays,
    order: () => nodes().filter(node => options.some(option => option.id === node.key)).map(node => node.key),
    choose: id => click(nodes().find(node => node.key === id)),
    button: label => click(nodes().find(node => (node.props?.accessibilityLabel || node.props?.['aria-label']) === label
      || node.props?.children === label || node.props?.children?.props?.children === label)),
    update(next) { Object.assign(props, next); dirty = true; render(); },
    rotate() { [width, height] = [height, width]; dirty = true; render(); },
    async response(value) { resolveResponse(value); await flush(); render(); },
    strictRestart() { slots.forEach(slot => { if (slot?.effect) { slot.cleanup?.(); slot.cleanup = slot.effect(); } }); render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const platform of ['native', 'web']) {
  test(`${platform}: real decision surface locks listening, retains order on retry/rotation and plays response once`, async () => {
    const h = harness(platform); h.strictRestart();
    assert.ok(h.nodes().filter(node => h.order().includes(node.key)).every(node => node.props.disabled));
    h.button('Repetir la conversación en inglés'); assert.equal(h.replays.length, 1);
    h.update({ interactionReady: true }); const order = h.order();
    h.choose('time'); assert.deepEqual(h.submits, [['time']]); assert.match(h.text(), /Cuando te equivocas/);
    assert.ok(h.nodes().some(node => node.type === 'TutorButton' && node.props.more));
    h.rotate(); h.button('Reintentar'); assert.deepEqual(h.order(), order);
    h.choose('frequency'); assert.equal(h.responses.length, 1);
    assert.ok(h.nodes().filter(node => h.order().includes(node.key)).every(node => node.props.disabled));
    await h.response(false); assert.equal(h.advances.length, 0);
    h.button('Repetir respuesta'); assert.equal(h.responses.length, 2);
    await h.response(true); assert.equal(h.advances.length, 1); assert.equal(h.submits.length, 2);
    h.unmount();
  });
  test(`${platform}: response pause retains the beat and completion appears only after response replay`, async () => {
    const h = harness(platform, true, true); h.update({ interactionReady: true });
    assert.ok(h.nodes().some(node => (node.props?.accessibilityLabel || node.props?.['aria-label']) === 'Imagen 1'));
    assert.ok(!h.text().includes('How often do you study?'), 'Image choices do not leak English labels');
    h.choose('frequency'); h.update({ paused: true }); await h.response(true);
    assert.equal(h.advances.length, 0); assert.ok(!h.text().includes('La historia continúa.'));
    h.update({ paused: false, interactionReady: false }); h.button('Repetir respuesta'); await h.response(true);
    assert.ok(h.text().includes('La historia continúa.')); assert.equal(h.advances.length, 0);
    h.button('Continuar la historia'); assert.equal(h.advances.length, 1); assert.equal(h.submits.length, 1);
    h.unmount();
  });
}

test('native compact landscape keeps the longest decision explanation readable and both recovery controls in bounds', async () => {
  const { pathToFileURL } = require('node:url');
  const Yoga = (await import(pathToFileURL(require.resolve('yoga-layout')).href)).default;
  const source = fs.readFileSync(path.join(root, 'mobile/src/components/MissionConversationDecision.tsx'), 'utf8');
  const styles = new Function('StyleSheet', 'return ' + source.slice(source.lastIndexOf('const styles = ') + 15))({ create: value => value });
  const { lessonMistakeHint } = loader()('mobile/src/lessonMistakeHints.ts');
  const fixtures = require('./fixtures/a1plus-unit1-choices.json').cards.filter(card => card.mission_game?.kind === 'conversation-decision');
  const hints = fixtures.flatMap(card => card.options.filter(option => option.id !== card.correct_option_id).map(option => lessonMistakeHint(card, option.id)));
  const longest = hints.sort((a, b) => b.length - a.length)[0];
  assert.ok(longest && longest.length > 80);
  assert.equal(styles.speaker.width, 48); assert.equal(styles.speaker.height, 48);
  assert.match(source, /<ScrollView style=\{styles\.explanation\}/, 'Oversized feedback can scroll without moving the fixed recovery controls');
  for (const [width, height] of [[568, 320], [640, 360], [844, 390]]) for (const scale of [1, 1.3]) {
    const config = Yoga.Config.create(); config.setUseWebDefaults(false);
    const node = () => Yoga.Node.create(config);
    const rootNode = node(); rootNode.setWidth(width - 60); rootNode.setHeight(height - 36);
    rootNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW); rootNode.setGap(Yoga.GUTTER_ALL, styles.landscape.gap);
    const rail = node(); rail.setWidthPercent(parseFloat(styles.rail.width)); rootNode.insertChild(rail, 0);
    const header = node(); header.setHeight(110 * scale); rail.insertChild(header, 0);
    const instruction = node(); instruction.setHeight(Math.max(styles.speaker.height, 3 * styles.direction.lineHeight * scale)); rail.insertChild(instruction, 1);
    const body = node(); body.setFlex(styles.body.flex); body.setMinHeight(styles.body.minHeight); rootNode.insertChild(body, 1);
    const feedback = node(); feedback.setFlex(styles.feedback.flex); feedback.setMinHeight(styles.feedback.minHeight);
    feedback.setPadding(Yoga.EDGE_ALL, styles.feedback.padding); feedback.setGap(Yoga.GUTTER_ALL, styles.feedback.gap); body.insertChild(feedback, 0);
    const explanation = node(); explanation.setFlex(styles.explanation.flex); explanation.setMinHeight(styles.explanation.minHeight);
    explanation.setOverflow(Yoga.OVERFLOW_SCROLL); feedback.insertChild(explanation, 0);
    const copy = node(); copy.setMeasureFunc(availableWidth => ({ width: availableWidth,
      height: Math.ceil(longest.length * styles.hint.fontSize * scale * .55 / availableWidth) * styles.hint.lineHeight * scale + 44 * scale }));
    explanation.insertChild(copy, 0);
    const actions = node(); actions.setHeight(styles.retry.minHeight + 5); feedback.insertChild(actions, 1);
    rootNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
    assert.ok(header.getComputedHeight() + instruction.getComputedHeight() <= height - 36);
    assert.ok(explanation.getComputedHeight() >= 48, `${width}x${height}/${scale}: readable explanation viewport`);
    assert.ok(actions.getComputedTop() + actions.getComputedHeight() + styles.feedback.padding <= height - 36);
    rootNode.freeRecursive(); config.free();
  }
});
