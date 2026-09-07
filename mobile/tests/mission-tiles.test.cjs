const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const surface = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionGameSurface.tsx'), 'utf8');
const kickoff = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionKickoff.tsx'), 'utf8');
const lessonScreen = fs.readFileSync(path.join(mobileRoot, 'src/screens/LessonScreen.tsx'), 'utf8');
const webMission = fs.readFileSync(path.join(mobileRoot, '../frontend/components/CelebrationMission.js'), 'utf8');
const verifier = fs.readFileSync(path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'), 'utf8');
const course = require(path.join(mobileRoot, 'src/generated/a1-course.json'));
const mission = course.find((lesson) => lesson.experience_type === 'mission');

assert.ok(mission, 'The embedded catalog must expose the declared mission experience.');
assert.equal(mission.cards.length, 22);
assert.ok(
  Math.min(...mission.cards.slice(0, 18).map((card) => card.mission_game.targets.length)) >= 4,
  'Every listening challenge must present at least four equally credible tap candidates.',
);

test('mobile mission uses large direct tap targets and contains no drag worksheet', () => {
  assert.match(surface, /function TargetDot/);
  assert.match(surface, /const DOT_SIZE = 58/);
  assert.match(surface, /hitSlop=\{8\}/);
  assert.match(surface, /onPress=\{onPress\}/);
  assert.match(surface, /Animated\.loop/);
  assert.match(surface, /targetCenter\(target\)/);
  assert.doesNotMatch(surface, /PanResponder|measureInWindow|onDrop|draggable/);
});

test('wrong taps preserve completed clues and replay only the current English cue', () => {
  assert.match(surface, /Tus aciertos siguen guardados\./);
  assert.match(surface, /setSolvedTargetIds\(nextSolved\)/);
  assert.match(surface, /onMisstep\(\[target\.id\]\)/);
  assert.match(surface, /onCueRequest\(cueIndex\)/);
  assert.doesNotMatch(surface, />Deshacer|>Reiniciar|>Comprobar/);
  assert.match(lessonScreen, /<MissionGameSurface/);
  assert.match(lessonScreen, /<MissionKickoff/);
  assert.doesNotMatch(lessonScreen, /lesson\.id === 'lesson-10-family-mission'/);
});

test('mission surfaces consume available screen space without lesson scrolling', () => {
  assert.match(kickoff, /useWindowDimensions\(\)/);
  assert.match(kickoff, /flex: 1/);
  assert.match(kickoff, /minHeight: 0/);
  assert.match(kickoff, /adjustsFontSizeToFit/);
  assert.match(surface, /surface: \{[^\n]*flex: 1/);
  assert.match(surface, /imageFrame: \{[^\n]*flex: 1[^\n]*minHeight: 210/);
  assert.match(surface, /adjustsFontSizeToFit/);
  assert.match(lessonScreen, /!missionExperience && needsAccessibleScrolling/);
  assert.match(webMission, /height:calc\(100svh - 40px\)/);
  assert.match(webMission, /overflow:hidden/);
});

test('web mission mirrors tap, immediate feedback, and auto-advance behavior', () => {
  assert.match(webMission, /className=\{`target-dot/);
  assert.match(webMission, /onClick=\{\(\) => chooseTarget\(target\)\}/);
  assert.match(webMission, /Tus aciertos siguen guardados\./);
  assert.match(webMission, /onReplayEnglish\(cueIndex\)/);
  assert.match(webMission, /onComplete\(game\.cues\.map/);
  assert.doesNotMatch(webMission, /draggable=|onDragStart=|onDrop=|>Deshacer|>Reiniciar|>Comprobar/);
});

test('protected interaction verification runs the real-game mission contracts', () => {
  assert.match(verifier, /node tests\/mission-experience\.test\.cjs/);
  assert.match(verifier, /node tests\/lesson-mission-contract\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-tiles\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-sound-effects\.test\.cjs/);
});
