// Traducir on every slide where the learner picks written English (user decisions
// 2026-11-18): Reconoce and Escucha text choices and mission conversation replies.
// One labelled button shows every written choice's authored Spanish for the shared
// three-second window, on demand only, before or after answering. Completa keeps
// its own sentence tap.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(root, 'src/optionTranslations.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(api);
const {
  OPTION_TRANSLATION_BUTTON_LABEL,
  OPTION_TRANSLATION_MAX_LINES,
  optionTranslationLineCount,
  optionTranslationText,
  optionTranslationsAvailable,
  writtenChoiceCard,
} = api;

const written = (...pairs) => pairs.map(([label, spanish_translation], index) => (
  { id: String(index), image_url: '', label, spanish_translation }));
const card = (overrides = {}) => ({
  stage: 'Recognize', prompt: '', prompt_image_url: '/lesson-assets/a1_bag.webp',
  options: written(['It is a bag.', 'Es una bolsa.'], ['It is a pen.', 'Es un bolígrafo.']),
  ...overrides,
});

test('every written-choice Recognize, Listen or reply card whose choices have Spanish offers Traducir', () => {
  assert.equal(OPTION_TRANSLATION_BUTTON_LABEL, 'Traducir');
  assert.equal(optionTranslationsAvailable(card()), true);
  assert.equal(optionTranslationsAvailable(card({ prompt: 'What is it?' })), true,
    'A question above the photo still offers the choices in Spanish.');
  assert.equal(optionTranslationsAvailable(card({ stage: 'Listen', prompt_image_url: '' })), true,
    'Escucha written choices offer Traducir too.');
  assert.equal(optionTranslationsAvailable(card({ prompt_image_url: '' })), true);
  assert.equal(optionTranslationsAvailable(card({ stage: 'Listen', mission_game: { kind: 'conversation-decision' } })), true,
    'Mission conversation replies offer Traducir.');
  assert.equal(optionTranslationsAvailable(card({ stage: 'Listen', mission_game: { kind: 'crowd-search' } })), false,
    'Scene searches answer by tapping the photo, not text.');
  assert.equal(optionTranslationsAvailable(card({ stage: 'Use' })), false, 'Completa keeps its sentence tap.');
  assert.equal(optionTranslationsAvailable(card({
    options: written(['It is a bag.', 'Es una bolsa.'], ['It is a pen.', '']),
  })), false, 'A missing translation hides the button rather than showing a fallback.');
  assert.equal(optionTranslationsAvailable(card({
    options: [{ id: 'a', image_url: '/a.webp', label: 'A bag', spanish_translation: 'Una bolsa' },
      { id: 'b', image_url: '/b.webp', label: 'A pen', spanish_translation: 'Un bolígrafo' }],
  })), false, 'Picture choices are not written choices.');
  assert.equal(optionTranslationsAvailable(null), false);
});

test('the Spanish shows only inside the open window and every tile reserves the same band', () => {
  const [bag] = card().options;
  assert.equal(optionTranslationText(bag, false), '');
  assert.equal(optionTranslationText(bag, true), 'Es una bolsa.');
  assert.equal(optionTranslationLineCount(card().options, 300, 15), 1);
  const long = written(['Who are they? They are the grandparents. They are sitting and sleeping. They are not talking.',
    '¿Quiénes son ellos? Son los abuelos. Están sentados y durmiendo. No están hablando.'], ['Short.', 'Corta.']);
  const lines = optionTranslationLineCount(long, 280, 15);
  assert.ok(lines >= 2 && lines <= OPTION_TRANSLATION_MAX_LINES, `${lines} lines for the longest Spanish`);
  assert.equal(optionTranslationLineCount(written(['A', '']), 280, 15), 0);
});

test('every catalog written-choice card offers Traducir with distinct Spanish', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/generated/all-courses.json'), 'utf8'));
  const counts = { Recognize: 0, Listen: 0, decision: 0 };
  for (const lesson of catalog) {
    for (const current of lesson.cards) {
      if (!writtenChoiceCard(current)) continue;
      counts[current.mission_game ? 'decision' : current.stage] += 1;
      assert.equal(optionTranslationsAvailable(current), true, `${lesson.id}/${current.slide_id}`);
      const spanish = current.options.map(option => option.spanish_translation.trim());
      assert.equal(new Set(spanish).size, spanish.length, `${lesson.id}/${current.slide_id}: distinct Spanish`);
      for (const value of spanish) {
        assert.doesNotMatch(value, /^¡?Elige|Traducción no disponible/, `${lesson.id}/${current.slide_id}`);
      }
    }
  }
  // The A1+ Unit 1 mission was rebuilt on 2026-11-18 as 1.13 with voice gates instead of conversation
  // decisions (A1+ standards D4), so no catalog card uses them now; mission-conversation-decision.test.cjs
  // keeps their Traducir surface tested on both clients. Any decision card that returns is still checked above.
  assert.ok(counts.Recognize > 600 && counts.Listen > 550, JSON.stringify(counts));
});

test('both clients open Traducir only from its button, through the shared three-second window', () => {
  const screen = fs.readFileSync(path.join(root, 'src/screens/LessonScreen.tsx'), 'utf8');
  const cardView = fs.readFileSync(path.join(root, 'src/components/LessonCardView.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(root, '../frontend/components/LessonPlayer.js'), 'utf8');
  const decisions = [fs.readFileSync(path.join(root, 'src/components/MissionConversationDecision.tsx'), 'utf8'),
    fs.readFileSync(path.join(root, '../frontend/components/MissionConversationDecision.js'), 'utf8')];
  for (const source of decisions) {
    assert.match(source, /const optionTranslation = useManualSentenceTranslation\(card\.slide_id\)/);
    assert.match(source, /optionTranslationsAvailable\(card\)/);
    assert.match(source, /optionTranslation\.open\(\)/);
    assert.match(source, /optionTranslationText\(option, translationsVisible\)/);
  }
  assert.match(screen, /if \(currentCard\?\.stage === 'Recognize' && !useCompactHeaderInstruction/,
    'A Listen prompt is the heard cue and is never translated.');
  for (const source of [screen, web]) {
    assert.match(source, /optionTranslationsAvailable\(currentCard\)/);
    assert.match(source, /const optionTranslation = useManualSentenceTranslation\(/,
      'The shared hook gives the 3 s window, resets per card and never opens on mount.');
    assert.doesNotMatch(source, /optionTranslation\.open\(\)[^;\n]*(?:choose|handleChoice|onSelect)\(/,
      'Translating never selects or grades a choice.');
  }
  assert.match(screen, /\{showOptionTranslateButton \? <Pressable[\s\S]*?onPress=\{handleOptionTranslatePress\}/);
  assert.match(screen, /optionTranslationsVisible=\{showOptionTranslateButton && optionTranslation\.visible\}/);
  assert.match(screen, /const handleOptionTranslatePress = useCallback\(\(\) => \{[\s\S]*?optionTranslation\.open\(\);[\s\S]*?openSentenceTranslation\(\)/,
    'A question above the photo shows its Spanish too.');
  assert.match(web, /data-option-translate onClick=\{\(\) => \{ help\.interact\(\); optionTranslation\.open\(\); \}\}/);
  assert.match(web, /optionTranslationText\(option, optionTranslationsVisible\)/);
  assert.match(cardView, /optionTranslationText\(option, optionTranslationsVisible\)/);
  assert.match(cardView, /const effectiveTextOptionHeight = optionTranslationReserve \+/,
    'Every tile grows by the same Spanish band, so tiles stay equal and the English keeps its floors.');
});
