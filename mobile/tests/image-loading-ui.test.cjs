const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

assert.doesNotMatch(
  cardViewSource,
  /ActivityIndicator|imageLoadingPlaceholder|showImagePlaceholder/,
  'Answer images must not display a loading spinner that resembles an answer hint.',
);

assert.match(
  lessonScreenSource,
  /Image\.prefetch\(url\)/,
  'Upcoming lesson images must remain preloaded after removing the visible spinner.',
);

console.log('Calm image-loading UI checks passed.');
