const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cacheSource = fs.readFileSync(path.resolve(__dirname, '../src/lessonAudioCache.ts'), 'utf8');
const lessonScreenSource = fs.readFileSync(path.resolve(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
const lessonCardViewSource = fs.readFileSync(path.resolve(__dirname, '../src/components/LessonCardView.tsx'), 'utf8');
const pronunciationSource = fs.readFileSync(path.resolve(__dirname, '../src/components/PronunciationPractice.tsx'), 'utf8');

assert.match(
  cacheSource,
  /lesson\.cards\.flatMap\(\(card\) => card\.audio_assets\)/,
  'The silent cache must plan every immutable audio asset in the lesson.',
);
assert.match(
  cacheSource,
  /File\.downloadFileAsync\([\s\S]*?partialDestination[\s\S]*?idempotent: true[\s\S]*?await downloaded\.move\(destination, \{ overwrite: true \}\)/,
  'Downloads must use a disposable partial file before becoming playable cache entries.',
);
assert.match(
  cacheSource,
  /Promise\.all\(Array\.from\(\{ length: workerCount \}, worker\)\)/,
  'Whole-lesson audio preparation must use bounded concurrent workers.',
);
assert.match(
  lessonScreenSource,
  /if \(!lesson \|\| isOffline\) return undefined;[\s\S]*?void cacheLessonAudio\(lesson\)/,
  'Starting an online lesson must silently prepare its complete audio set.',
);
assert.match(
  lessonScreenSource,
  /isOffline && isRemoteAudioSource\(source\)[\s\S]*?audio_preload_skipped_offline_cache_miss[\s\S]*?Promise\.resolve\(false\)/,
  'Offline playback may reject an uncached remote URL, but must not reject local file sources.',
);
assert.match(
  lessonScreenSource,
  /\|\| currentCardAudioCached[\s\S]*?\) return;/,
  'The non-pronunciation recovery path must leave fully cached card audio playing normally.',
);

assert.match(
  lessonScreenSource,
  /!isPronunciation[\s\S]*?offlinePronunciationPromptedRef\.current[\s\S]*?Alert\.alert\(\s*'Advertencia'/,
  'The connection warning must be gated to Speak/pronunciation cards.',
);
assert.match(
  lessonScreenSource,
  /'Tu conexión se perdió\. Continuaremos sin calificación de pronunciación; solo podrás escuchar tu respuesta\.'/,
  'The warning must explain the exact offline pronunciation behavior.',
);
assert.match(lessonScreenSource, /style: 'destructive', text: 'Salir'/);
assert.match(lessonScreenSource, /text: 'Continuar'/);
assert.match(lessonScreenSource, /\{ cancelable: false \}/);
assert.match(
  lessonScreenSource,
  /offlinePronunciationPracticeEnabled=\{isOffline && offlinePronunciationAccepted\}/,
  'Offline recording must start only after the learner chooses Continuar.',
);
assert.match(
  lessonCardViewSource,
  /offlinePracticeEnabled=\{offlinePronunciationPracticeEnabled\}/,
  'The lesson card must pass the accepted offline mode into pronunciation.',
);

assert.match(
  pronunciationSource,
  /if \(isOffline && !offlinePracticeEnabled\) \{[\s\S]*?showUnavailableState\(\)/,
  'Pronunciation must remain network-gated until offline practice is accepted.',
);
assert.match(
  pronunciationSource,
  /nativeStreamingAvailable && !offlinePracticeEnabled[\s\S]*?getPronunciationStreamingToken\(\)/,
  'Accepted offline practice must use the local recorder without requesting a streaming token.',
);
const finishCaptureStart = pronunciationSource.indexOf('const finishCapture = useCallback');
const startListeningStart = pronunciationSource.indexOf('const startListening = useCallback');
const finishCaptureSource = pronunciationSource.slice(finishCaptureStart, startListeningStart);
const offlineReviewStart = finishCaptureSource.indexOf('if (offlinePracticeEnabled)');
const scoringStart = finishCaptureSource.indexOf('const nextResult = await scorePronunciation');
assert.ok(offlineReviewStart >= 0 && scoringStart > offlineReviewStart);
const offlineReviewSource = finishCaptureSource.slice(offlineReviewStart, scoringStart);
assert.match(offlineReviewSource, /setMessage\('Escucha tu respuesta\.'\)/);
assert.match(offlineReviewSource, /await playAttemptRecording\(recordingUri, runId\)/);
assert.match(offlineReviewSource, /onUnavailable\(\);\s*return;/);
assert.doesNotMatch(offlineReviewSource, /scorePronunciation|setResult\(nextResult\)|onAttempted/);

const unavailableCallbackStart = lessonScreenSource.indexOf('const pronunciationUnavailable = useCallback');
const unavailableCallbackEnd = lessonScreenSource.indexOf('const grammarAnimationComplete', unavailableCallbackStart);
const unavailableCallbackSource = lessonScreenSource.slice(unavailableCallbackStart, unavailableCallbackEnd);
assert.match(unavailableCallbackSource, /registerCardCompletion\(completedCardsRef\.current, cardIndex, false\)/);
assert.match(unavailableCallbackSource, /advance\(\);/);

assert.match(
  lessonScreenSource,
  /'Sin conexión',[\s\S]*?'Terminaste la lección\. Tu progreso está guardado en este dispositivo\. Revisa tu conexión a internet para sincronizarlo\.'/,
  'Offline lesson completion must confirm local saving and ask the learner to check internet.',
);

console.log('Offline lesson media and pronunciation fallback guardrails passed.');
