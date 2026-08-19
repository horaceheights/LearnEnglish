const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const configPath = path.resolve(__dirname, '../src/config.ts');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const configSource = fs.readFileSync(configPath, 'utf8');
const webPlayerSource = fs.readFileSync(webPlayerPath, 'utf8');
const webActionMediaSource = webPlayerSource.slice(
  webPlayerSource.indexOf('function LessonActionMedia'),
  webPlayerSource.indexOf('const LIVE_PRONUNCIATION_SYLLABLES'),
);

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
  cardViewSource,
  /contentFit="cover"/,
  'Native action clips must cover their media frame instead of letterboxing.',
);

assert.match(
  cardViewSource,
  /actionMediaLayer:\s*\{[^}]*transform: \[\{ scale: 1\.025 \}\]/s,
  'Native action clips must slightly overscan the clipped frame so decoder edge bars cannot show.',
);

assert.match(
  webActionMediaSource,
  /objectFit: "cover"[\s\S]*?transform: "scale\(1\.025\)"/,
  'Web action clips must cover and slightly overscan their clipped frame.',
);

assert.doesNotMatch(
  webActionMediaSource,
  /objectFit: "contain"/,
  'Web action clips must never use contain, which exposes black sidebars.',
);

assert.match(
  configSource,
  /lesson-assets\/\$\{encodeURIComponent\(name\)\}\?v=\$\{LESSON_VIDEO_CACHE_VERSION\}/,
  'Lesson video URLs must be versioned so corrected media replaces stale mobile caches.',
);

console.log('Unified video media checks passed.');
