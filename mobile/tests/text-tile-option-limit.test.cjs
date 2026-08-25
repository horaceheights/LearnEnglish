const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const generatedRoot = path.join(__dirname, '..', 'src', 'generated');
const lessonFiles = fs.readdirSync(generatedRoot)
  .filter((name) => /^lesson-.*\.json$/.test(name));

assert.equal(lessonFiles.length, 70, 'Expected all 70 embedded A1 lesson snapshots.');

const units = new Set();
let textTileCards = 0;

for (const filename of lessonFiles) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  units.add(lesson.unit_id);

  lesson.cards.forEach((card, index) => {
    if (!Array.isArray(card.options) || card.options.length === 0) return;
    if (card.options.some((option) => String(option.image_url || '').trim())) return;

    textTileCards += 1;
    assert.ok(
      card.options.length <= 3,
      `${lesson.id} card ${index + 1} has ${card.options.length} text tiles; maximum is three.`,
    );
    assert.ok(
      card.options.some((option) => option.id === card.correct_option_id),
      `${lesson.id} card ${index + 1} lost its correct answer while limiting text tiles.`,
    );
  });
}

assert.equal(units.size, 7, 'Expected embedded lessons from all seven A1 units.');
assert.ok(textTileCards > 500, 'Expected the full A1 text-tile catalog to be audited.');
console.log(`Text-tile option limit passed for ${textTileCards} cards across 70 lessons.`);
