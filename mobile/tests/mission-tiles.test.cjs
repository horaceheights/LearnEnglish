const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const cardView = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'LessonCardView.tsx'),
  'utf8',
);
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
);
const webPlayer = fs.readFileSync(
  path.join(mobileRoot, '..', 'frontend', 'components', 'LessonPlayer.js'),
  'utf8',
);
const verifier = fs.readFileSync(
  path.join(mobileRoot, 'scripts', 'verify-interaction-paths.ps1'),
  'utf8',
);
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mission = course.find((lesson) => lesson.experience_type === 'mission');
const missionConstructionSource = cardView.slice(
  cardView.indexOf('function MissionDraggableTile'),
  cardView.indexOf('function LessonActionMedia'),
);

assert.ok(mission, 'The embedded catalog must expose the declared mission experience.');
assert.equal(mission.cards.length, 22);
assert.equal(
  Math.max(...mission.cards.map((card) => card.options.length)),
  8,
  'Responsive mission QA must exercise the reviewed eight-tile construction bank.',
);

test('mission construction supports bounded drag plus a complete tap path', () => {
  assert.match(cardView, /PanResponder\.create/);
  assert.match(cardView, /measureInWindow/);
  assert.match(
    missionConstructionSource,
    /onPanResponderGrant:[\s\S]*?originRef\.current = null[\s\S]*?measureDropBounds\(\)[\s\S]*?tileRef\.current\?\.measureInWindow/,
    'Starting a drag must refresh both the drop zone and tile origin after any ScrollView movement.',
  );
  assert.match(
    missionConstructionSource,
    /onPanResponderRelease:[\s\S]*?measureDropBounds\(\(bounds\) => \{[\s\S]*?pageX >= bounds\.x[\s\S]*?pageY >= bounds\.y/,
    'Releasing a drag must hit-test against freshly measured window coordinates.',
  );
  assert.doesNotMatch(
    missionConstructionSource,
    /onPanResponderRelease:[\s\S]*?const bounds = dropBoundsRef\.current/,
    'Drag release must not trust coordinates cached before the ScrollView moved.',
  );
  assert.match(cardView, /viewportWidth - origin\.x - origin\.width - 8/);
  assert.match(cardView, /viewportHeight - origin\.y - origin\.height - 8/);
  assert.match(cardView, /onPress=\{\(\) => onSelect\(option\.id\)\}/);
  assert.match(cardView, /minHeight: 48/);
  assert.match(cardView, /missionTileBank:[\s\S]*?flexWrap: 'wrap'/);
  assert.match(cardView, /missionDropZone:[\s\S]*?flexWrap: 'wrap'/);
  assert.match(
    missionConstructionSource,
    /flexBasis: correctIds\.length > 6 \? '22%' : correctIds\.length > 3 \? '30%' : '44%'/,
    'The answer area must reflow to four, three, or two slots per row.',
  );
  const minimumFontScales = [...missionConstructionSource.matchAll(
    /minimumFontScale=\{([0-9.]+)\}/g,
  )].map((match) => Number(match[1]));
  assert.ok(minimumFontScales.length >= 2, 'Both source and placed mission tiles need font-fit floors.');
  assert.ok(
    minimumFontScales.every((scale) => scale >= 0.8),
    `Mission tiles may not shrink below 80% of authored size: ${minimumFontScales.join(', ')}`,
  );
  assert.match(cardView, /Toca o arrastra las fichas en orden\./);
});

test('mission construction exposes progress, undo, and reset without leaving the card', () => {
  assert.match(cardView, /Deshacer/);
  assert.match(cardView, /Reiniciar/);
  assert.match(lessonScreen, /undoMissionSelection/);
  assert.match(lessonScreen, /resetMissionSelection/);
  assert.match(lessonScreen, /isMissionLesson\(lesson\)/);
  assert.match(lessonScreen, /MissionJourney/);
  assert.match(lessonScreen, /MissionCompletion/);
  assert.match(lessonScreen, /step=\{cardIndex \+ 1\}/);
  assert.match(lessonScreen, /total=\{lesson\.cards\.length\}/);
  assert.doesNotMatch(lessonScreen, /lesson\.id === 'lesson-10-family-mission'/);
  assert.doesNotMatch(lessonScreen, /mission(?:Step|Total)=/);
});

test('web mission tiles keep drag, tap, progress, and recovery controls together', () => {
  assert.match(webPlayer, /draggable=\{isMissionTileCard/);
  assert.match(webPlayer, /onDrop=\{\(event\) =>/);
  assert.match(webPlayer, /onClick=\{isPronunciationCard \? undefined : \(\) => handleChoice\(option\.id\)\}/);
  assert.match(webPlayer, /undoMissionSelection/);
  assert.match(webPlayer, /resetMissionSelection/);
  assert.match(webPlayer, /isMissionLesson/);
  assert.doesNotMatch(webPlayer, /activeLesson\.id === "lesson-10-family-mission"/);
  assert.doesNotMatch(
    webPlayer,
    /gridTemplateColumns: `repeat\(\$\{orderedCorrectOptionIds\(currentCard\)\.length\}, minmax\(0, 1fr\)\)`/,
  );
  assert.match(
    webPlayer,
    /const missionTileGridColumns = isMobile[\s\S]*?"repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?"repeat\(auto-fit, minmax\(132px, 1fr\)\)"/,
    'Mission tiles must use two shrink-safe columns on mobile and auto-fit on wider screens.',
  );
  assert.equal(
    (webPlayer.match(/gridTemplateColumns: missionTileGridColumns/g) || []).length,
    2,
    'The same responsive grid must govern both the answer area and source tile bank.',
  );
  assert.match(webPlayer, /maxWidth: "620px",[\s\S]*?minWidth: 0,[\s\S]*?width: "100%"/);
  assert.match(webPlayer, /maxWidth: "100%", minHeight: 44, minWidth: 0, width: "100%"/);
  assert.match(webPlayer, /overflowWrap: isMissionTileCard \? "anywhere" : undefined/);
  assert.match(webPlayer, /minHeight: 48/);
});

test('protected interaction verification runs every mission contract', () => {
  assert.match(verifier, /node tests\/mission-experience\.test\.cjs/);
  assert.match(verifier, /node tests\/lesson-mission-contract\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-tiles\.test\.cjs/);
});
