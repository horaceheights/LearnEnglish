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
const lessonCard = fs.readFileSync(path.join(mobileRoot, 'src/components/LessonCardView.tsx'), 'utf8');
const pronunciation = fs.readFileSync(path.join(mobileRoot, 'src/components/PronunciationPractice.tsx'), 'utf8');
const kickoff = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionKickoff.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(mobileRoot, 'src/screens/LessonScreen.tsx'), 'utf8');
const images = fs.readFileSync(path.join(mobileRoot, 'src/lessonImageSources.ts'), 'utf8');

assert.equal(mission.cards.length, 22);
assert.equal(mission.content_revision, 6);
assert.deepEqual(
  [...new Set(mission.cards.map((card) => card.mission_game.kind))].sort(),
  ['action-hunt', 'contrast-hunt', 'crowd-search', 'family-link', 'guided-search', 'voice-gate'].sort(),
);

assert.match(kickoff, /Comenzar misión/);
assert.match(kickoff, /Escuchar otra vez/);
assert.match(kickoff, /disabled=\{!ready\}/);
assert.doesNotMatch(kickoff, /ScrollView/);
assert.match(surface, /game\.cues\[cueOrder\[cueIndex\] \?\? cueIndex\]/);
assert.match(surface, /TargetDot/);
assert.match(surface, /Animated\.loop/);
assert.match(surface, /onCueRequest\(nextCueIndex\)/);
assert.match(surface, /onSubmit\(game\.cues\.map/);
assert.match(surface, /Tus aciertos siguen guardados/);
assert.match(surface, /El audio no se pudo reproducir\. Toca el botón de sonido\./);
assert.doesNotMatch(surface, /PanResponder|Draggable|Comprobar|Deshacer|Reiniciar/);
assert.match(screen, /playMissionSound\('mission-start'\)/);
assert.match(
  screen,
  /const playMissionCueAt[\s\S]*?stopMissionSound\(\)[\s\S]*?await cacheCourseAudioAsset\(cueAsset\)[\s\S]*?missionCuePlayer\.replace\(source\)[\s\S]*?missionCuePlayer\.play\(\)/,
);
assert.doesNotMatch(screen, /playAudioSequence\(\[cueTurn\]/);
assert.match(screen, /onStart=\{\(\) => \{[\s\S]*?stopMissionSound\(\)[\s\S]*?setMissionKickoffComplete\(true\)/);
assert.match(screen, /cueUnavailable=\{missionCueUnavailable\}/);
assert.match(screen, /interactionReady=\{missionInteractionReady\}/);
assert.match(screen, /onCueRequest=\{playMissionCueAt\}/);
assert.match(screen, /!missionExperience && needsAccessibleScrolling/);
assert.match(screen, /!isMissionGameCard \? <View/);
assert.match(screen, /missionVoiceGate=\{missionVoiceGateProgress\}/);
assert.doesNotMatch(screen, /interactionReady=\{true\}/);
assert.match(screen, /!isMissionTileCard && !isMissionGameCard/);
assert.match(
  screen,
  /const waitsForGrammarAnimation = shouldWaitForGrammarAnimation\([\s\S]*?usesMissionGameSurface,[\s\S]*?\);/,
);

const bundledReunionImages = images.match(/'a1_u1_reunion_[^']+\.webp': require/g) || [];
assert.equal(bundledReunionImages.length, 23);

assert.match(lessonCard, /ABRE LA CELEBRACIÓN/);
assert.match(lessonCard, /Activa la entrada con tu voz/);
assert.match(lessonCard, /Array\.from\(\{ length: missionVoiceGate\.total \}/);
assert.match(lessonCard, /presentation=\{isMissionVoiceGate \? 'mission-voice-gate' : 'standard'\}/);
assert.match(pronunciation, /presentation === 'mission-voice-gate'/);
assert.match(pronunciation, /mediaAspectRatio=\{missionVoiceGate && !isLandscape \? 1\.35 : 3 \/ 2\}/);
assert.match(pronunciation, /Toca para escuchar otra vez/);
assert.match(pronunciation, /ENTRADA ACTIVADA/);
assert.match(pronunciation, /INVITADO RECIBIDO/);

console.log('celebration mission mobile UI contract passed');
