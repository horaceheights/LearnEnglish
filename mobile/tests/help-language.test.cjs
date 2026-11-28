// Multilingual app (user decision 2026-11-28, docs/product/multilingual-architecture.md):
// help text follows the learner's help language. Lesson files keep their reviewed
// legacy help fields and add other languages as `<field>_i18n` siblings; a pair with
// no hand-written mistake explanations shows the correct answer with its translation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const mobileRoot = path.resolve(__dirname, '..');
function load(relative) {
  const output = ts.transpileModule(fs.readFileSync(path.join(mobileRoot, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: () => ({}) });
  return exports;
}

const { localizeLesson, hasWrittenMistakeHelp, writtenMistakeHelpLanguage } = load('src/helpLanguage.ts');
const plain = value => JSON.parse(JSON.stringify(value));

const lesson = () => ({
  id: 'de-a1-unit-1-lesson-1',
  title: 'Ein Junge',
  mission: {
    briefing: 'Find the family.',
    briefing_i18n: { es: 'Encuentra a la familia.' },
    objectives: ['Tap the boy.'],
    objectives_i18n: { es: ['Toca al niño.'] },
  },
  cards: [{
    slide_id: 'L1',
    prompt: 'Ein Junge',
    target_language: 'de',
    spanish_translation: 'A boy',
    spanish_translation_i18n: { es: 'Un niño', fr: 'Un garçon' },
    options: [{ id: 'a', label: 'Ein Junge', spanish_translation: 'A boy', spanish_translation_i18n: { es: 'Un niño' } }],
    audio_turns: [{ text: 'Hallo.', spanish_translation: 'Hello.' }],
    mission_game: { instruction_es: 'Listen and tap.', instruction_es_i18n: { es: 'Escucha y toca.' } },
  }],
});

test('a lesson read in its default help language is returned unchanged', () => {
  const original = lesson();
  assert.equal(localizeLesson(original, 'en', 'en'), original);
});

test('every help field with a translation switches to the help language', () => {
  const spanish = plain(localizeLesson(lesson(), 'es', 'en'));
  const [card] = spanish.cards;
  assert.equal(card.spanish_translation, 'Un niño');
  assert.equal(card.options[0].spanish_translation, 'Un niño');
  assert.equal(card.mission_game.instruction_es, 'Escucha y toca.');
  assert.equal(spanish.mission.briefing, 'Encuentra a la familia.');
  assert.deepEqual(spanish.mission.objectives, ['Toca al niño.']);
  // Learning text and identities never change.
  assert.equal(card.prompt, 'Ein Junge');
  assert.equal(spanish.id, 'de-a1-unit-1-lesson-1');
  // The translation maps do not travel into the localized lesson.
  assert.equal('spanish_translation_i18n' in card, false);
});

test('a missing translation hides the help text instead of showing another language', () => {
  const french = plain(localizeLesson(lesson(), 'fr', 'en'));
  assert.equal(french.cards[0].spanish_translation, 'Un garçon');
  assert.equal(french.cards[0].options[0].spanish_translation, '');
  assert.equal(french.mission.briefing, '');
  assert.deepEqual(french.mission.objectives, []);
  // A field with no translation map is untouched: it was never help text in another language.
  assert.equal(french.cards[0].audio_turns[0].spanish_translation, 'Hello.');
});

test('hand-written mistake help exists only for its own pair', () => {
  assert.equal(writtenMistakeHelpLanguage({}), 'es');
  assert.equal(writtenMistakeHelpLanguage({ target_language: 'de' }), 'en');
  assert.equal(writtenMistakeHelpLanguage({ target_language: 'es' }), 'en');
  assert.equal(hasWrittenMistakeHelp({}, 'es'), true);
  assert.equal(hasWrittenMistakeHelp({ target_language: 'de' }, 'en'), true);
  assert.equal(hasWrittenMistakeHelp({ target_language: 'de' }, 'es'), false);
  assert.equal(hasWrittenMistakeHelp({}, 'fr'), false);
  // Callers that pass no help language keep today's explanations.
  assert.equal(hasWrittenMistakeHelp({ target_language: 'es' }), true);
});

test('every place that can show a mistake hint passes the help language', () => {
  const read = relative => fs.readFileSync(path.join(mobileRoot, relative), 'utf8');
  assert.match(read('src/components/LessonCardView.tsx'), /lessonMistakeHint\(card, [^)]*, lang\)/);
  assert.match(read('src/components/MissionConversationDecision.tsx'), /lessonMistakeHint\(card, state\.selectedId, lang\)/);
  assert.match(read('src/components/SentenceConstruction.tsx'), /hasWrittenMistakeHelp\(card, lang\) \? sentenceHint\(card, slots\) : fallbackMistakeHint\(card, lang\)/);
  assert.match(read('src/screens/LessonScreen.tsx'), /localizeLesson\(await getLesson\(lessonId\), lang, uiLanguageForLesson\(lessonId\)\)/);
});
