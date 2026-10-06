const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lessonPromptPresentation.ts'), 'utf8');
const api = {};
new Function('exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(api);
const { isSilentWrittenRecognize, isWrittenRecognize, recognizeAnswerReplayText } = api;
const helpApi = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(root, 'src/lessonHelp.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(helpApi, (id) => {
  assert.equal(id, './lessonPromptPresentation');
  return api;
});
const { lessonHelpText } = helpApi;

const card = {
  stage: 'Recognize',
  prompt: 'What day is it today?\nMonday',
  audio_text: '',
  answer_audio_text: 'Today is Monday.',
  correct_option_id: 'monday',
  options: [{ id: 'monday', label: 'Monday' }, { id: 'tuesday', label: 'Tuesday' }],
};

test('written silent recognition cannot reveal its answer through replay before a correct choice', () => {
  assert.equal(isSilentWrittenRecognize(card), true);
  assert.equal(recognizeAnswerReplayText(card, false), '');
  assert.equal(recognizeAnswerReplayText(card, true), 'Today is Monday.');
  assert.equal(card.prompt, 'What day is it today?\nMonday', 'Feedback must preserve the authored written task.');
  assert.equal(recognizeAnswerReplayText({ ...card, answer_audio_text: '' }, true), '',
    'A silent written task needs explicit answer narration; its label is not an implicit recording.');
});

test('null prompt audio retains ordinary narration and other stages keep their existing replay behavior', () => {
  for (const audio_text of [null, undefined, 'What day is it today?']) {
    const spoken = { ...card, audio_text };
    assert.equal(isSilentWrittenRecognize(spoken), false);
    assert.equal(isWrittenRecognize(spoken), false, 'Existing spoken cards do not opt in through audio alone.');
    assert.equal(recognizeAnswerReplayText(spoken, true), '');
  }
  for (const stage of ['Learn', 'Listen', 'Speak', 'Use']) {
    assert.equal(isSilentWrittenRecognize({ ...card, stage }), false);
    assert.equal(recognizeAnswerReplayText({ ...card, stage }, true), '');
  }
  assert.equal(recognizeAnswerReplayText({ ...card, prompt: '', answer_audio_text: null }, true), 'Monday',
    'The established empty-prompt instruction still replays the correct choice.');
  assert.equal(recognizeAnswerReplayText({ ...card, prompt: '' }, true), 'Today is Monday.',
    'An explicit answer remains authoritative when its text differs from the choice label.');
});

test('explicit written presentation retains pronunciation and never changes its header replay to the answer', () => {
  const spoken = { ...card, prompt_presentation: 'written', audio_text: 'What day is it today? Monday' };
  assert.equal(isWrittenRecognize(spoken), true);
  assert.equal(isSilentWrittenRecognize(spoken), false);
  for (const correct of [false, true]) {
    assert.equal(recognizeAnswerReplayText(spoken, correct), '', 'The question speaker remains the prompt speaker after correct.');
    assert.equal(recognizeAnswerReplayText(spoken, correct) || spoken.audio_text, 'What day is it today? Monday');
  }
  assert.equal(isWrittenRecognize({ ...spoken, audio_text: '' }), true);
  assert.equal(isSilentWrittenRecognize({ ...spoken, audio_text: '' }), true, 'Silence remains a separately authored choice.');
  assert.equal(isWrittenRecognize({ ...spoken, stage: 'Listen' }), false);
});

test('silent written recognition help asks for reading and visual matching in both directions', () => {
  const images = [{ id: 'a', label: '', image_url: '/a.webp' }, { id: 'b', label: '', image_url: '/b.webp' }];
  const modes = ['gestures', 'translation-on-tap', 'visual-instruction', 'replay-on-tap'];
  for (const mode of modes) {
    assert.equal(lessonHelpText({ ...card, options: images }, mode), 'Lee la palabra y toca la imagen que corresponde.');
    assert.equal(lessonHelpText({ ...card, prompt: 'The boy is reading.', options: images }, mode),
      'Lee la frase y toca la imagen que corresponde.');
    assert.equal(lessonHelpText({ ...card, prompt: 'Who is he?', options: images }, mode),
      'Lee la pregunta y toca la imagen que corresponde.');
    assert.equal(lessonHelpText({ ...card, prompt_image_url: '/a.webp' }, mode),
      'Mira la imagen y toca la palabra que la describe.');
    assert.equal(lessonHelpText({ ...card, prompt: 'What day is it today?', prompt_image_url: '/a.webp',
      options: [{ id: 'a', label: 'Today is Monday.' }, { id: 'b', label: 'Today is Tuesday.' }] }, mode),
    'Mira la imagen y toca la frase que la describe.');
    assert.equal(lessonHelpText({ ...card, audio_text: 'Monday', options: images }, mode),
      'Lee y escucha. Toca la imagen que corresponde.', 'Spoken recognition keeps its established help.');
  }
});

test('all regenerated weekday recognition cards keep writing and pronunciation with separate post-correct answers', () => {
  const days = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/lesson-4-8-days-and-time.json'), 'utf8'));
  const cards = days.cards.filter(current => current.stage === 'Recognize');
  assert.equal(cards.length, 10);
  for (const current of cards) {
    assert.equal(isWrittenRecognize(current), true, `${current.slide_id}: explicit written presentation.`);
    assert.equal(isSilentWrittenRecognize(current), false, `${current.slide_id}: prompt pronunciation is available.`);
    assert.equal(recognizeAnswerReplayText(current, false), '');
    assert.equal(recognizeAnswerReplayText(current, true), '', 'A correct answer never replaces the question speaker.');
    assert.ok(current.audio_assets.some(asset => asset.purpose === 'answer' && asset.text === current.answer_audio_text),
      `${current.slide_id}: replay resolves the authored immutable answer asset.`);
    const promptAssets = current.audio_assets.filter(asset => asset.purpose.startsWith('prompt'));
    assert.ok(promptAssets.length, `${current.slide_id}: immutable cue pronunciation is present.`);
    assert.ok(current.audio_text.startsWith('What day is it today?'));
    const reverse = current.options.every(option => option.image_url);
    if (reverse) {
      assert.equal(current.audio_turns.length, 2, 'Reverse cues pronounce the question followed by the written weekday.');
      assert.deepEqual(promptAssets.map(asset => [asset.purpose, asset.text]),
        current.audio_turns.map((turn, index) => [`prompt-turn-${index + 1}`, turn.text]),
        'Both audible turns resolve their own immutable recording.');
      assert.equal(current.audio_turns.map(turn => turn.text).join(' '), current.audio_text);
      assert.equal(current.prompt, current.audio_turns.map(turn => turn.text).join('\n'));
    } else {
      assert.deepEqual(promptAssets.map(asset => [asset.purpose, asset.text]), [['prompt', current.audio_text]]);
      assert.equal(current.audio_text, 'What day is it today?', 'The upfront question never pronounces the hidden answer.');
    }
    const help = lessonHelpText(current, 'translation-on-tap');
    assert.doesNotMatch(help, /escucha|bocina|repetir/i, `${current.slide_id}: help never asks the learner to listen.`);
    assert.equal(help, current.options.every(option => option.image_url)
      ? 'Lee la palabra y toca la imagen que corresponde.'
      : 'Mira la imagen y toca la frase que la describe.');
  }
});

test('both clients preserve the written task while using answer assets only after correct selection', () => {
  const screen = fs.readFileSync(path.join(root, 'src/screens/LessonScreen.tsx'), 'utf8');
  const cardView = fs.readFileSync(path.join(root, 'src/components/LessonCardView.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(root, '../frontend/components/LessonPlayer.js'), 'utf8');
  assert.match(screen, /const visiblePromptText = writtenRecognize \? currentCard\?\.prompt \|\| '' : visiblePromptAudio \|\| currentCard\?\.prompt \|\| ''/);
  assert.match(screen, /disabled=\{useCompactHeaderInstruction \|\| !visiblePromptText\.trim\(\)\}/,
    'A written prompt remains available for translation even without upfront speech.');
  assert.match(screen, /recognizeAnswerReplayText\(currentCard, result === 'correct'\)/);
  assert.match(screen, /!silentWrittenRecognize \|\| phraseReplayAvailable \? <Pressable/,
    'A silent written task advertises no speaker until answer replay exists.');
  assert.match(screen, /if \(correctRecognizeReplayText\) \{\s*playAudio\(correctRecognizeReplayText, 'prompt', 'answer'\)/);
  assert.match(cardView, /accessibilityLabel=\{isWrittenRecognize\(card\) && result !== 'correct'\s*\? card\.prompt/,
    'The upfront picture description must not leak the authored English answer to screen readers.');
  assert.match(screen, /if \(\(!promptAudio\.trim\(\) \|\| promptHasVisualBlank\) && !completionPromptSource && !promptTurnSequence\)/,
    'Silence finishes the autoplay gate immediately instead of arming a playback timeout.');
  assert.match(web, /recognizeAnswerReplayText\(currentCard, lastResult === "correct"\)/);
  assert.match(web, /whiteSpace: "pre-line"/,
    'The authored question and target word retain separate visible lines.');
  assert.match(web, /disabled=\{!isPronunciationCard && !cardReplayText\.trim\(\)\}/);
  assert.match(web, /speakText\(correctRecognizeReplayText,[\s\S]*?purpose: "answer", text: correctRecognizeReplayText/);
});

test('the actual web autoplay predicate pronounces written cues outside Unit 1 and keeps explicit silence', () => {
  const web = fs.readFileSync(path.join(root, '../frontend/components/LessonPlayer.js'), 'utf8');
  const expression = web.match(/const hasPromptAutoplay = ([^;]+);/)[1];
  const applies = new Function('isRecognitionLesson', 'currentCard', 'cardPromptText',
    'cardPromptHasVisualBlank', 'isWrittenRecognize', `return Boolean(${expression});`);
  const spoken = { ...card, prompt_presentation: 'written', audio_text: 'What day is it today? Monday' };
  assert.equal(applies(false, spoken, spoken.audio_text, false, isWrittenRecognize), true);
  assert.equal(applies(false, { ...card, prompt_presentation: 'written' }, '', false, isWrittenRecognize), false);
  assert.equal(applies(false, { ...spoken, prompt_presentation: undefined }, spoken.audio_text, false, isWrittenRecognize), false);
  assert.match(web, /data-written-prompt-speaker/,
    'An available cue has a visible speaker affordance on its existing replay control.');
});
