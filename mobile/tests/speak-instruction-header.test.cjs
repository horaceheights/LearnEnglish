const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');

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

const speakCards = course.flatMap((lesson) => (
  lesson.cards
    .filter((card) => card.stage === 'Speak')
    .map((card) => ({ card, lessonId: lesson.id }))
));
const affectedLessons = new Set(speakCards.map(({ lessonId }) => lessonId));

// 424 since the Unit 1 rebuild: three family lessons of seven Speak cards replace two, and Who Is He? keeps seven.
assert.equal(speakCards.length, 424, 'The Speak inventory includes four rebuilt Unit 2, Unit 3, Unit 4, Unit 5, Unit 6 and Unit 7 mission gates each, plus the 3.3 current-action exchange and the rebuilt Unit 1 family lessons.');
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-2-10-around-me-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-3-10-introduction-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-4-10-my-day-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-5-10-cafe-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-6-10-town-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-7-10-a1-final-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-3-3-am-is-and-are').length, 7);
assert.equal(affectedLessons.size, courseContract.lessonCount, 'The shared Speak instruction must cover every A1 lesson.');
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
  /const useCompactSpeakInstruction = usesCompactSpeakInstruction\(currentCard\?\.stage \?\? ''\);/,
  'The screen must derive compact Speak formatting from the current interaction.',
);
assert.match(
  screenSource,
  /const useCompactHeaderInstruction = useCompactListenInstruction\s*\|\| useCompactRecognizeInstruction\s*\|\| useCompactSpeakInstruction;/,
  'Speak must share the approved compact header formatting with Listen and Recognize instructions.',
);
assert.match(
  screenSource,
  /\{isPronunciation[\s\S]*?currentCard\.mission_game\?\.instruction_es \|\| pronunciationInstruction\(\)[\s\S]*?: renderPrompt\(\)\}/,
  'Standard pronunciation headers use the shared instruction while missions use their exact authored action.',
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
