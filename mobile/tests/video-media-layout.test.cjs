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

function webpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `${filePath} is not a RIFF image`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `${filePath} is not WebP`);
  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8X') return [1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3)];
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  assert.fail(`Unsupported WebP chunk ${chunk} in ${filePath}`);
}

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
  cardViewSource,
  /lessonActionVideo\(option\.image_url, card\.options\.length\)/,
  'Native action media must receive the option count so two-card variants cannot leak to other layouts.',
);

assert.match(
  cardViewSource,
  /sourceOverride=\{card\.options\.length === 2 \? actionVideo\?\.posterSource : undefined\}/,
  'Only two-choice native cards may replace the ordinary still with a matched video poster.',
);

assert.match(
  optionMediaImageSource,
  /sourceOverride\?: ImageSourcePropType[\s\S]*?sourceOverride \?\? lessonOptionImageSource\(imageUrl\)/,
  'The shared still renderer must accept an explicit reviewed video-poster source.',
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
  /lessonOptionImageSource\(imageUrl\)[\s\S]*?const shouldContain = !sourceIsThreeByTwo[\s\S]*?resizeMode=\{shouldContain \? 'contain' : 'cover'\}/,
  'Reviewed 3:2 still posters must fill edge-to-edge, with contain reserved for an unexpected legacy fallback.',
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
  /const useFullWidthSingleActionVideo = useExpandedSingleActionVideo && !isTabletLandscape/,
  'Automatic action clips must keep full-width presentation on phones without overriding the tablet width cap.',
);

assert.match(
  cardViewSource,
  /useFullWidthSingleActionVideo \? styles\.singleActionVideoOption : null/,
  'Only non-tablet automatic action clips may apply the full-width option override.',
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
  family_parents_talking: 'parents-talking-scene-v5.mp4',
};

const twoCardVideoVariants = {
  family_brother_studying: 'brother-studying-two-card-v1.mp4',
  family_children_playing: 'children-playing-two-card-v1.mp4',
  family_father_working: 'father-working-two-card-v1.mp4',
};

const twoCardPosters = {
  boy_is_drinking: 'boy_is_drinking-two-card-poster.webp',
  boy_is_eating: 'boy_is_eating-two-card-poster.webp',
  boy_is_reading: 'boy_is_reading-two-card-poster.webp',
  boy_is_running: 'boy_is_running-two-card-poster.webp',
  boy_is_swimming: 'boy_is_swimming-two-card-poster.webp',
  family_brother_studying: 'family_brother_studying-two-card-poster.webp',
  family_children_playing: 'family_children_playing-two-card-poster.webp',
  family_children_studying: 'family_children_studying-two-card-poster.webp',
  family_father_working: 'family_father_working-two-card-poster.webp',
  family_mother_cooking: 'family_mother_cooking-two-card-poster.webp',
  family_parents_talking: 'family_parents_talking-two-card-poster.webp',
  girl_is_drinking: 'girl_is_drinking-two-card-poster.webp',
  girl_is_sleeping: 'girl_is_sleeping-two-card-poster.webp',
  girl_is_walking: 'girl_is_walking-two-card-poster.webp',
  girl_is_writing: 'girl_is_writing-two-card-poster.webp',
  they_boy_girl_are_running: 'they_boy_girl_are_running-two-card-poster.webp',
};

const lessonActionVideoBlock = actionVideosSource.match(/const LESSON_ACTION_VIDEOS:[^{]+\{([\s\S]*?)\n\};/);
assert.ok(lessonActionVideoBlock, 'The native lesson action-video map must remain inspectable.');
const lessonActionImageKeys = new Set(
  [...lessonActionVideoBlock[1].matchAll(/^\s{2}([a-zA-Z0-9_]+):/gm)].map((match) => match[1]),
);
const usedTwoCardActionKeys = new Set();
const generatedLessonsRoot = path.resolve(__dirname, '../src/generated');
for (const lessonFilename of fs.readdirSync(generatedLessonsRoot)) {
  if (!/^lesson-.*\.json$/.test(lessonFilename)) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedLessonsRoot, lessonFilename), 'utf8'));
  for (const card of lesson.cards || []) {
    if ((card.options || []).length !== 2) continue;
    for (const option of card.options || []) {
      const imageKey = path.basename(String(option.image_url || '').split(/[?#]/, 1)[0]).replace(/\.[^.]+$/, '');
      if (lessonActionImageKeys.has(imageKey)) usedTwoCardActionKeys.add(imageKey);
    }
  }
}
assert.deepEqual(
  [...usedTwoCardActionKeys].sort(),
  Object.keys(twoCardPosters).sort(),
  'Every action video used by a two-choice A1 card must have exactly one reviewed matching poster.',
);

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

for (const [imageKey, filename] of Object.entries(twoCardVideoVariants)) {
  for (const videoPath of [
    path.resolve(__dirname, '../assets/lesson-videos', filename),
    path.resolve(__dirname, '../../frontend/public/lesson-assets', filename),
  ]) {
    assert.ok(fs.statSync(videoPath).size > 0, `${filename} must exist in both native and web media.`);
  }
  assert.ok(actionVideosSource.includes(`${imageKey}: '${filename}'`), `${filename} is missing from the native two-card map.`);
  assert.ok(webPlayerSource.includes(`"${imageKey}": "${filename}"`), `${filename} is missing from the web two-card map.`);
}

for (const [imageKey, filename] of Object.entries(twoCardPosters)) {
  const nativePoster = path.resolve(__dirname, '../assets/lesson-video-posters', filename);
  const webPoster = path.resolve(__dirname, '../../frontend/public/lesson-video-posters', filename);
  assert.deepEqual(webpDimensions(nativePoster), [1536, 1024], `${filename} must use the shared 3:2 canvas.`);
  assert.deepEqual(webpDimensions(webPoster), [1536, 1024], `${filename} must match across web and native.`);
  assert.ok(actionVideosSource.includes(`require('../assets/lesson-video-posters/${filename}')`), `${filename} must use a literal Metro require.`);
  assert.ok(webPlayerSource.includes(`"${imageKey}": "${filename}"`), `${filename} is missing from the web poster map.`);
}

assert.match(
  webPlayerSource,
  /lessonActionVideo\(option\.image_url, currentCard\.options\.length\)[\s\S]*?currentCard\.options\.length === 2 && actionVideoName[\s\S]*?lessonTwoCardActionPosterSrc\(option\.image_url\)/,
  'Web must scope matched action posters and video variants to exactly two-choice cards.',
);

assert.match(
  webActionMediaSource,
  /poster=\{posterSrc \|\| undefined\}/,
  'Web playback must retain the matched poster until the first visible video frame.',
);

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

assert.match(
  normalizerSource,
  /ACTION_SAFE_FOUR_THREE_CROP_SCENES = \{"parents-talking"\}[\s\S]*?scene_id in ACTION_SAFE_FOUR_THREE_CROP_SCENES[\s\S]*?action_crop_height[\s\S]*?flags=lanczos/,
  'The reviewed parents-talking pilot must keep its action-safe 4:3 crop without stretching.',
);

assert.match(
  normalizerSource,
  /TWO_CARD_ACTION_VARIANTS = \{[\s\S]*?brother-studying-two-card-v1\.mp4[\s\S]*?children-playing-two-card-v1\.mp4[\s\S]*?father-working-two-card-v1\.mp4[\s\S]*?normalize_two_card_existing/,
  'Reviewed two-card crop variants must remain reproducible from their original raw clips.',
);

console.log('Unified video media checks passed.');
