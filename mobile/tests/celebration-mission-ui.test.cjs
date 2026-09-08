const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const mission = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'backend/lessons/unit_1/1.10_family_scene_mission.yaml'),
  'utf8',
));
const surface = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionGameSurface.tsx'), 'utf8');
const kickoff = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionKickoff.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(mobileRoot, 'src/screens/LessonScreen.tsx'), 'utf8');
const images = fs.readFileSync(path.join(mobileRoot, 'src/lessonImageSources.ts'), 'utf8');

assert.equal(mission.cards.length, 22);
assert.equal(mission.content_revision, 5);
assert.deepEqual(
  [...new Set(mission.cards.map((card) => card.mission_game.kind))].sort(),
  ['action-hunt', 'contrast-hunt', 'crowd-search', 'family-link', 'guided-search', 'voice-gate'].sort(),
);

assert.match(kickoff, /Comenzar misión/);
assert.match(kickoff, /Escuchar otra vez/);
assert.match(kickoff, /disabled=\{!ready\}/);
assert.doesNotMatch(kickoff, /ScrollView/);
assert.match(surface, /game\.cues\[cueIndex\]/);
assert.match(surface, /TargetDot/);
assert.match(surface, /Animated\.loop/);
assert.match(surface, /onCueRequest\(nextCueIndex\)/);
assert.match(surface, /onSubmit\(game\.cues\.map/);
assert.match(surface, /Tus aciertos siguen guardados/);
assert.match(surface, /No se escuchó\. Toca 🔊 para repetir\./);
assert.doesNotMatch(surface, /PanResponder|Draggable|Comprobar|Deshacer|Reiniciar/);
assert.match(screen, /playMissionSound\('mission-start'\)/);
assert.match(
  screen,
  /const playMissionCueAt[\s\S]*?stopMissionSound\(\)[\s\S]*?playAudioSource\(lessonAudioAssetSource\(cueTurn\.asset\), 'mission', `cue-\$\{cueIndex \+ 1\}`\)/,
);
assert.doesNotMatch(screen, /playAudioSequence\(\[cueTurn\]/);
assert.match(screen, /onStart=\{\(\) => \{[\s\S]*?stopMissionSound\(\)[\s\S]*?setMissionKickoffComplete\(true\)/);
assert.match(screen, /cueUnavailable=\{missionCueUnavailable\}/);
assert.match(screen, /interactionReady=\{missionInteractionReady\}/);
assert.match(screen, /onCueRequest=\{playMissionCueAt\}/);
assert.match(screen, /!missionExperience && needsAccessibleScrolling/);
assert.doesNotMatch(screen, /interactionReady=\{true\}/);
assert.match(screen, /!isMissionTileCard && !isMissionGameCard/);
assert.match(
  screen,
  /const waitsForGrammarAnimation = shouldWaitForGrammarAnimation\([\s\S]*?usesMissionGameSurface,[\s\S]*?\);/,
);

const bundledReunionImages = images.match(/'a1_u1_reunion_[^']+\.webp': require/g) || [];
assert.equal(bundledReunionImages.length, 23);

console.log('celebration mission mobile UI contract passed');
