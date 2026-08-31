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
  lessonScreenSource,
  /preloadPronunciationAudioWithRetry\([\s\S]*?\(\) => preloadCardAudio\(currentCard\)[\s\S]*?2/,
  'Every Speak card must finish its model-audio preload with one retry before mounting.',
);
assert.match(
  lessonScreenSource,
  /isPronunciation && !isPronunciationAudioReady[\s\S]*?<PlayfulLoading[\s\S]*?: <LessonCardView/,
  'Pronunciation must remain behind the audio-ready gate while a Speak clip is cold.',
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
  pronunciationSource,
  /const allSyllablesRecognized = expectedSyllables\.every[\s\S]*?void finishNativeCapture\(\)/,
  'All visibly recognized syllables must independently finish the live capture.',
);
assert.match(
  pronunciationSource,
  /setPhase\('checking'\);\s+setMessage\('Un momento…'\);[\s\S]*?withTimeout\(\s*stopNativeSpeech\(\),\s*NATIVE_CAPTURE_STOP_TIMEOUT_MS/,
  'Native capture finalization must leave the listening state immediately and use a bounded wait.',
);
assert.match(
  pronunciationSource,
  /pronunciation_capture_finalize_timeout[\s\S]*?La grabación tardó demasiado en finalizar\. Toca Reintentar\./,
  'A native stop timeout must recover to a learner-facing retry instead of hanging.',
);
assert.match(
  pronunciationSource,
  /phase !== 'success'[\s\S]*?pronunciation_success_advance_timeout[\s\S]*?onPassed\(passedOnFirstTry\)[\s\S]*?SUCCESS_ADVANCE_WATCHDOG_MS/,
  'A successful grade must have an independent deadline when optional recording playback stalls.',
);
assert.match(
  lessonScreenSource,
  /const pronunciationPassed = useCallback[\s\S]*?pronunciation_passed[\s\S]*?if \(qaMode && !qaAutoAdvance\)[\s\S]*?advance\(\);/,
  'The production pass callback must advance directly instead of relying on a second result effect.',
);
assert.match(
  lessonScreenSource,
  /if \(isPronunciation\) return;\s+setCardRunId/,
  'Pronunciation must recover internally instead of being remounted on foreground.',
);
assert.match(
  lessonScreenSource,
  /Image\.prefetch\(url\)/,
  'Lesson images must be prefetched before upcoming cards render.',
);
assert.match(
  lessonScreenSource,
  /preloadCardAudio\(lesson\.cards\[index\]\);\s+void preloadCardImages\(lesson\.cards\[index\]\)/,
  'The active and upcoming-card preload loop must include both audio and images.',
);

console.log('Pronunciation lifecycle checks passed.');
