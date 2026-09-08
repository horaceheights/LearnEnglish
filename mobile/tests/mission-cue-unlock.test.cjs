const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
);
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
    '}, [courseAudioPlaybackStatus.didJustFinish',
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

// Playback starts before React re-subscribes the status hook to the freshly
// created player, so a one-second clue can finish unobserved. The unlock must
// not depend on having caught `playing` in flight.
test('a finish is accepted even when the playing window was missed', () => {
  assert.match(
    lessonScreen,
    /const MISSION_CUE_SETTLE_MS = \d+;/,
    'A settle window must exist so a later finish can be attributed to this cue.',
  );
  assert.match(
    lessonScreen,
    /missionCueArmedAtRef/,
    'The cue request must be timestamped to make the settle window measurable.',
  );

  const resolution = section(
    lessonScreen,
    'if (!missionCueAwaitingRef.current) return;',
    '}, [courseAudioPlaybackStatus.didJustFinish',
    'the mission cue resolution effect',
  );
  assert.match(
    resolution,
    /MISSION_CUE_SETTLE_MS/,
    'Cue resolution must allow a finish that arrives after the player swap settles.',
  );
  assert.doesNotMatch(
    resolution,
    /!courseAudioPlaybackStatus\.didJustFinish \|\| !missionCueWasPlayingRef\.current/,
    'Requiring an observed `playing` window strands short clues permanently.',
  );
});

test('the tap layer is gated only by interaction readiness', () => {
  assert.match(
    missionSurface,
    /pointerEvents=\{disabled \? 'none' : 'auto'\}/,
    'The scene still gates taps on readiness, so readiness must always resolve.',
  );
  assert.match(
    missionSurface,
    /const disabled = !interactionReady/,
    'Readiness remains the gate that the LessonScreen contract above must satisfy.',
  );
});
