const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const configPath = path.resolve(__dirname, '../src/config.ts');
const actionVideosPath = path.resolve(__dirname, '../src/actionVideos.ts');
const normalizerPath = path.resolve(__dirname, '../../scripts/generate_lesson_action_videos.py');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const configSource = fs.readFileSync(configPath, 'utf8');
const actionVideosSource = fs.readFileSync(actionVideosPath, 'utf8');
const normalizerSource = fs.readFileSync(normalizerPath, 'utf8');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const webPlayerSource = fs.readFileSync(webPlayerPath, 'utf8');
const webActionMediaSource = webPlayerSource.slice(
  webPlayerSource.indexOf('function LessonActionMedia'),
  webPlayerSource.indexOf('const LIVE_PRONUNCIATION_SYLLABLES'),
);

assert.match(
  cardViewSource,
  /actionVideo \? \(\s*<LessonActionMedia/,
  'Mapped action cards must render the video surface before selection, not a separate still image.',
);

assert.match(
  cardViewSource,
  /shouldPlay=\{playActionVideo\}/,
  'The shared video surface must stay paused until a single-card lesson or correct selection plays it.',
);

assert.match(
  lessonScreenSource,
  /optionsInteractive=\{!isAutomaticSingleCard\}/,
  'Automatic single-card lessons must disable answer selection.',
);

assert.match(
  cardViewSource,
  /onPress=\{optionsInteractive \? \(\) => onSelect\(option\.id\) : undefined\}/,
  'A single-card video must not retain a nested tap target when answer selection is disabled.',
);

assert.match(
  cardViewSource,
  /!videoReady\s*\?\s*\(\s*<Image[\s\S]*?source=\{lessonImageSource\(imageUrl\)\}/,
  'Video cards must show their exact matching still until the first video frame is ready.',
);

assert.match(
  cardViewSource,
  /if \(reduceMotion \|\| videoFailed\)[\s\S]*?resizeMode="contain"[\s\S]*?!videoReady\s*\?\s*\([\s\S]*?resizeMode="contain"/,
  'Video fallbacks and cold-load posters must preserve the complete subject without cropping heads.',
);

assert.match(
  cardViewSource,
  /onFirstFrameRender=\{\(\) => \{[\s\S]*?setVideoReady\(true\)/,
  'The cold-load poster must disappear as soon as the mounted video renders its first frame.',
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

assert.match(
  actionVideosSource,
  /family_father_working:\s*require\('\.\.\/assets\/lesson-videos\/father-working-scene-v3\.mp4'\)/,
  'The father-working card must bundle its safe-framed clip so Preview cannot fall back to a cropped square poster.',
);

for (const filename of ['father-working-scene-v3.mp4', 'mother-cooking-scene-v2.mp4']) {
  const bundledVideoPath = path.resolve(__dirname, '../assets/lesson-videos', filename);
  assert.ok(fs.statSync(bundledVideoPath).size > 0, `${filename} must be present in the Preview bundle.`);
}

assert.match(
  normalizerSource,
  /SAFE_FOREGROUND_HEIGHT = 338[\s\S]*?force_original_aspect_ratio=decrease\[subject\]/,
  'Normalized portrait action footage must retain a vertical safe inset for the mobile cover crop.',
);

assert.match(
  actionVideosSource,
  /family_mother_cooking:\s*require\('\.\.\/assets\/lesson-videos\/mother-cooking-scene-v2\.mp4'\)/,
  'The mother-cooking card must bundle the normalized clip so Preview cannot load the stale black-sidebar export.',
);

console.log('Unified video media checks passed.');
