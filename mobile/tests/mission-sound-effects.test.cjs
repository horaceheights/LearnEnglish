const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const soundEffects = fs.readFileSync(
  path.join(mobileRoot, 'src', 'missionSoundEffects.ts'),
  'utf8',
);
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
);
const cardView = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'LessonCardView.tsx'),
  'utf8',
);
const missionBoard = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'MissionTileBoard.tsx'),
  'utf8',
);
const missionKickoff = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'MissionKickoff.tsx'),
  'utf8',
);
const pronunciationPractice = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'PronunciationPractice.tsx'),
  'utf8',
);
const feedbackSurvey = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'LessonFeedbackSurvey.tsx'),
  'utf8',
);
function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

const expectedFiles = [
  'tile-place-v1.mp3',
  'page-restored-v1.mp3',
  'page-turn-v1.mp3',
  'voice-stamp-v1.mp3',
  'mission-finale-v1.mp3',
  'try-again-v1.mp3',
];

test('mission cues are versioned bundled assets with no runtime generation path', () => {
  expectedFiles.forEach((filename) => {
    assert.match(soundEffects, new RegExp(`require\\('../assets/sfx/${filename.replace('.', '\\.')}\\'\\)`));
  });
  assert.doesNotMatch(soundEffects, /https?:\/\//);
  assert.doesNotMatch(soundEffects, /fetch\(|generate|ElevenLabs|textToSpeech/i);
});

test('every global feedback and recording cue uses the reviewed static replacements', () => {
  assert.match(lessonScreen, /SUCCESS_CHIME = require\('\.\.\/\.\.\/assets\/sfx\/page-restored-v1\.mp3'\)/);
  assert.match(lessonScreen, /TRY_AGAIN_CUE = require\('\.\.\/\.\.\/assets\/sfx\/try-again-v1\.mp3'\)/);
  assert.match(pronunciationPractice, /READY_CUE = require\('\.\.\/\.\.\/assets\/sfx\/ready-cue-v2\.mp3'\)/);
  assert.match(pronunciationPractice, /SUCCESS_CHIME = require\('\.\.\/\.\.\/assets\/sfx\/page-restored-v1\.mp3'\)/);
  assert.match(feedbackSurvey, /READY_CUE = require\('\.\.\/\.\.\/assets\/sfx\/ready-cue-v2\.mp3'\)/);
  assert.match(feedbackSurvey, /useAudioPlayer\(READY_CUE,[\s\S]*?downloadFirst: true/);

  const activeAudioSource = sourceFiles(path.join(mobileRoot, 'src'))
    .map((filename) => fs.readFileSync(filename, 'utf8'))
    .join('\n');
  assert.doesNotMatch(activeAudioSource, /success-chime\.wav|try-again\.wav|ready-cue\.wav|READY_CUE_URL/);
});

test('one reduced-stimulation-aware player debounces and replaces cues', () => {
  assert.equal(
    (soundEffects.match(/createAudioPlayer\(/g) || []).length,
    1,
    'Mission effects must share one player so cues cannot overlap.',
  );
  assert.match(soundEffects, /previous\?\.event === event[\s\S]*?SAME_EVENT_DEBOUNCE_MS/);
  assert.match(soundEffects, /reducedStimulation[\s\S]*?AppState\.currentState !== 'active'/);
  assert.match(soundEffects, /setAudioModeAsync\(\{[\s\S]*?playsInSilentMode: false/);
  assert.match(soundEffects, /'tile-place': 0\.4/);
  assert.match(soundEffects, /'page-restored': 0\.4/);
  assert.match(soundEffects, /'page-turn': 0\.35/);
  assert.match(soundEffects, /'voice-stamp': 0\.38/);
  assert.match(soundEffects, /'mission-finale': 0\.46/);
  assert.match(soundEffects, /'try-again': 0\.35/);
  assert.match(soundEffects, /player\.volume = MISSION_SOUND_VOLUMES\[event\]/);
  assert.match(soundEffects, /stop\(\);[\s\S]*?player\.replace\(source\);[\s\S]*?player\.play\(\)/);
});

test('global decorative cues honor silent mode with fatigue-safe volumes', () => {
  assert.match(lessonScreen, /SUCCESS_CHIME_VOLUME = 0\.4/);
  assert.match(lessonScreen, /TRY_AGAIN_CUE_VOLUME = 0\.35/);
  assert.match(lessonScreen, /playSuccessChime[\s\S]*?playsInSilentMode: false[\s\S]*?successChimePlayer\.volume = SUCCESS_CHIME_VOLUME/);
  assert.match(lessonScreen, /playTryAgainCue[\s\S]*?playsInSilentMode: false[\s\S]*?tryAgainCuePlayer\.volume = TRY_AGAIN_CUE_VOLUME/);
  assert.match(pronunciationPractice, /READY_CUE_VOLUME = 0\.38/);
  assert.match(pronunciationPractice, /SUCCESS_CHIME_VOLUME = 0\.4/);
  assert.match(pronunciationPractice, /const playReadyCueAndWait[\s\S]*?cuePlayer\.volume = READY_CUE_VOLUME/);
  assert.match(pronunciationPractice, /Keep the ready cue in a playback-only session[\s\S]*?allowsRecording: false, playsInSilentMode: false/);
  assert.match(pronunciationPractice, /phase !== 'success'[\s\S]*?playsInSilentMode: false[\s\S]*?successChimePlayer\.volume = SUCCESS_CHIME_VOLUME/);
  assert.match(feedbackSurvey, /READY_CUE_VOLUME = 0\.38/);
  assert.match(feedbackSurvey, /allowsRecording: false, playsInSilentMode: false[\s\S]*?cuePlayer\.volume = READY_CUE_VOLUME/);

  // Spoken model/answer audio and learner recording playback retain their
  // established audible-in-silent-mode routing.
  assert.match(lessonScreen, /const playAudioSequence[\s\S]*?playsInSilentMode: true/);
  assert.match(lessonScreen, /const playAudioSource[\s\S]*?playsInSilentMode: true/);
  assert.match(pronunciationPractice, /const playAttemptRecording[\s\S]*?playsInSilentMode: true/);
  assert.match(pronunciationPractice, /const playModelEvent[\s\S]*?playsInSilentMode: true/);
});

test('mission semantics are metadata-driven and retain visible equivalents', () => {
  assert.match(lessonScreen, /enabled: missionExperience/);
  assert.match(lessonScreen, /reducedStimulation: reduceMotion/);
  assert.match(lessonScreen, /edit === 'place' \|\| edit === 'move'[\s\S]*?playMissionSound\('tile-place'\)/);
  assert.match(lessonScreen, /onTutorialTilePlaced=\{\(\) => playMissionSound\('tile-place'\)\}/);
  assert.match(lessonScreen, /completeMissionTutorial[\s\S]*?playMissionSound\('page-restored'\)/);
  assert.match(lessonScreen, /playMissionSound\(missionSuccessSoundEvent\(currentCard\)\)/);
  assert.match(lessonScreen, /playMissionSound\('try-again'\)/);
  assert.match(lessonScreen, /playMissionSound\('page-turn'\)/);
  assert.match(lessonScreen, /isComplete && missionExperience[\s\S]*?playMissionSound\('mission-finale'\)/);
  assert.match(soundEffects, /card\.stage === 'Speak'[\s\S]*?'voice-stamp'[\s\S]*?'page-restored'/);
  assert.doesNotMatch(soundEffects, /lesson-10-family-mission/);
  assert.match(missionBoard, /accessibilityLiveRegion="polite"/);
  assert.match(missionKickoff, /accessibilityLiveRegion="polite"/);
  assert.match(cardView, /result === 'correct'[\s\S]*?Inténtalo de nuevo/);
});
