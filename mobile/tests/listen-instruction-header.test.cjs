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

const { stripTypeScriptTypes } = require('node:module');
const { listeningChoiceInstruction } = new Function(
  `${stripTypeScriptTypes(instructionSource).replace(/export function /g, 'function ')}; return { listeningChoiceInstruction };`,
)();

const units = new Set(course.map((lesson) => lesson.unit_id));
const standardLessons = course.filter((lesson) => lesson.experience_type !== 'mission');
const listenCards = standardLessons.flatMap((lesson) => (
  lesson.cards.filter((card) => card.stage === 'Listen')
));
const learningPhraseCards = standardLessons.flatMap((lesson) => (
  lesson.cards.filter((card) => card.stage !== 'Listen' && card.prompt.trim())
));

assert.equal(units.size, 7, 'The Listen header guardrail must inventory all seven A1 units.');
assert.ok(listenCards.length > 0, 'The embedded course must contain Listen cards.');
let photoCards = 0;
let phraseCards = 0;
for (const card of listenCards) {
  const photos = card.options.length > 0 && card.options.every((option) => option.image_url);
  const phrases = card.options.length > 0 && card.options.every((option) => !option.image_url);
  assert.ok(photos || phrases, 'Every current Listen bank must have one answer modality.');
  assert.equal(
    listeningChoiceInstruction(card.options),
    photos ? '¡Escucha y elige la foto!' : '¡Escucha y elige la frase!',
  );
  if (photos) photoCards++; else phraseCards++;
}
assert.ok(photoCards > 0 && phraseCards > 0, 'Exercise both photo and phrase choices.');
for (const count of [2, 3, 4]) {
  assert.equal(listeningChoiceInstruction(Array.from({ length: count }, () => ({ image_url: 'photo.webp' }))), '¡Escucha y elige la foto!');
  assert.equal(listeningChoiceInstruction(Array.from({ length: count }, () => ({}))), '¡Escucha y elige la frase!');
}
assert.equal(listeningChoiceInstruction([]), '¡Escucha y elige!');
assert.equal(listeningChoiceInstruction([{ image_url: 'photo.webp' }, {}]), '¡Escucha y elige!');
assert.match(
  screenSource,
  /const localizedPrompt = useMissionInstruction[\s\S]*?\? missionInstruction[\s\S]*?: useCompactListenInstruction[\s\S]*?\? listeningChoiceInstruction\(currentCard\.options\)/,
  'Authored mission directions must take priority without changing standard Listen localization.',
);
assert.match(screenSource, /`Instrucción: \$\{listeningChoiceInstruction\(currentCard\.options\)\}`/);
assert.ok(
  listenCards.every((card) => card.prompt.trim() === 'Listen and choose.'),
  'Every standard-lesson Listen card must use the shared authored instruction contract.',
);
assert.ok(
  learningPhraseCards.some((card) => card.prompt === 'He is a man.'),
  'The guardrail fixture must include a real authored learning phrase.',
);

assert.match(
  instructionSource,
  /\[LISTEN_AND_CHOOSE_PROMPT\]: '¡Escucha y elige!'/,
  'The shared instruction copy must use complete Spanish exclamation punctuation.',
);
assert.match(
  instructionSource,
  /export function usesCompactListenInstruction\(stage: string, prompt: string\)\s*\{\s*return stage === 'Listen' && prompt\.trim\(\) === LISTEN_AND_CHOOSE_PROMPT;/,
  'Compact styling must be selected by stage and authored prompt rather than lesson or card identity.',
);
assert.match(
  instructionSource,
  /const instruction = SPANISH_INSTRUCTION_PROMPTS\[prompt\.trim\(\)\];\s*if \(instruction\) return instruction;\s*if \(!usesSpanishInstructions\(lessonId\)\) return prompt;/,
  'The approved Listen instruction must localize in every unit while other prompts retain existing language behavior.',
);

assert.match(
  screenSource,
  /const useCompactListenInstruction = !useMissionInstruction && usesCompactListenInstruction\(\s*currentCard\?\.stage \?\? '',\s*currentCard\?\.prompt \?\? '',\s*\);/,
  'The screen must apply the shared condition to the current card while preserving authored mission directions.',
);
assert.doesNotMatch(
  screenSource,
  /isLesson11ListenLayoutPrototype|cardIndex === 20|girl-walking.*boy-running/,
  'The approved standard must not retain prototype lesson, position, or image coupling.',
);
assert.match(
  screenSource,
  /const useCompactHeaderInstruction = useMissionInstruction[\s\S]*?\|\| useCompactListenInstruction\s*\|\| useCompactRecognizeInstruction\s*\|\| useCompactSpeakInstruction;[\s\S]*const promptFontSize = useCompactHeaderInstruction\s*\? 14\s*:\s*basePromptFontSize/,
  'Instruction-only Listen prompts must be 14 dp while learning phrases keep the responsive base size.',
);
assert.match(
  screenSource,
  /const promptLineHeight = useCompactHeaderInstruction\s*\? 18\s*:\s*basePromptLineHeight/,
  'Instruction-only Listen prompts must use the compact 18 dp line height.',
);
assert.match(
  screenSource,
  /promptTapTargetPhraseBox:\s*\{\s*paddingHorizontal:\s*44\s*\}/,
  'Replay-button space must be balanced so the instruction is centered across the full header.',
);
assert.match(
  screenSource,
  /contentHeaderCompactInstruction:\s*\{\s*paddingBottom:\s*6,\s*paddingTop:\s*6\s*\}/,
  'Instruction-only Listen headers must keep the approved compact vertical padding.',
);
assert.match(
  screenSource,
  /promptCompactInstruction:\s*\{\s*fontWeight:\s*'900'\s*\}/,
  'The compact Listen instruction must remain bold.',
);
assert.match(
  guardrails,
  /Section instructions in the middle importance box are visual-only Spanish text[\s\S]*Listen uses bold 14 dp `¡Escucha y elige la frase!`[\s\S]*`¡Escucha y elige la foto!`[\s\S]*never from a specific slide/,
  'Durable product memory must define the reusable Listen instruction contract and its scope.',
);
assert.match(
  guardrails,
  /middle importance box shows authored English learning content[\s\S]*Preserve its exact copy and start at the established responsive size/,
  'Durable product memory must protect authored learning phrases from the compact instruction style.',
);
assert.match(
  interactionVerifier,
  /node tests\/listen-instruction-header\.test\.cjs/,
  'Preview interaction verification must run the Listen header guardrail.',
);

console.log(`All ${listenCards.length} standard-lesson Listen cards across seven units use the compact instruction header; authored learning phrases remain unchanged.`);
