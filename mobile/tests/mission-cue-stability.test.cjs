const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const lessonScreen = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
);

// The mission clue is started by an effect that depends on playMissionCueAt.
// If any value that callback depends on is rebuilt during render, the callback
// is rebuilt too, the effect re-runs, and the clue restarts on every pass:
// the audio player is swapped before a one-second clip can be heard and the
// fallback that would hand the scene back is rearmed before it can fire. The
// card then sits silent and untouchable, which is exactly what shipped.
test('audio turn sequences are not rebuilt during render', () => {
  const declarations = [...lessonScreen.matchAll(
    /^ {2}const (\w+) = ([\s\S]*?);$/gmu,
  )].filter(([, , body]) => body.includes('findCourseAudioTurnSequence('));

  assert.ok(
    declarations.length > 0,
    'Expected at least one render-scope audio turn sequence to guard.',
  );

  for (const [, name, body] of declarations) {
    assert.match(
      body,
      /useMemo\(/u,
      `${name} rebuilds its array on every render. Wrap it in useMemo, or every `
      + 'callback that depends on it restarts the mission clue in a loop.',
    );
  }
});

test('the mission clue callback keeps its declared dependencies', () => {
  const deps = lessonScreen.match(
    /\}, \[missionCueAsset, playAudioSource, promptTurnSequence, replayPrompt, stopMissionSound\]\);/u,
  );
  assert.ok(
    deps,
    'playMissionCueAt no longer declares the expected dependencies; re-check that '
    + 'each one is stable across renders before changing this list.',
  );
});

test('the clue effect still restarts only when the card or callback changes', () => {
  assert.match(
    lessonScreen,
    /const timer = setTimeout\(\(\) => playMissionCueAt\(0\), 180\);/u,
    'The mission clue is expected to start from a short timer after the card settles.',
  );
});
