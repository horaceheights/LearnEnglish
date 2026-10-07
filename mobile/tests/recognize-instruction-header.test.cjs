const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const screenSource = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const instructionSource = fs.readFileSync(
  path.join(mobileRoot, 'src/lessonInstructions.ts'),
  'utf8',
);
const course = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src/generated/a1-course.json'),
  'utf8',
));
const guardrails = fs.readFileSync(
  path.join(repositoryRoot, 'docs/product/project-guardrails.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'),
  'utf8',
);
const vm = require('node:vm');
const ts = require('typescript');
const instructionApi = {};
vm.runInNewContext(ts.transpileModule(instructionSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: instructionApi });
const { lessonHeaderPromptText, listeningChoiceInstruction, usesCompactListenInstruction } = instructionApi;

const emptyRecognizeCards = course.flatMap((lesson) => (
  lesson.experience_type === 'mission' ? [] : lesson.cards
    .filter((card) => card.stage === 'Recognize' && !card.prompt.trim())
    .map((card) => ({ card, lessonId: lesson.id }))
));
const affectedLessons = new Set(emptyRecognizeCards.map(({ lessonId }) => lessonId));

// 174 since the Unit 7 rebuild: its review cards use 4 empty-prompt interactions.
// 181 since the Unit 1 rebuild: lessons 1.4-1.6 each have five sentence-choice cards (was 8 across the old 1.4-1.5).
// 196 since the Unit 2 rebuild: the 40-card extensions add one each and Numbers 1-5 / 6-10 have five each.
assert.equal(
  emptyRecognizeCards.length,
  377, // 2026-10-07 clarification: 12 reverse cards return to the Lesson 1.1 instruction (+12).
  // 2026-10-05: four approved 4.10 day foundations (DR1–DR4) joined the shared empty-prompt choices.
  // 2026-10-03: time questions brought the inventory to 359; approved Unit 4 question/heard cues previously brought it to 362.
  // 2026-09-29: 3.3 replaces five empty prompts with questions and audio-choice instructions.
  // 2026-09-25: the engine-built Unit 3 gives its 12 teaching lessons sentence-choice cards;
  // 2026-09-26: the engine-built Unit 4 does the same for its ten (+30), and Unit 5 for its ten;
  // 2026-09-27: the engine-built Units 6 and 7 for their eight each
  'The standard-lesson Recognize guardrail must inventory every current empty-prompt interaction.',
);
assert.equal(
  affectedLessons.size,
  70, // 2026-10-07: 3.3, 4.8 and the Unit 4 review join the shared Lesson 1.1 instruction.
  // 2026-10-01: rebuilt Unit 4 context cards carry explicit instructions/questions.
  // 3.3 now uses explicit questions and audio-choice instructions instead of an empty prompt.
  // the Unit 1 rebuild adds Lesson 1.5; the Unit 2 rebuild adds 2.4, the new 2.7 and the new 2.10;
  // the Unit 3 rebuild adds its four new lessons and 3.2; the Unit 4 rebuild adds the new 4.8 and 4.10;
  // the Unit 5 rebuild adds the new 5.3 and 5.10
  'The shared rule must cover every standard lesson that contains this interaction.',
);
// Inspect actual presentation, including legacy English control cues that are
// localized before rendering. Audio may contain the English learning question,
// but must never contain the task instruction.
const englishInstructionPattern = /^(choose|select|pick|find|tap|listen)\b/i;
assert.ok(englishInstructionPattern.test('Listen and choose.'),
  'The instruction matcher must actually recognize its positive fixture.');
const containsEnglishInstruction = (displayedPrompt, audioText) => [displayedPrompt, audioText ?? '']
  .some(text => englishInstructionPattern.test(text.trim()));
assert.ok(containsEnglishInstruction('¡Escucha y elige la frase!', 'Listen and choose.'),
  'A Spanish header must not hide an English instruction in the audio.');
assert.ok(!containsEnglishInstruction('¡Escucha y elige la frase!', 'What time is it?'),
  'The English learning question remains valid audio.');
const englishInstructions = course.flatMap((lesson) => lesson.cards
  .filter((card) => {
    if (card.stage !== 'Recognize') return false;
    const displayedPrompt = usesCompactListenInstruction(card.stage, card.prompt)
      ? listeningChoiceInstruction(card.options)
      : lessonHeaderPromptText(lesson.id, card.stage, card.prompt, card.options);
    return containsEnglishInstruction(displayedPrompt, card.audio_text);
  })
  .map((card) => `${lesson.id} ${card.slide_id}`));
assert.deepEqual(englishInstructions, [], 'Recognize cards must not show or speak an English instruction.');
assert.deepEqual(
  emptyRecognizeCards.filter(({ lessonId }) => lessonId === 'lesson-4-what-time-is-it')
    .map(({ card }) => card.slide_id),
  ['DR1', 'DR2', 'DR3', 'DR4', 'R1'],
  'Day foundations and the pictured time question use the shared phrase-choice instruction.',
);
assert.deepEqual(
  emptyRecognizeCards.filter(({ card }) => card.audio_text?.trim()).map(({ card, lessonId }) => `${lessonId} ${card.slide_id}`),
  [
    // 5.9 R7 left this list with the Unit 5 rebuild; its reply choice became a text bank,
    // 6.7 R7/R8 left with the Unit 6 rebuild, whose exchanges show their own prompt picture,
    // and 7.7 R6/R7 left with the Unit 7 rebuild for the same reason. No reply card remains.
  ],
  'Only reply choices keep a heard English line, and the speaker can replay it before the choice.',
);
assert.deepEqual(
  emptyRecognizeCards.filter(({ lessonId }) => lessonId === 'lesson-2-9-unit-2-review').map(({ card }) => card.slide_id),
  ['R4', 'R7', 'R8'],
  'The three revised review choices use the shared instruction instead of spoken meta-English.',
);
assert.deepEqual(
  emptyRecognizeCards.filter(({ lessonId }) => lessonId === 'lesson-3-9-unit-3-review').map(({ card }) => card.slide_id),
  ['R7', 'R8', 'R9'],
  'The Unit 3 review uses the shared instruction for its three scene-to-phrase choices (R9 added 2026-09-25).',
);
assert.ok(
  emptyRecognizeCards.every(({ card }) => (
    card.options.length >= 2
    && card.options.every((option) => option.label?.trim())
  )),
  'Empty-prompt Recognize cards must remain phrase-choice interactions.',
);

assert.match(
  instructionSource,
  /const CHOOSE_CORRECT_PHRASE_INSTRUCTION = '¡Elige la frase que corresponde a la imagen!';/,
  'The instruction must use complete Spanish exclamation punctuation.',
);
assert.match(
  instructionSource,
  /const CHOOSE_CORRECT_WORD_INSTRUCTION = '¡Elige la palabra que corresponde a la imagen!';/,
  'Single-word choices ask for the word, with complete Spanish punctuation.',
);
assert.match(
  instructionSource,
  /export function usesCompactRecognizeInstruction\(stage: string, prompt: string\)\s*\{\s*return stage === 'Recognize' && !prompt\.trim\(\);/,
  'The rule must be selected by Recognize plus an empty authored prompt.',
);
assert.match(
  instructionSource,
  /export function recognizeChoiceInstruction[\s\S]*CHOOSE_CORRECT_WORD_INSTRUCTION[\s\S]*CHOOSE_CORRECT_PHRASE_INSTRUCTION[\s\S]*export function lessonHeaderPromptText\(\s*lessonId: string,\s*stage: string,\s*prompt: string,[\s\S]*usesCompactRecognizeInstruction\(stage, prompt\)\) return recognizeChoiceInstruction\(options\)/,
  'The shared header copy resolver must fill the otherwise empty third line.',
);
assert.match(
  screenSource,
  /const useCompactRecognizeInstruction = usesCompactRecognizeInstruction\(\s*currentCard\?\.stage \?\? '',\s*currentCard\?\.prompt \?\? '',\s*\);/,
  'The lesson screen must apply the reusable Recognize condition to the current card.',
);
assert.match(
  screenSource,
  /styles\.contentHeaderPhraseBox[\s\S]*?\{isPronunciation[\s\S]*?pronunciationInstruction\(\)[\s\S]*?: renderPrompt\(\)\}/,
  'An empty Recognize prompt must render its instruction in the shared importance box.',
);
assert.match(
  screenSource,
  /lessonHeaderPromptText\(lesson\.id, currentCard\.stage, displayedPrompt, currentCard\.options\)/,
  'The rendered third line must use the shared header copy resolver.',
);
assert.match(
  screenSource,
  /const promptFontSize = useCompactHeaderInstruction\s*\? 14/,
  'The Recognize instruction must share the approved 14 dp compact size.',
);
assert.match(
  screenSource,
  /accessibilityRole=\{useCompactHeaderInstruction \? 'text' : 'button'\}/,
  'The visual Recognize instruction must not expose a disabled replay button role.',
);
assert.match(
  screenSource,
  /accessibilityActions=\{useCompactHeaderInstruction\s*\? \[\]\s*:/,
  'The visual Recognize instruction must not advertise unavailable replay or translation actions.',
);
assert.doesNotMatch(
  screenSource,
  /isLesson11Recognize|cardIndex === 16|The man is sitting.*useCompactRecognizeInstruction/,
  'The implementation must not couple the rule to the annotated lesson, card index, or choices.',
);
assert.match(
  guardrails,
  /Recognize with an empty authored prompt uses semibold 14 dp `¡Elige la frase que corresponde a la imagen!`[\s\S]*never from a specific slide/,
  'Durable product memory must define the reusable Recognize instruction contract.',
);
assert.match(
  guardrails,
  /keep the speaker visible but disabled before a correct selection[\s\S]*enable it to replay the selected correct English sentence/,
  'Durable product memory must preserve gated English replay without speaking the visual instruction.',
);
assert.match(
  interactionVerifier,
  /node tests\/recognize-instruction-header\.test\.cjs/,
  'Preview interaction verification must run the Recognize instruction guardrail.',
);

console.log(`All ${emptyRecognizeCards.length} empty-prompt Recognize cards across ${affectedLessons.size} lessons show the compact Spanish instruction.`);
