const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { spanishTranslationFor } = require(process.argv[2]);
const generatedDirectory = process.argv[3];

assert.equal(spanishTranslationFor('Who is she?'), '¿Quién es ella?');
assert.equal(spanishTranslationFor('She is the grandmother.'), 'Ella es la abuela.');
assert.equal(
  spanishTranslationFor('Who are they? They are the parents.'),
  '¿Quiénes son ellos? Ellos son los padres.',
);

const missing = [];
for (const filename of fs.readdirSync(generatedDirectory)) {
  if (!/^lesson-(?:[3-9]|10)-.*\.json$/.test(filename)) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedDirectory, filename), 'utf8'));
  for (const [index, card] of lesson.cards.entries()) {
    if (!card.prompt || !card.prompt.trim()) continue;
    if (spanishTranslationFor(card.prompt) === 'Traducción no disponible todavía.') {
      missing.push(`${filename} card ${index + 1}: ${card.prompt}`);
    }
  }
}

assert.deepEqual(missing, [], `Missing prompt translations:\n${missing.join('\n')}`);
console.log('Sentence translation checks passed.');
