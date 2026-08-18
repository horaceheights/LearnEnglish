const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pronunciationPath = path.resolve(__dirname, '../src/components/PronunciationPractice.tsx');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const pronunciationSource = fs.readFileSync(pronunciationPath, 'utf8');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

assert.match(
  pronunciationSource,
  /const playModelEvent = useEffectEvent\(playModel\)/,
  'Phrase startup must use an Effect Event for the latest model callback.',
);
assert.match(
  pronunciationSource,
  /playModelEvent\(runId\)/,
  'Phrase startup must call the model Effect Event.',
);
assert.doesNotMatch(
  pronunciationSource,
  /\[discardNativeRecording, phrase, playModel\]/,
  'Changing model-player callbacks must not restart the current phrase.',
);
assert.match(
  pronunciationSource,
  /permissionRequestInFlightRef\.current \|\| appInterruptionHandledRef\.current/,
  'The microphone permission dialog must not be treated as a lesson interruption.',
);
assert.match(
  lessonScreenSource,
  /if \(isPronunciation\) return;\s+setCardRunId/,
  'Pronunciation must recover internally instead of being remounted on foreground.',
);

console.log('Pronunciation lifecycle checks passed.');
