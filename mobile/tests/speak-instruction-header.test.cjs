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
// 439 since the Unit 2 rebuild: the 40-card extensions and the new 2.7 Numbers 6-10 add 15 Speak cards.
// 447 since 2026-09-24: the new 2.10 These and Those adds eight Speak cards.
// 492 since 2026-09-25: the engine-built Unit 3 (four new lessons, 40-42 cards each) and its
// fifth mission gate add 45 Speak cards.
// 530 since 2026-09-26: the engine-built Unit 4 (ten 42-card teaching lessons, two of them new) and
// its 54-card review add 38 Speak cards (58 -> 96 in the unit).
// 570 since 2026-09-26: the engine-built Unit 5 (ten 42-card teaching lessons, two of them new) and
// its 54-card review.
// 595 since 2026-09-27: the engine-built Unit 6 (nine Speak cards in each teaching lesson, one more in the review).
// 618 since 2026-09-27: the engine-built Unit 7 (8-9 Speak cards in each teaching lesson, one more in the review).
// 2026-09-29: 3.3 uses eight alternating questions and answers instead of nine old drills.
// 2026-10-03: 4.10 uses eight time-exchange cards instead of nine routine drills.
// 2026-10-05: four day foundations precede the preserved eight time-exchange cards in 4.10.
// 2026-10-08: revised Unit 5 pacing and nine mission gates add two net Speak cards.
assert.equal(speakCards.length, 624, 'The Speak inventory preserves every lesson and the revised Unit 5 mission gates.');
const timeSpeakCards = speakCards.filter(({ lessonId }) => lessonId === 'lesson-4-what-time-is-it');
assert.equal(timeSpeakCards.length, 12);
assert.deepEqual(
  timeSpeakCards.slice(0, 4).map(({ card }) => [card.slide_id, card.prompt]),
  [
    ['DS1', 'It is morning.'],
    ['DS2', 'It is afternoon.'],
    ['DS3', 'It is evening.'],
    ['DS4', 'It is night.'],
  ],
  'Clock-free day foundations precede the existing time-exchange pronunciation models.',
);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-2-10-around-me-mission').length, 4);
// The Unit 3 mission gained a fifth gate, Is it yours?, on 2026-09-25.
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-3-10-introduction-mission').length, 5);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-4-10-my-day-mission').length, 9);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-5-10-cafe-mission').length, 9);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-6-10-town-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-7-10-a1-final-mission').length, 4);
assert.equal(speakCards.filter(({ lessonId }) => lessonId === 'lesson-3-3-am-is-and-are').length, 8);
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
  /Section instructions in the middle importance box are visual-only Spanish text[\s\S]*Speak \(including legacy `Pronunciation Practice`\) uses semibold 14 dp `¡Escucha y repite!`/,
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
