// Mission voice gates must give the same speaking feedback as a lesson Speak
// card: the microphone-ready cue and success chime from the shared engine, the
// live voice-level signal, the listening and grading mascot, syllables that turn
// green as they are recognized, and the spring celebration when the answer passes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const source = file => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const pronunciation = source('components/PronunciationPractice.tsx');
const presentation = source('components/MissionVoicePresentation.tsx');
const lessons = fs.readdirSync(new URL('../src/generated/', import.meta.url))
  .filter(name => name.startsWith('lesson-') && name.endsWith('.json'))
  .map(name => JSON.parse(fs.readFileSync(new URL(`../src/generated/${name}`, import.meta.url), 'utf8')));
const gates = lessons.flatMap(lesson => lesson.cards.filter(card => card.mission_game?.kind === 'voice-gate'));
const noop = () => {};

function body(name) {
  const start = pronunciation.indexOf(name);
  assert.ok(start >= 0, `missing ${name}`);
  return pronunciation.slice(start, pronunciation.indexOf('\n  }, [', start));
}

test('the shared engine plays the microphone cue and the success chime for mission gates too', () => {
  assert.match(pronunciation, /const READY_CUE = require\('..\/..\/assets\/sfx\/speaking-turn-v3\.mp3'\);/);
  const listening = body('const startListening = useCallback(');
  assert.match(listening, /await playReadyCueAndWait\(runId\)/);
  assert.doesNotMatch(listening, /missionVoiceGate|presentation/, 'the ready cue may not be skipped for missions');
  const chime = pronunciation.slice(pronunciation.indexOf("if (phase !== 'success' || !passed || successChimePlayed.current) return;"));
  assert.match(chime.slice(0, 400), /successChimePlayer\.play\(\)/);
  assert.doesNotMatch(chime.slice(0, 400), /missionVoiceGate/, 'the success chime may not be skipped for missions');
});

test('the mission panel receives the lesson signal, mascot and celebration instead of static copy', () => {
  assert.match(pronunciation, /const signal = \(\s*<View style=\{styles\.signalRow\}>/);
  assert.match(pronunciation, /<View style=\{styles\.signalStack\}>\s*\{signal\}\s*<\/View>/, 'lessons keep the same signal');
  for (const prop of [/signal=\{signal\}/, /mascot=\{missionMascot\}/, /celebrate=\{Boolean\(result && passed\)\}/,
    /successScale=\{successAnimation\}/, /answer=\{phase === 'model' \? null : missionAnswerSegments\(/]) {
    assert.match(pronunciation, prop);
  }
  assert.match(pronunciation, /LISTENING_MASCOT_FRAMES\[listeningFrame\] : GRADING_MASCOT_FRAMES\[gradingFrame\]/);
  assert.match(presentation, /Animated\.spring\(micPop/, 'the badge pops when the microphone opens');
  assert.match(presentation, /transform: \[\{ scale: successScale \}\]/);
});

test('answer segments keep the written sentence and color recognized syllables, then graded words', () => {
  const h = lessonHarness({ width: 390, height: 844, fontScale: 1 });
  const { referenceSyllables } = h.load('pronunciationEngine.ts');
  const { missionAnswerSegments } = h.load('missionVoiceAnswer.ts');
  const answer = 'I am from Canada. I am Canadian.';
  const syllables = referenceSyllables(answer);
  const pending = missionAnswerSegments(answer, syllables, [], null, true);
  assert.equal(pending.map(segment => segment.text).join(''), answer);
  assert.ok(pending.every(segment => segment.state === 'pending' || segment.state === 'plain'));
  const firstWords = syllables.filter(syllable => syllable.wordIndex < 2).map(syllable => syllable.key);
  const live = missionAnswerSegments(answer, syllables, firstWords, null, true);
  assert.equal(live.map(segment => segment.text).join(''), answer);
  // Harness modules run in their own realm; compare plain copies.
  assert.deepEqual(Array.from(live.filter(segment => segment.state === 'heard'), segment => segment.text), ['I', 'am']);
  const graded = missionAnswerSegments(answer, syllables, firstWords,
    ['i', 'am', 'from', 'canada', 'i', 'am', 'canadian'].map((token, index) => ({ token, good: index !== 3 })), false);
  assert.deepEqual(Array.from(graded.filter(segment => segment.state === 'weak'), segment => segment.text), ['Canada']);
  assert.equal(missionAnswerSegments(answer, syllables, firstWords, null, false).every(segment => segment.state === 'plain'), true);
  for (const card of gates) {
    const text = card.audio_text || card.prompt;
    assert.equal(missionAnswerSegments(text, referenceSyllables(text), [], null, true).map(s => s.text).join(''), text,
      `${card.slide_id}: the written answer must survive segmentation`);
  }
});

// The harness measures a Text as one block; its nested spans stay in props.
function answerSpans(records, answer) {
  const block = records.find(r => r.type === 'Text' && r.text === answer);
  assert.ok(block, `the answer ${answer} is rendered`);
  return [block.props.children].flat().map(child => [child?.props?.style].flat()
    .reduce((color, style) => style?.backgroundColor ?? color, null));
}

function within(records, width, height, context) {
  for (const r of records.slice(1)) {
    const b = r.box;
    const label = r.text || r.props.accessibilityLabel || r.type;
    assert.ok(b.left >= -1 && b.top >= -1 && b.left + b.width <= width + 1 && b.top + b.height <= height + 1,
      `${context}: ${label} outside ${width}x${height}: ${JSON.stringify(b)}`);
    if (r.text.trim()) assert.ok(r.textHeight <= b.height + 1.5, `${context}: clipped text ${label}`);
    if (r.type === 'Pressable' && r.props.accessibilityRole === 'button') {
      assert.ok(b.width >= 47 && b.height >= 47, `${context}: undersized ${label}: ${JSON.stringify(b)}`);
    }
  }
}

const RESULTS = {
  success: { interpreted: { passed: true, pedagogicalScore: 90 }, feedback: { messages: { es: '¡Muy bien! La frase está completa.' } } },
  retry: { interpreted: { passed: false, pedagogicalScore: 40 }, feedback: { messages: { es: 'Escucha de nuevo y practica las palabras marcadas.' } },
    text_score: { word_score_list: [{ quality_score: 90 }, { quality_score: 20, error_type: 'Mispronunciation' }] } },
};

function gateHarness(phase, width, height, fontScale) {
  const scenario = { phase: phase === 'unavailable' ? 'retry' : phase, unavailable: phase === 'unavailable', result: RESULTS[phase] || null };
  return lessonHarness({ width, height, fontScale }, { pronunciation: scenario, sourceTransform: (file, text) =>
    file.endsWith('PronunciationPractice.tsx')
      ? text.replace('useState<string[]>([]);', "useState<string[]>(['0:0', '1:0']);")
      : text });
}

function renderGate(h, card, width, height) {
  const { PronunciationPractice } = h.load('components/PronunciationPractice.tsx');
  const turn = card.audio_turns[0];
  return h.render(() => e('View', { style: { width, height }, children: e(PronunciationPractice, {
    audioProvider: 'persistent-asset', audioTurns: [{ asset: { id: 'layout-test' }, turn }], audioVoice: null,
    phrase: card.audio_text || card.prompt, imageHeight: height, imageUrl: card.options[0].image_url, isAppActive: true,
    isOffline: false, level: 'A1', presentation: 'mission-voice-gate', missionSuccessLabel: 'RESPUESTA COMPLETA',
    userId: 'layout-test', onPassed: noop, onUnavailable: noop }) }), width, height);
}

test('every mission gate phase shows the lesson feedback and fits the voice surface', () => {
  assert.ok(gates.length >= 16, 'Units 1-7 author their mission voice gates');
  const longest = [...gates].sort((a, b) => (b.audio_text || b.prompt).length - (a.audio_text || a.prompt).length).slice(0, 3);
  const phases = ['model', 'ready', 'listening', 'checking', 'retry', 'success', 'permission', 'unavailable'];
  for (const [width, height] of [[320, 300], [360, 400], [260, 264], [520, 350]]) for (const fontScale of [1, 1.3]) {
    for (const phase of phases) for (const card of longest) {
      const context = `${width}x${height}@${fontScale}/${card.slide_id}/${phase}`;
      const records = renderGate(gateHarness(phase, width, height, fontScale), card, width, height);
      within(records, width, height, context);
      const scene = records.find(r => ['#edc976', '#61d4a7'].includes(r.style.borderColor));
      assert.ok(scene && scene.box.height >= 40, `${context}: the scene stays visible above the voice panel`);
      const texts = records.filter(r => r.type === 'Text' && r.text.trim()).map(r => r.text);
      const labels = records.map(r => r.props.accessibilityLabel).filter(Boolean);
      const answer = card.audio_text || card.prompt;
      if (phase === 'model') {
        assert.ok(texts.includes('ESCUCHA LA PREGUNTA'), context);
        assert.ok(!texts.includes(answer), `${context}: the answer stays hidden while the question plays`);
      }
      if (phase === 'ready') assert.ok(texts.includes('SE ABRE EL MICRÓFONO') && texts.includes('Prepárate…'), context);
      if (phase === 'listening') {
        assert.ok(labels.includes('Escuchando'), `${context}: the listening mascot is shown`);
        assert.ok(texts.includes('TE ESCUCHAMOS') && texts.includes(answer), context);
        assert.ok(answerSpans(records, answer).filter(color => color === '#c9eed8').length >= 2,
          `${context}: recognized syllables turn green`);
      }
      if (phase === 'checking') assert.ok(labels.includes('La profesora ardilla está calificando'), context);
      if (phase === 'success') {
        assert.ok(texts.filter(text => text === 'RESPUESTA COMPLETA').length >= 2, `${context}: badge and heading`);
        assert.ok(texts.some(text => text.startsWith('✨ ') && text.endsWith(' ✨')), `${context}: celebration`);
        assert.ok(!records.some(r => r.type === 'Pressable'), `${context}: a passed gate advances on its own`);
      }
      if (phase === 'retry') {
        assert.ok(texts.includes('INTÉNTALO OTRA VEZ'), context);
        assert.ok(answerSpans(records, answer).includes('#fff2cf'), `${context}: the weak word is marked`);
      }
      if (phase === 'permission') assert.ok(texts.includes('Activar micrófono'), context);
      if (phase === 'unavailable') {
        assert.ok(texts.includes('Continuar sin calificar') && !texts.includes(answer), context);
      }
    }
  }
});
