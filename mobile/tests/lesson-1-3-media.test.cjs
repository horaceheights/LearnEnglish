const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const imageName = 'they_boy_girl_are_running.webp';
const imagePath = path.join(mobileRoot, 'assets', 'lesson-assets', imageName);
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const audioSources = fs.readFileSync(path.join(mobileRoot, 'src', 'courseAudioSources.ts'), 'utf8');
const lessonScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'), 'utf8');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-3-two-people.json'),
  'utf8',
));
const registry = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'backend', 'approved-course-audio', 'registry.json'),
  'utf8',
));
const staticManifest = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'frontend', 'lib', 'courseAudioManifest.json'),
  'utf8',
));
const staticAudioRoot = path.join(repositoryRoot, 'frontend', 'public', 'audio-cache');

assert.ok(fs.existsSync(imagePath), 'The Lesson 1.3 Are still must travel in the Preview OTA.');
assert.ok(fs.statSync(imagePath).size > 100_000, 'The bundled Are still appears incomplete.');
assert.ok(
  imageSources.includes(`require('../assets/lesson-assets/${imageName}')`),
  'The Lesson 1.3 Are still needs a literal Metro require.',
);

const correctedCards = [
  lesson.cards.find((card) => card.stage === 'Learn' && card.audio_text === 'They'),
  lesson.cards.find((card) => card.stage === 'Learn' && card.audio_text === 'They are eating.'),
];
assert.ok(correctedCards.every(Boolean), 'Lesson 1.3 must introduce They before using are in a complete sentence.');

for (const card of correctedCards) {
  const promptAssets = card.audio_assets.filter((asset) => (
    asset.purpose === 'prompt'
    && asset.text === card.audio_text
    && asset.mode === 'prompt'
    && asset.variant === 'prompt'
  ));
  assert.equal(
    promptAssets.length,
    1,
    `Lesson 1.3 ${card.audio_text} must resolve one exact persistent prompt asset.`,
  );
  const asset = promptAssets[0];
  const correctOption = card.options.find((option) => option.id === card.correct_option_id);
  assert.equal(
    asset.image_ref,
    card.prompt_image_url?.trim() || correctOption?.image_url?.trim(),
    `Lesson 1.3 ${card.audio_text} audio must stay linked to its exact image.`,
  );
  const binding = registry.bindings[asset.id];
  if (binding) {
    const take = registry.takes[binding.take_id];
    assert.ok(take, `Lesson 1.3 ${card.audio_text} binding must resolve an approved take.`);
    const takePath = path.join(repositoryRoot, 'backend', 'approved-course-audio', take.file);
    assert.ok(fs.existsSync(takePath), `Lesson 1.3 ${card.audio_text} approved take must exist.`);
    assert.equal(
      crypto.createHash('sha256').update(fs.readFileSync(takePath)).digest('hex'),
      take.audio_sha256,
      `Lesson 1.3 ${card.audio_text} approved take changed without review.`,
    );
  } else {
    assert.ok(
      ['teacher', 'question', 'answer'].includes(asset.speaker_role),
      `Lesson 1.3 ${card.audio_text} may use the reviewed static seed only for a neutral voice.`,
    );
    assert.notEqual(
      asset.variant,
      'completion-prompt',
      `Lesson 1.3 ${card.audio_text} completion prompts must use an exact approved binding.`,
    );
    const staticKey = [asset.text, asset.mode, 'en-US', asset.variant].join('\n');
    const staticFilename = staticManifest[staticKey];
    assert.ok(
      staticFilename,
      `Lesson 1.3 ${card.audio_text} must have an approved registry binding or reviewed static seed.`,
    );
    const staticPath = path.join(staticAudioRoot, staticFilename);
    assert.ok(fs.existsSync(staticPath), `Lesson 1.3 ${card.audio_text} reviewed static seed must exist.`);
    assert.ok(
      fs.statSync(staticPath).size > 0,
      `Lesson 1.3 ${card.audio_text} reviewed static seed must not be empty.`,
    );
  }
}

assert.doesNotMatch(
  audioSources,
  /require\(['"]\.\.\/assets\/course-audio\//,
  'Lesson playback must not depend on a bundled-audio fallback table.',
);
assert.match(
  lessonScreen,
  /findCourseAudioAsset\(card, purpose, mode, variant, text\)[\s\S]*?courseAudioAssetSource\(asset\)/,
  'Lesson playback must resolve the exact immutable card asset.',
);

console.log('Lesson 1.3 persistent They/are media checks passed.');
