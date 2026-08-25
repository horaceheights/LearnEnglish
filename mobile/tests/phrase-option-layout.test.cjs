const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');

assert.match(
  cardViewSource,
  /const useHorizontalPhraseOptions = !isLandscape && hasTextOnlyOptions;/,
  'Portrait phrase choices must use the shared horizontal-row layout.',
);

assert.match(
  cardViewSource,
  /useHorizontalPhraseOptions\s*\? '100%'/,
  'Every portrait phrase tile must use the full available width.',
);

assert.match(
  cardViewSource,
  /numberOfLines=\{useHorizontalPhraseOptions \? 1/,
  'Horizontal phrase tiles must keep answers on one auto-sized line.',
);

console.log('Horizontal phrase-option layout checks passed.');
