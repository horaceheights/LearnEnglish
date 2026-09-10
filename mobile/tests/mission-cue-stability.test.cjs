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
// the audio player subscription changes before a one-second clip can be heard and the
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

// Anything that builds a fresh array or object during render hands its consumer
// a new identity every pass. Pinning the exact dependency list would only break
// on honest edits, so check the property that actually matters: whatever
// playMissionCueAt depends on has to survive a render unchanged.
const BUILDS_A_FRESH_VALUE = [
  /findCourseAudioTurnSequence\(/u,
  /findCourseAudioTurnSequences\(/u,
  /\.map\(/u,
  /\.filter\(/u,
  /\.flatMap\(/u,
  /\.concat\(/u,
  /\.slice\(/u,
  /=\s*\[/u,
];

function renderScopeDeclaration(name) {
  const match = lessonScreen.match(
    new RegExp(String.raw`^ {2}const ${name} = ([\s\S]*?);$`, 'mu'),
  );
  return match ? match[1] : null;
}

test('every mission clue dependency survives a render unchanged', () => {
  const declaration = lessonScreen.match(
    /const playMissionCueAt = useCallback\(([\s\S]*?)\}, \[([^\]]*)\]\);/u,
  );
  assert.ok(declaration, 'Could not find playMissionCueAt and its dependency list.');

  const dependencies = declaration[2]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  assert.ok(dependencies.length > 0, 'playMissionCueAt declares no dependencies.');

  for (const dependency of dependencies) {
    const body = renderScopeDeclaration(dependency);
    // Destructured hook results and imports have no render-scope const of their
    // own; a hook call is stable by construction.
    if (!body || /^use[A-Z]/u.test(body.trim())) continue;

    const rebuilds = BUILDS_A_FRESH_VALUE.some((pattern) => pattern.test(body));
    if (!rebuilds) continue;

    assert.match(
      body,
      /useMemo\(|useCallback\(/u,
      `${dependency} builds a new value during render, so playMissionCueAt is `
      + 'rebuilt every pass and the effect restarts the clue in a loop. Memoise it.',
    );
  }
});

test('the clue effect still restarts only when the card or callback changes', () => {
  assert.match(
    lessonScreen,
    /const timer = setTimeout\(\(\) => playMissionCueAt\(0\), 180\);/u,
    'The mission clue is expected to start from a short timer after the card settles.',
  );
});
