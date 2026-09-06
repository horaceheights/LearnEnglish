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

const standardLessons = course.filter((lesson) => lesson.experience_type !== 'mission');
const speakCards = standardLessons.flatMap((lesson) => (
  lesson.cards
    .filter((card) => card.stage === 'Speak')
    .map((card) => ({ card, lessonId: lesson.id }))
));
const affectedLessons = new Set(speakCards.map(({ lessonId }) => lessonId));
const missionSpeakCards = course
  .filter((lesson) => lesson.experience_type === 'mission')
  .flatMap((lesson) => lesson.cards.filter((card) => card.stage === 'Speak'));

assert.equal(speakCards.length, 427, 'The shared Speak instruction guardrail must inventory every standard Speak card.');
assert.equal(affectedLessons.size, 69, 'The shared Speak instruction must cover every standard A1 lesson.');
assert.equal(missionSpeakCards.length, 2, 'The studio mission must exercise its authored Speak directions.');
assert.ok(
  missionSpeakCards.every((card) => card.instruction_es?.trim()),
  'Mission Speak cards need explicit story-aware Spanish directions.',
);
assert.ok(
  speakCards.every(({ card }) => card.prompt.trim()),
  'Speak model phrases must remain authored in the pronunciation card below the header.',
);

assert.match(
  instructionSource,
  /const LISTEN_AND_REPEAT_INSTRUCTION = '¡Escucha y repite!';/,
  'The Speak instruction must use complete Spanish exclamation punctuation.',
);
assert.match(
  instructionSource,
  /export function usesCompactSpeakInstruction\(stage: string\)\s*\{\s*return stage === 'Speak' \|\| stage === 'Pronunciation Practice';/,
  'Compact Speak styling must be selected by the interaction stage, including the legacy stage name.',
);
assert.match(
  instructionSource,
  /export function pronunciationInstruction\(\)\s*\{\s*return LISTEN_AND_REPEAT_INSTRUCTION;/,
  'Every unit must receive the same approved Spanish Speak instruction.',
);
assert.doesNotMatch(
  instructionSource,
  /Ahora escucha y repite\./,
  'The old Speak header sentence must not remain.',
);
assert.match(
  screenSource,
  /const useCompactSpeakInstruction = !useMissionInstruction && usesCompactSpeakInstruction\(currentCard\?\.stage \?\? ''\);/,
  'The screen must derive compact Speak formatting while preserving authored mission directions.',
);
assert.match(
  screenSource,
  /const useCompactHeaderInstruction = useMissionInstruction[\s\S]*?\|\| useCompactListenInstruction\s*\|\| useCompactRecognizeInstruction\s*\|\| useCompactSpeakInstruction;/,
  'Speak must share the approved compact header formatting with Listen and Recognize instructions.',
);
assert.match(
  screenSource,
  /\{useMissionInstruction[\s\S]*?\? renderPrompt\(\)[\s\S]*?: isPronunciation[\s\S]*?\? pronunciationInstruction\(\)[\s\S]*?: renderPrompt\(\)\}/,
  'Mission Speak headers must render authored directions; standard pronunciation headers keep the shared instruction.',
);
assert.match(
  screenSource,
  /const promptFontSize = useCompactHeaderInstruction\s*\? 14/,
  'The Speak instruction must use the approved 14 dp compact size.',
);
assert.doesNotMatch(
  screenSource,
  /isLesson11Speak|cardIndex === 28|The woman.*useCompactSpeakInstruction/,
  'The implementation must not couple the rule to the annotated lesson, card index, model phrase, or image.',
);
assert.match(
  guardrails,
  /Section instructions in the middle importance box are visual-only Spanish text[\s\S]*Speak \(including legacy `Pronunciation Practice`\) uses bold 14 dp `¡Escucha y repite!`/,
  'Durable product memory must define the all-unit compact Speak instruction.',
);
assert.match(
  guardrails,
  /Speak speaker replays the actual English model through the pronunciation lifecycle[\s\S]*cannot conflict with microphone capture/,
  'Durable product memory must protect English replay and the pronunciation lifecycle.',
);
assert.match(
  interactionVerifier,
  /node tests\/speak-instruction-header\.test\.cjs/,
  'Preview interaction verification must run the Speak instruction guardrail.',
);

console.log(`All ${speakCards.length} Speak cards across ${affectedLessons.size} lessons use the compact Spanish instruction.`);
