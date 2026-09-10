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
const voicePresentation = fs.readFileSync(path.join(mobileRoot, 'src/components/MissionVoicePresentation.tsx'), 'utf8');
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

// The briefing speaks through the shared course player while the sound effects
// have a player of their own, so stopMissionSound alone leaves it talking and it
// runs over the first clue.
assert.match(
  screen,
  /onStart=\{\(\) => \{[\s\S]*?stopMissionIntro\(\)[\s\S]*?setMissionKickoffComplete\(true\)/,
  'Starting the mission must silence the briefing, not just the sound effects.',
);
const stopIntro = screen.slice(
  screen.indexOf('const stopMissionIntro = useCallback('),
  screen.indexOf('const missionChapters = useMemo('),
);
assert.ok(stopIntro.length > 0, 'Could not find stopMissionIntro.');
assert.match(
  stopIntro,
  /audioPlaybackRequestRef\.current \+= 1;/u,
  'A briefing still preloading would start after the tap unless its request is retired.',
);
assert.match(
  stopIntro,
  /audioPlayerRef\.current\.pause\(\)/u,
  'The briefing plays on the shared course player, so that is what must stop.',
);
assert.match(screen, /cueUnavailable=\{missionCueUnavailable\}/);
assert.match(screen, /interactionReady=\{missionInteractionReady\}/);
assert.match(screen, /onCueRequest=\{playMissionCueAt\}/);
// The mission owns its own layout, so the accessible scrolling fallback must
// stay switched off for it. Other activities may add their own exclusions here,
// so match the mission guard rather than the exact list of conditions.
assert.match(screen, /\{!missionExperience &&[^?}]*needsAccessibleScrolling \?/);
// Mission cards render their own surface instead of the standard prompt block.
// Other activities opt out of that block too, so allow further exclusions.
assert.match(screen, /!isMissionGameCard[^?]*\? <View/);
assert.match(screen, /missionVoiceGate=\{missionVoiceGateProgress\}/);
assert.doesNotMatch(screen, /interactionReady=\{true\}/);
assert.match(screen, /!isMissionTileCard && !isMissionGameCard/);
assert.match(
  screen,
  // The mission surface must still suppress the grammar animation wait; other
  // activities may be folded into the same argument.
  /const waitsForGrammarAnimation = shouldWaitForGrammarAnimation\([\s\S]*?usesMissionGameSurface[^)]*\);/,
);

const bundledReunionImages = images.match(/'a1_u1_reunion_[^']+\.webp': require/g) || [];
assert.equal(bundledReunionImages.length, 27);

assert.match(lessonCard, /ABRE LA CELEBRACIÓN/);
assert.match(lessonCard, /Activa la entrada con tu voz/);
assert.match(lessonCard, /Array\.from\(\{ length: missionVoiceGate\.total \}/);
assert.match(lessonCard, /presentation=\{isMissionVoiceGate \? 'mission-voice-gate' : 'standard'\}/);
assert.match(pronunciation, /presentation === 'mission-voice-gate'/);
assert.match(pronunciation, /answer=\{phase === 'model' \? null : phrase\}/);
assert.match(voicePresentation, /answer && !unavailable \? <Text/);
assert.match(pronunciation, /phase === 'listening' \|\| phase === 'ready'[\s\S]*?'Lee la frase en voz alta\.'/);
assert.match(pronunciation, /Mission recall requires exactly one question turn/);
assert.match(pronunciation, /phase === 'model' \? \(audioTurns\?\.\[0\]\?\.turn\.image_url/);
assert.match(pronunciation, /mediaAspectRatio=\{missionVoiceGate && !isLandscape \? 1\.35 : 3 \/ 2\}/);
assert.match(pronunciation, /Toca para escuchar otra vez/);
assert.match(pronunciation, /ENTRADA ACTIVADA/);
assert.match(pronunciation, /INVITADO RECIBIDO/);

console.log('celebration mission mobile UI contract passed');
