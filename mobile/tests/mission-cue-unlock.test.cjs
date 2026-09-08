const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');
const missionSurface = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'MissionGameSurface.tsx'),
  'utf8',
);

function section(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Could not find the start of ${label}.`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Could not find the end of ${label}.`);
  return source.slice(start, end);
}

// A mission clue is roughly one second of audio. The learner must never be left
// on a card whose targets cannot be touched because that clip failed to sound.
test('a mission cue that never plays still hands the scene to the learner', () => {
  const fallback = section(
    lessonScreen,
    'missionCueFallbackTimerRef.current = setTimeout(',
    'COURSE_AUDIO_FALLBACK_MS);',
    'the mission cue fallback timer',
  );

  assert.match(
    fallback,
    /setMissionCueUnavailable\(true\)/,
    'The fallback must surface the replay prompt when a clue does not sound.',
  );
  assert.match(
    fallback,
    /setMissionInteractionReady\(true\)/,
    'The fallback must unlock the scene: a silent clue costs a replay, not the lesson.',
  );
});

test('resolving a mission cue never leaves the scene locked', () => {
  const resolution = section(
    lessonScreen,
    'if (!missionCueAwaitingRef.current) return;',
    '  const advance = useCallback(',
    'the mission cue resolution effect',
  );

  assert.match(
    resolution,
    /setMissionInteractionReady\(true\)/,
    'Resolving a cue must unlock the scene.',
  );
  assert.doesNotMatch(
    resolution,
    /setMissionInteractionReady\(false\)/,
    'A playback error must not strand the learner on an untappable card.',
  );
});

test('short mission cues use a stable dedicated player and status subscription', () => {
  assert.match(
    lessonScreen,
    /const missionCuePlayer = useAudioPlayer\(null,[\s\S]*?const missionCuePlayerStatus = useAudioPlayerStatus\(missionCuePlayer\)/,
    'The mission must observe one stable player instead of swapping the status subscription for every short cue.',
  );
  const request = section(
    lessonScreen,
    'const playMissionCueAt = useCallback(',
    'useEffect(() => {\n    if (!showMissionKickoff',
    'the mission cue request',
  );
  assert.match(request, /await cacheCourseAudioAsset\(cueAsset\)/);
  assert.match(request, /await ensureAudioPreloaded\(source\)/);
  assert.match(request, /missionCuePlayer\.replace\(source\)/);
  assert.match(request, /missionCuePlayer\.play\(\)/);
  assert.doesNotMatch(request, /playAudioSource\(/);

  const resolution = section(
    lessonScreen,
    'if (!missionCueAwaitingRef.current) return;',
    '  const advance = useCallback(',
    'the mission cue resolution effect',
  );
  assert.match(
    resolution,
    /missionCuePlayerStatus/,
    'Mission readiness must be resolved from the dedicated player status.',
  );
});

test('the tap layer is gated only by interaction readiness', () => {
  assert.match(
    missionSurface,
    /pointerEvents=\{disabled \? 'none' : 'box-none'\}/,
    'The scene still gates taps on readiness, so readiness must always resolve.',
  );
  assert.match(
    missionSurface,
    /const disabled = !interactionReady/,
    'Readiness remains the gate that the LessonScreen contract above must satisfy.',
  );
});
