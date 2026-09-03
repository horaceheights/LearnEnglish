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

const emptyRecognizeCards = course.flatMap((lesson) => (
  lesson.cards
    .filter((card) => card.stage === 'Recognize' && !card.prompt.trim())
    .map((card) => ({ card, lessonId: lesson.id }))
));
const affectedLessons = new Set(emptyRecognizeCards.map(({ lessonId }) => lessonId));

assert.equal(
  emptyRecognizeCards.length,
  35,
  'The Recognize instruction guardrail must inventory every current empty-prompt interaction.',
);
assert.equal(
  affectedLessons.size,
  8,
  'The shared rule must cover all eight lessons that currently contain this interaction.',
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
  /const CHOOSE_CORRECT_PHRASE_INSTRUCTION = '¡Elige la frase correcta!';/,
  'The instruction must use complete Spanish exclamation punctuation.',
);
assert.match(
  instructionSource,
  /export function usesCompactRecognizeInstruction\(stage: string, prompt: string\)\s*\{\s*return stage === 'Recognize' && !prompt\.trim\(\);/,
  'The rule must be selected by Recognize plus an empty authored prompt.',
);
assert.match(
  instructionSource,
  /export function lessonHeaderPromptText\(lessonId: string, stage: string, prompt: string\)[\s\S]*usesCompactRecognizeInstruction\(stage, prompt\)[\s\S]*CHOOSE_CORRECT_PHRASE_INSTRUCTION/,
  'The shared header copy resolver must fill the otherwise empty third line.',
);
assert.match(
  screenSource,
  /const useCompactRecognizeInstruction = usesCompactRecognizeInstruction\(\s*currentCard\?\.stage \?\? '',\s*currentCard\?\.prompt \?\? '',\s*\);/,
  'The lesson screen must apply the reusable Recognize condition to the current card.',
);
assert.match(
  screenSource,
  /styles\.contentHeaderPhraseBox[\s\S]*?\{isPronunciation \? pronunciationInstruction\(\) : renderPrompt\(\)\}/,
  'An empty Recognize prompt must render its instruction in the shared importance box.',
);
assert.match(
  screenSource,
  /lessonHeaderPromptText\(lesson\.id, currentCard\.stage, displayedPrompt\)/,
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
  /Recognize with an empty authored prompt uses bold 14 dp `¡Elige la frase correcta!`[\s\S]*never from a specific slide/,
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
