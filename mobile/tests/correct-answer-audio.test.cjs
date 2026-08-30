const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreen = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/LessonScreen.tsx'),
  'utf8',
);
const guardrails = fs.readFileSync(
  path.resolve(__dirname, '../../docs/product/project-guardrails.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.resolve(__dirname, '../scripts/verify-interaction-paths.ps1'),
  'utf8',
);

assert.match(
  lessonScreen,
  /function correctSelectionAudioText[\s\S]*?card\.answer_audio_text\?\.trim\(\)[\s\S]*?selectedOption\?\.label\?\.trim\(\)/,
  'Correct-selection audio must prefer authored answer audio and fall back to the correct option label.',
);

assert.match(
  lessonScreen,
  /const answerText = correctSelectionAudioText\(card\)[\s\S]*?ensureAudioPreloaded\(courseAudioSource\([\s\S]*?answerText/,
  'The correct-answer fallback must preload with the rest of the active card audio.',
);

assert.match(
  lessonScreen,
  /const answerText = correctSelectionAudioText\(currentCard, optionId\)[\s\S]*?playAnswerAfterChime\(answerText\)/,
  'A correct choice must speak the resolved answer after the success chime.',
);

assert.match(
  guardrails,
  /A correct mobile selection must never turn green and then remain silent/,
  'Spoken correct-answer confirmation must remain durable mobile product memory.',
);

assert.match(
  interactionVerifier,
  /node tests\/correct-answer-audio\.test\.cjs/,
  'Preview verification must always run the correct-answer audio guardrail.',
);

console.log('Correct mobile selections speak authored answer audio or the correct option label fallback.');
