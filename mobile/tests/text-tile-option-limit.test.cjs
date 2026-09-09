const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const generatedRoot = path.join(__dirname, '..', 'src', 'generated');
const lessonFiles = fs.readdirSync(generatedRoot)
  .filter((name) => /^lesson-.*\.json$/.test(name));

assert.equal(lessonFiles.length, 70, 'Expected all 70 embedded A1 lesson snapshots.');

const units = new Set();
let textTileCards = 0;
let missionConstructionBanks = 0;
let missionTapCandidateSets = 0;
const missionConstructionInteractions = new Set([
  'mission-word-parts',
  'mission-sentence',
  'mission-finale',
]);

for (const filename of lessonFiles) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  units.add(lesson.unit_id);

  lesson.cards.forEach((card, index) => {
    if (!Array.isArray(card.options) || card.options.length === 0) return;
    if (card.options.some((option) => String(option.image_url || '').trim())) return;

    textTileCards += 1;
    if (lesson.experience_type === 'mission' && card.mission_game?.kind !== 'voice-gate') {
      missionTapCandidateSets += 1;
      assert.ok(
        card.options.length >= 4 && card.mission_game.targets.length >= 4,
        `${lesson.id} card ${index + 1} must retain at least four credible tap candidates.`,
      );
      return;
    }
    const isMissionConstruction = lesson.experience_type === 'mission'
      && missionConstructionInteractions.has(card.interaction_type);
    if (isMissionConstruction || card.interaction_type === 'complete-sentence') {
      missionConstructionBanks += 1;
      assert.ok(
        card.options.length <= 8,
        `${lesson.id} card ${index + 1} exceeds the reviewed eight-tile construction bound.`,
      );
      assert.ok(
        card.options.every((option) => String(option.label || '').trim()),
        `${lesson.id} card ${index + 1} has an unreadable construction tile.`,
      );
      const correctIds = card.correct_option_ids?.length
        ? card.correct_option_ids
        : [card.correct_option_id];
      assert.ok(
        correctIds.every((id) => card.options.some((option) => option.id === id)),
        `${lesson.id} card ${index + 1} is missing a required construction tile.`,
      );
      return;
    }
    assert.ok(
      card.options.length <= 3,
      `${lesson.id} card ${index + 1} has ${card.options.length} ordinary answer tiles; maximum is three.`,
    );
    assert.ok(
      card.options.some((option) => option.id === card.correct_option_id),
      `${lesson.id} card ${index + 1} lost its correct answer while limiting text tiles.`,
    );
  });
}

assert.equal(units.size, 7, 'Expected embedded lessons from all seven A1 units.');
assert.ok(textTileCards > 500, 'Expected the full A1 text-tile catalog to be audited.');
assert.equal(missionTapCandidateSets, 18, 'Expected all 18 listening mission challenges to bypass the ordinary visible-tile limit.');
console.log(`Text-tile option limit passed for ${textTileCards} cards across 70 lessons, including ${missionTapCandidateSets} hidden tap-candidate sets and ${missionConstructionBanks} bounded construction banks.`);
