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
assert.equal(mission.content_revision, 3);
assert.equal(mission.mission.chapters.length, 5);
assert.equal(mission.mission.kickoff_image_url, '/lesson-assets/a1_u1_reunion_kickoff.webp');
assert.ok(mission.cards.every((card) => card.mission_game?.instruction_es && card.mission_game.targets.length));
assert.deepEqual(
  [...new Set(mission.cards.map((card) => card.mission_game.kind))].sort(),
  ['action-sequence', 'finale', 'hotspot', 'label-placement', 'not-correction', 'relationship-link', 'speak', 'who-dialogue'].sort(),
);

assert.match(kickoff, /Comenzar misión/);
assert.match(kickoff, /Escuchar otra vez/);
assert.match(surface, /PanResponder\.create/);
assert.match(surface, /Ahora toca su destino en la imagen/);
assert.match(surface, /Retiramos solo lo incorrecto/);
assert.match(surface, /Deshacer/);
assert.match(surface, /Reiniciar/);
assert.match(surface, /Comprobar/);
assert.match(screen, /!isMissionTileCard && !isMissionGameCard/);
assert.match(screen, /<MissionGameSurface/);
assert.match(screen, /<MissionKickoff/);
assert.match(screen, /findCourseAudioAsset\(currentCard, 'mission-instruction'\)/);

const bundledReunionImages = images.match(/'a1_u1_reunion_[^']+\.webp': require/g) || [];
assert.equal(bundledReunionImages.length, 23);

console.log('celebration mission mobile UI contract passed');
