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
assert.ok(Math.max(...mission.cards.map((card) => card.options.length)) >= 6, 'Responsive mission QA must exercise a substantial signal bank.');

test('mobile mission placement supports bounded drag and an equivalent tap path', () => {
  assert.match(surface, /PanResponder\.create/);
  assert.match(surface, /useWindowDimensions\(\)/);
  assert.match(surface, /Math\.max\(-width \* 0\.8, Math\.min\(width \* 0\.8, gesture\.dx\)\)/);
  assert.match(surface, /Math\.max\(-height \* 0\.65, Math\.min\(height \* 0\.65, gesture\.dy\)\)/);
  assert.match(surface, /measureInWindow/);
  assert.match(surface, /onDrop\(option\.id, event\.nativeEvent\.pageX, event\.nativeEvent\.pageY\)/);
  assert.match(surface, /onPress=\{\(\) => onPress\(option\.id\)\}/);
  assert.match(surface, /Ahora toca su destino en la imagen/);
  assert.match(surface, /height: percent\(target\.rect\.height\)/);
  assert.match(surface, /left: percent\(target\.rect\.x\)/);
  assert.match(surface, /minHeight: 44/);
  assert.match(surface, /minWidth: 44/);
});

test('mobile mission recovery preserves progress and never forces a lesson restart', () => {
  assert.match(surface, /Retiramos solo lo incorrecto\. Tus aciertos siguen en su lugar\./);
  assert.match(surface, /Señal retirada\. Puedes colocarla de nuevo\./);
  assert.match(surface, />Deshacer</);
  assert.match(surface, />Reiniciar</);
  assert.match(surface, />Comprobar</);
  assert.match(surface, /setPlacements\(validation\.retained\)/);
  assert.match(lessonScreen, /<MissionGameSurface/);
  assert.match(lessonScreen, /<MissionKickoff/);
  assert.doesNotMatch(lessonScreen, /lesson\.id === 'lesson-10-family-mission'/);
});

test('mission surfaces adapt to available screen space without hiding the next action', () => {
  assert.match(kickoff, /aspectRatio: 3 \/ 2/);
  assert.match(kickoff, /maxWidth: 820/);
  assert.match(surface, /aspectRatio: 3 \/ 2/);
  assert.match(surface, /maxHeight: 510/);
  assert.match(surface, /flexWrap: 'wrap'/);
  assert.match(surface, /adjustsFontSizeToFit/);
  assert.match(webMission, /maxWidth: isMobile \? "min\(100%, calc\(43svh \* 1\.5\)\)" : 900/);
  assert.match(webMission, /overflowX: isMobile \? "auto" : "visible"/);
  assert.match(webMission, /gridTemplateColumns: isMobile \? "repeat\(3, minmax\(0, 1fr\)\)"/);
});

test('web mission tiles keep drag, tap, removal, and no-reset repair together', () => {
  assert.match(webMission, /draggable=\{!choiceGame && interactionReady && lastResult !== "correct"\}/);
  assert.match(webMission, /onDragStart=\{\(event\) =>/);
  assert.match(webMission, /onDrop=\{\(event\) =>/);
  assert.match(webMission, /Retirar \$\{optionsById\.get\(placement\.optionId\)/);
  assert.match(webMission, /Retiramos solo lo que no correspondía\. Tus aciertos siguen en su lugar\./);
  assert.match(webMission, />Deshacer</);
  assert.match(webMission, />Reiniciar</);
  assert.match(webMission, />Comprobar</);
});

test('protected interaction verification runs the celebration mission contracts', () => {
  assert.match(verifier, /node tests\/mission-experience\.test\.cjs/);
  assert.match(verifier, /node tests\/lesson-mission-contract\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-tiles\.test\.cjs/);
});
