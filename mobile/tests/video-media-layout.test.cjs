const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const optionMediaImagePath = path.resolve(__dirname, '../src/components/OptionMediaImage.tsx');
const configPath = path.resolve(__dirname, '../src/config.ts');
const actionVideosPath = path.resolve(__dirname, '../src/actionVideos.ts');
const normalizerPath = path.resolve(__dirname, '../../scripts/generate_lesson_action_videos.py');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const optionMediaImageSource = fs.readFileSync(optionMediaImagePath, 'utf8');
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
  /actionVideo && playActionVideo \? \(\s*<LessonActionMedia/,
  'Multi-choice cards must not mount the video renderer until selected playback is requested.',
);

assert.match(
  cardViewSource,
  /if \(!shouldPlay \|\| reduceMotion \|\| videoFailed\)[\s\S]*?<OptionMediaImage imageUrl=\{imageUrl\}/,
  'Multi-choice action cards must keep their matching still visible until playback actually starts.',
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
  /!videoReady\s*\?\s*\(\s*<OptionMediaImage imageUrl=\{imageUrl\} poster/,
  'Video cards must show their reviewed matching option still until the first video frame is ready.',
);

assert.match(
  optionMediaImageSource,
  /preserveSubject = false[\s\S]*?lessonOptionImageSource\(imageUrl\)[\s\S]*?resizeMode=\{preserveSubject \? 'contain' : 'cover'\}/,
  'The reviewed 3:2 still layer must keep cover as its default for image options and video posters.',
);

assert.match(
  cardViewSource,
  /if \(!shouldPlay \|\| reduceMotion \|\| videoFailed\)[\s\S]*?<OptionMediaImage imageUrl=\{imageUrl\}/,
  'Video fallbacks and cold-load posters must use the same reviewed 3:2 still layer as image options.',
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

const solidSideFillVideos = {
  family_brother_studying: 'brother-studying-scene-v3.mp4',
  family_children_playing: 'children-playing-scene-v3.mp4',
  family_father_working: 'father-working-scene-v4.mp4',
  girl_is_walking: 'girl-walking-scene-v3.mp4',
  family_mother_cooking: 'mother-cooking-scene-v3.mp4',
  family_parents_talking: 'parents-talking-scene-v3.mp4',
};

for (const [imageKey, filename] of Object.entries(solidSideFillVideos)) {
  const bundledVideoPath = path.resolve(__dirname, '../assets/lesson-videos', filename);
  assert.ok(fs.statSync(bundledVideoPath).size > 0, `${filename} must be present in the Preview bundle.`);
  assert.ok(
    actionVideosSource.includes(`require('../assets/lesson-videos/${filename}')`),
    `${filename} must use a literal Metro require.`,
  );
  assert.ok(
    webPlayerSource.includes(`"${imageKey}": "${filename}"`),
    `${filename} must stay aligned between web and native mappings.`,
  );
}

assert.match(
  normalizerSource,
  /SOLID_SIDE_FILL_COLOR = "0xf2ebde"[\s\S]*?crop_width \/ crop_height < 1\.6[\s\S]*?force_original_aspect_ratio=decrease\[subject\]/,
  'Square-source action footage must retain a safe inset over the shared warm-neutral background.',
);

assert.doesNotMatch(
  normalizerSource,
  /gblur|boxblur/,
  'Action-video normalization must not use blurred side fill.',
);

console.log('Unified video media checks passed.');
