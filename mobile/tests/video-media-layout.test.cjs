const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const configPath = path.resolve(__dirname, '../src/config.ts');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const configSource = fs.readFileSync(configPath, 'utf8');

assert.match(
  cardViewSource,
  /actionVideoName \? \(\s*<LessonActionMedia/,
  'Mapped action cards must render the video surface before selection, not a separate still image.',
);

assert.match(
  cardViewSource,
  /shouldPlay=\{playActionVideo\}/,
  'The shared video surface must stay paused until a single-card lesson or correct selection plays it.',
);

assert.doesNotMatch(
  cardViewSource,
  /!firstFrameRendered\s*\?\s*\(\s*<Image/,
  'Video cards must not layer a different still image beneath the video.',
);

assert.match(
  cardViewSource,
  /singleActionVideoOption:\s*\{[^}]*width: '100%'/s,
  'Single-card action clips must use the full card width.',
);

assert.match(
  configSource,
  /lesson-assets\/\$\{encodeURIComponent\(name\)\}\?v=\$\{LESSON_VIDEO_CACHE_VERSION\}/,
  'Lesson video URLs must be versioned so corrected media replaces stale mobile caches.',
);

console.log('Unified video media checks passed.');
