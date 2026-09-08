const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const geometryPath = process.argv[2];
assert.ok(geometryPath, 'Pass the compiled missionSceneGeometry module path.');
const {
  fitMissionSceneFrame,
  isCollectiveMissionTarget,
  missionPersonTargetSize,
  MISSION_PERSON_TARGET_SIZE,
  MISSION_SCENE_ASPECT_RATIO,
  missionTargetTouchWidth,
} = require(path.resolve(geometryPath));

const mobileRoot = path.resolve(__dirname, '..');
const surface = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionGameSurface.tsx'), 'utf8');
const webMission = fs.readFileSync(path.join(mobileRoot, '../frontend/components/CelebrationMission.js'), 'utf8');
const mission = require(path.join(mobileRoot, 'src/generated/lesson-10-family-mission.json'));

test('mission scene frame preserves the complete 3:2 canvas in every orientation', () => {
  const slots = [
    ['small phone portrait', 328, 560],
    ['phone portrait', 388, 680],
    ['phone landscape', 650, 190],
    ['tablet portrait', 760, 820],
    ['tablet landscape', 960, 430],
  ];

  for (const [name, availableWidth, availableHeight] of slots) {
    const frame = fitMissionSceneFrame(availableWidth, availableHeight);
    assert.ok(frame.width <= availableWidth + 0.001, `${name} frame exceeds available width.`);
    assert.ok(frame.height <= availableHeight + 0.001, `${name} frame exceeds available height.`);
    assert.ok(frame.canvasWidth > 0 && frame.canvasHeight > 0, `${name} must keep a visible scene.`);
    assert.ok(
      Math.abs((frame.canvasWidth / frame.canvasHeight) - MISSION_SCENE_ASPECT_RATIO) < 0.0001,
      `${name} must keep the authored 3:2 image canvas.`,
    );
  }
});

test('mobile and web place hotspots on the fitted image canvas instead of a cropped flex box', () => {
  assert.match(surface, /fitMissionHeadScene\(/);
  assert.match(surface, /style=\{\[styles\.sceneSlot, useLandscapeGameRail \? styles\.sceneSlotLandscape : null\]\}/);
  assert.match(surface, /style=\{styles\.sceneCanvas\}/);
  assert.match(surface, /width: sceneFrame\.imageWidth \+ 8, height: sceneFrame\.imageHeight \+ 8/);
  assert.match(surface, /left: sceneFrame\.imageX - 4, top: sceneFrame\.imageY - 4/);
  assert.match(surface, /useWindowDimensions\(\)/);
  assert.match(surface, /useLandscapeGameRail/);
  assert.match(surface, /styles\.surfaceLandscape/);
  assert.match(surface, /styles\.sceneSlotLandscape/);
  assert.doesNotMatch(surface, /imageFrame:\s*\{[^\n]*flex:\s*1/);
  assert.match(webMission, /className="scene-slot"/);
  assert.match(webMission, /\.scene \{ aspect-ratio:3\/2/);
  assert.match(webMission, /@container \(min-aspect-ratio:3\/2\)/);
  // Short landscape phones can be narrower than 600 CSS pixels.
  assert.match(webMission, /@media \(max-height:600px\) and \(orientation:landscape\)/);
  assert.match(webMission, /\.mission-game \{ display:grid/);
  assert.match(webMission, /\.mission-shell \{ gap:6px; height:calc\(100svh - 16px\); min-height:0; padding:8px; \}/);
  assert.match(webMission, /\.scene \{ aspect-ratio:3\/2;[^\n]*box-sizing:border-box/);
});

test('person targets stay round while pairs and groups use a wider neutral capsule', () => {
  assert.equal(isCollectiveMissionTarget('Persona'), false);
  for (const label of ['Grupo', 'Pareja', 'Familia']) {
    assert.equal(isCollectiveMissionTarget(label), true);
  }
  assert.equal(missionTargetTouchWidth(380, false), MISSION_PERSON_TARGET_SIZE);
  assert.ok(missionTargetTouchWidth(380, true) > MISSION_PERSON_TARGET_SIZE);
  assert.equal(missionTargetTouchWidth(2000, true), 132);
  assert.equal(missionPersonTargetSize(200), 44);
  assert.ok(missionTargetTouchWidth(280, true) < 80);

  const listeningTargets = mission.cards.slice(0, 18).flatMap((card) => card.mission_game.targets);
  assert.ok(listeningTargets.some((target) => target.label_es === 'Persona'));
  assert.ok(listeningTargets.some((target) => target.label_es === 'Grupo'));
  assert.ok(listeningTargets.some((target) => target.label_es === 'Pareja'));
  const babyGroup = mission.cards.find((card) => card.slide_id === 'M05')
    .mission_game.targets.find((target) => target.id === 'three-babies');
  assert.equal(babyGroup.label_es, 'Grupo');
  assert.match(surface, /collective \? 'people' : 'radio-button-on'/);
  assert.match(webMission, /collective \? "● ●" : "●"/);
});
