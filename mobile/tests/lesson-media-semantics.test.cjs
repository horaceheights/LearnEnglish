const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mediaManifest = require(path.join(repositoryRoot, 'docs', 'product', 'a1-media-manifest.json'));
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const mediaBuilder = fs.readFileSync(path.join(repositoryRoot, 'scripts', 'build_a1_media_composites.py'), 'utf8');

assert.equal(course.length, 70, 'semantic media QA must cover all 70 A1 lessons');

const lesson = (number) => {
  const result = course.find((item) => item.sub_lesson_id === number);
  assert.ok(result, `missing lesson ${number}`);
  return result;
};

const learnMedia = (number) => new Map(
  lesson(number).cards
    .filter((card) => card.stage === 'Learn')
    .map((card) => [card.prompt, path.basename(card.options[0]?.image_url || '')]),
);

const unitOneReview = learnMedia('1.9');
assert.equal(unitOneReview.has('Is, are, and not'), false, 'grammar review concepts must not share one unrelated scene');
assert.equal(unitOneReview.get('He, she, and they'), 'a1_grammar_he_she_they.webp');
assert.equal(unitOneReview.get('Is'), 'a1_grammar_is.webp');
assert.equal(unitOneReview.get('Are'), 'a1_grammar_are.webp');
assert.equal(unitOneReview.get('Not'), 'a1_grammar_not.webp');
assert.equal(learnMedia('1.3').get('And'), 'a1_grammar_and.webp');

for (const number of ['3.9', '3.10']) {
  const media = learnMedia(number);
  assert.equal(media.get('I am twenty years old.'), 'a1_scene_ana_age_20.webp');
  assert.equal(media.get('I am from Mexico. I am Mexican.'), 'a1_scene_ana_mexico.webp');
  assert.equal(media.get('I am a teacher. I have a book.'), 'a1_scene_ana_teacher_book.webp');
}
assert.equal(learnMedia('3.9').get('My name is Ana.'), 'a1_scene_ana_name.webp');

const demonstrativeContracts = new Map(
  mediaManifest.assets
    .filter((asset) => /^(near|far)-(book|phone|bag|chair)$/.test(asset.concept))
    .map((asset) => [asset.concept, asset]),
);
const demonstrativeNouns = ['book', 'phone', 'bag', 'chair'];
for (const noun of demonstrativeNouns) {
  const near = demonstrativeContracts.get(`near-${noun}`);
  const far = demonstrativeContracts.get(`far-${noun}`);
  assert.ok(near, `missing near-${noun} demonstrative contract`);
  assert.ok(far, `missing far-${noun} demonstrative contract`);
  assert.match(near.description, /left hand (?:holds|grips) the near .+ while right hand points at it/);
  assert.match(near.description, /identical far|identical far chair/);
  assert.match(
    far.description,
    new RegExp(`left hand keeps (?:holding|gripping) (?:the )?(?:large )?near ${noun} while right hand points from below at .*identical far ${noun}`),
  );
  assert.match(far.description, /without overlapping or touching it/);

  for (const filename of [near.filename, far.filename]) {
    const canonicalPath = path.join(repositoryRoot, 'Lessons', 'Lesson1', 'images', filename);
    const mobilePath = path.join(mobileRoot, 'assets', 'lesson-assets', filename);
    assert.ok(fs.existsSync(canonicalPath), `${filename} must exist in canonical lesson assets`);
    assert.ok(fs.existsSync(mobilePath), `${filename} must exist in bundled mobile assets`);
    assert.deepEqual(
      fs.readFileSync(mobilePath),
      fs.readFileSync(canonicalPath),
      `${filename} mobile copy must match the reviewed canonical asset`,
    );
  }
}
assert.match(demonstrativeContracts.get('near-chair').description, /near chair is substantially larger/);
assert.match(demonstrativeContracts.get('far-chair').description, /strong size contrast/);
assert.match(demonstrativeContracts.get('near-bag').description, /far bag remains clearly readable/);

const reviewedAssets = [
  'a1_grammar_and.webp',
  'a1_grammar_he_she_they.webp',
  'a1_grammar_is.webp',
  'a1_grammar_are.webp',
  'a1_grammar_not.webp',
  'a1_scene_ana_name.webp',
  'a1_scene_ana_age_20.webp',
  'a1_scene_ana_mexico.webp',
  'a1_scene_ana_teacher_book.webp',
  'a1_scene_luis_name.webp',
  'a1_scene_luis_age_18.webp',
  'a1_scene_luis_usa.webp',
  'a1_scene_luis_driver.webp',
];

for (const filename of reviewedAssets) {
  for (const root of [
    path.join(mobileRoot, 'assets', 'lesson-assets'),
    path.join(repositoryRoot, 'Lessons', 'Lesson1', 'images'),
    path.join(repositoryRoot, 'frontend', 'public', 'lesson-assets'),
  ]) {
    assert.ok(fs.existsSync(path.join(root, filename)), `${filename} must exist in ${root}`);
  }
  assert.match(
    imageSources,
    new RegExp(`['"]${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*:\\s*require\\(`),
    `${filename} must be bundled through a literal Metro require`,
  );
}

assert.doesNotMatch(mediaBuilder, /fallback_files\s*=/, 'generic Ana/Luis media fallback must not return');
assert.match(mediaBuilder, /Generic person or object fallbacks are prohibited/);

console.log('Lesson media semantic guardrails passed.');
