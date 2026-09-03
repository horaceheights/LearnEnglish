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

test('mission construction supports bounded drag plus a complete tap path', () => {
  assert.match(cardView, /PanResponder\.create/);
  assert.match(cardView, /measureInWindow/);
  assert.match(cardView, /viewportWidth - origin\.x - origin\.width - 8/);
  assert.match(cardView, /viewportHeight - origin\.y - origin\.height - 8/);
  assert.match(cardView, /onPress=\{\(\) => onSelect\(option\.id\)\}/);
  assert.match(cardView, /minHeight: 48/);
  assert.match(cardView, /Toca o arrastra las fichas en orden\./);
});

test('mission construction exposes progress, undo, and reset without leaving the card', () => {
  assert.match(cardView, /MISIÓN FAMILIAR/);
  assert.match(cardView, /Deshacer/);
  assert.match(cardView, /Reiniciar/);
  assert.match(lessonScreen, /undoMissionSelection/);
  assert.match(lessonScreen, /resetMissionSelection/);
  assert.match(lessonScreen, /missionTotal=\{lesson\.id === 'lesson-10-family-mission'/);
});

test('web mission tiles keep drag, tap, progress, and recovery controls together', () => {
  assert.match(webPlayer, /draggable=\{isMissionTileCard/);
  assert.match(webPlayer, /onDrop=\{\(event\) =>/);
  assert.match(webPlayer, /onClick=\{isPronunciationCard \? undefined : \(\) => handleChoice\(option\.id\)\}/);
  assert.match(webPlayer, /undoMissionSelection/);
  assert.match(webPlayer, /resetMissionSelection/);
  assert.match(webPlayer, /MISIÓN FAMILIAR/);
  assert.match(webPlayer, /minHeight: 48/);
});
