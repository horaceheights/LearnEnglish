const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mediaManifest = require(path.join(repositoryRoot, 'docs', 'product', 'a1-media-manifest.json'));
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const courseScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'CourseScreen.tsx'), 'utf8');
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

const cardFor = (number, stage, prompt) => {
  const result = lesson(number).cards.find((card) => card.stage === stage && card.prompt === prompt);
  assert.ok(result, `missing ${number} ${stage} card ${JSON.stringify(prompt)}`);
  return result;
};

const cardBySlide = (number, stage, slideId) => {
  const result = lesson(number).cards.find(
    (card) => card.stage === stage && card.slide_id === slideId,
  );
  assert.ok(result, `missing ${number} ${stage} slide ${slideId}`);
  return result;
};

const mediaFilenames = (value, filenames = []) => {
  if (Array.isArray(value)) {
    for (const item of value) mediaFilenames(item, filenames);
    return filenames;
  }
  if (!value || typeof value !== 'object') return filenames;

  for (const [key, item] of Object.entries(value)) {
    if ((key === 'image_url' || key === 'prompt_image_url') && typeof item === 'string' && item) {
      filenames.push(path.basename(item.split(/[?#]/, 1)[0]));
    } else {
      mediaFilenames(item, filenames);
    }
  }
  return filenames;
};

const unitOneReview = learnMedia('1.9');
const expectedUnitOneReview = new Map([
  ['The boy is eating. He is eating.', 'a1_u1_review_boy_eating.webp'],
  ['The girl is writing. She is writing.', 'a1_u1_review_girl_writing.webp'],
  ['The man is reading. He is reading.', 'a1_u1_review_man_reading.webp'],
  ['The woman is drinking. She is drinking.', 'a1_u1_review_woman_drinking.webp'],
  ['The boy and the girl are running. They are running.', 'a1_u1_review_children_running.webp'],
  ['The children are swimming.', 'a1_u1_review_children_swimming.webp'],
  ['The baby is sleeping.', 'a1_u1_review_baby_sleeping.webp'],
  ['The brothers are studying.', 'a1_u1_review_brothers_studying.webp'],
  ['The sisters are playing.', 'a1_u1_review_sisters_playing.webp'],
  ['They are a family.', 'a1_u1_review_family_story.webp'],
  ['Who is he? He is the father. The father is working.', 'a1_u1_review_father_working.webp'],
  ['Who is she? She is the mother. The mother is cooking.', 'a1_u1_review_mother_cooking.webp'],
  ['Who are they? They are the parents. The parents are talking.', 'a1_u1_review_parents_talking.webp'],
  ['Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.', 'a1_u1_review_grandparents_talking.webp'],
]);
assert.deepEqual(unitOneReview, expectedUnitOneReview, 'Lesson 1.9 must use the complete fresh-scene story in order');
assert.equal(
  mediaFilenames(lesson('1.9')).every((filename) => filename.startsWith('a1_u1_review_')),
  true,
  'every Lesson 1.9 card and distractor must stay inside the newly authored review media set',
);
assert.equal(
  learnMedia('1.3').get('The boy and the girl'),
  'they_boy_girl.webp',
  'Lesson 1.3 must introduce and through the two-person story instead of an isolated grammar card',
);

const subjectOnlyImages = new Set([
  'boy.webp',
  'girl.webp',
  'man.webp',
  'woman.webp',
  'they_boy_girl.webp',
]);
const personActionImages = new Set([
  'boy_is_eating.webp',
  'man_is_drinking.webp',
  'girl_is_reading.webp',
  'woman_is_writing.webp',
  'man_is_sitting.webp',
  'boy_is_swimming.webp',
  'girl_is_sleeping.webp',
  'they_boy_girl_are_eating.webp',
  'they_boy_girl_are_reading.webp',
  'they_boy_girl_are_running.webp',
  'they_boy_girl_are_writing.webp',
]);

for (const number of ['1.2', '1.3']) {
  for (const card of lesson(number).cards) {
    const imageNames = card.options
      .filter((option) => option.image_url)
      .map((option) => path.basename(option.image_url));
    if (!imageNames.length) continue;
    assert.equal(
      imageNames.some((filename) => subjectOnlyImages.has(filename))
        && imageNames.some((filename) => personActionImages.has(filename)),
      false,
      `Lesson ${number} ${card.slide_id} cannot mix subject-only and action choices`,
    );
  }
}

const expectedLessonTwoSubjectImages = ['boy.webp', 'girl.webp', 'man.webp', 'woman.webp'].sort();
for (const [stage, slideId] of [['Recognize', 'R1'], ['Listen', 'A1']]) {
  assert.deepEqual(
    cardBySlide('1.2', stage, slideId).options
      .map((option) => path.basename(option.image_url))
      .sort(),
    expectedLessonTwoSubjectImages,
    `Lesson 1.2 ${slideId} must offer exactly one boy for the subject-only prompt`,
  );
}

const reviewedFatherReadingAsset = 'a1_u1_mission_father_reading_clear.webp';
const fatherReadingSlides = lesson('1.10').cards
  .filter((card) => mediaFilenames(card).includes(reviewedFatherReadingAsset))
  .map((card) => card.slide_id)
  .sort();
assert.deepEqual(
  fatherReadingSlides,
  ['A1', 'L3', 'R3', 'S2', 'U3'],
  'every Lesson 1.10 father-reading use must share the reviewed printed-clue scene',
);
assert.deepEqual(
  lesson('1.10').cards
    .filter((card) => mediaFilenames(card).includes('a1_u1_mission_father_reading.webp'))
    .map((card) => card.slide_id)
    .sort(),
  ['R2', 'S1', 'U1'],
  'the face-visible father scene is reserved for identity and word-building cards',
);
const bundledFatherReading = fs.readFileSync(
  path.join(mobileRoot, 'assets', 'lesson-assets', reviewedFatherReadingAsset),
);
assert.equal(
  crypto.createHash('sha256').update(bundledFatherReading).digest('hex'),
  'ab6404c7041d182e0b38ae45a80c6f688f21d02137a83384608a809fb70e9dd1',
  'changing the reviewed printed-clue pixels requires a new at-mobile-size visual review',
);

const singularBrother = cardBySlide('1.4', 'Recognize', 'R6');
assert.equal(singularBrother.prompt_image_url, '/lesson-assets/boy.webp');
assert.equal(
  singularBrother.options.find((option) => option.id === singularBrother.correct_option_id)?.label,
  'He is a brother.',
  'the singular brother transfer must join the family noun to the already-known pronoun frame',
);
const pluralBrothers = cardFor('1.4', 'Recognize', 'They are brothers.');
assert.deepEqual(
  pluralBrothers.options.map((option) => path.basename(option.image_url)),
  ['family_brothers.webp', 'family_sisters.webp'],
  'brothers must use the exclusive brother/sister contrast',
);
const pluralSisters = cardFor('1.4', 'Recognize', 'They are sisters.');
for (const ambiguousFamilyDistractor of ['family_babies.webp', 'family_children.webp']) {
  assert.equal(
    pluralSisters.options.some((option) => path.basename(option.image_url) === ambiguousFamilyDistractor),
    false,
    `${ambiguousFamilyDistractor} can contain sisters and must not be used as a visibly false distractor`,
  );
}

const boyCannotCross = cardBySlide('6.6', 'Recognize', 'R8');
assert.equal(boyCannotCross.prompt, 'The boy cannot cross the street.');
assert.equal(boyCannotCross.audio_text, 'The boy cannot cross the street.');
assert.equal(boyCannotCross.correct_option_id, 'boy-waits-at-red-signal-3');
assert.equal(
  boyCannotCross.options.find((option) => option.id === 'pair-waits-at-red-signal-4')?.image_url,
  '/lesson-assets/a1_scene_pair-waits-at-red-signal_5078634_four-card.webp',
  'the adult-pair distractor is valid only while the prompt explicitly requires the boy',
);

const pharmacyOnRight = cardBySlide('6.7', 'Listen', 'A5');
assert.equal(pharmacyOnRight.audio_text, 'The pharmacy is on the right.');
assert.equal(pharmacyOnRight.correct_option_id, 'pharmacy-right-4');
assert.equal(
  pharmacyOnRight.options.filter((option) => option.id.includes('-right-')).length,
  3,
  'the audio must name the place because three authored options are on the right',
);

for (const number of ['3.9', '3.10']) {
  const media = learnMedia(number);
  assert.equal(media.get('I am twenty years old.'), 'a1_scene_ana_age_20.webp');
  assert.equal(media.get('I am from Mexico. I am Mexican.'), 'a1_scene_ana_mexico.webp');
  assert.equal(media.get('I am a teacher. I have a book.'), 'a1_scene_ana_teacher_book.webp');
}
assert.equal(learnMedia('3.9').get('My name is Ana.'), 'a1_scene_ana_name.webp');

const requiredUnitTwoReplacementsByLesson = new Map([
  [
    '2.8',
    [
      'unit2_near_red_book.webp',
      'unit2_six_white_bags.webp',
      'a1_scene_six-white-bags_f412a8a_four-card.webp',
    ],
  ],
  [
    '2.9',
    ['unit2_six_white_bags.webp', 'a1_scene_six-white-bags_f412a8a_four-card.webp'],
  ],
  [
    '2.10',
    [
      'unit2_mission_two_blue_cars.webp',
      'unit2_mission_three_green_books.webp',
      'unit2_mission_four_yellow_pens.webp',
    ],
  ],
]);

for (const [number, expectedFilenames] of requiredUnitTwoReplacementsByLesson) {
  const filenames = new Set(mediaFilenames(lesson(number)));
  for (const filename of expectedFilenames) {
    assert.ok(filenames.has(filename), `lesson ${number} must use corrected semantic asset ${filename}`);
  }
}

const rejectedUnitTwoAssets = [
  'a1_scene_mission-two-blue-cars_84c4ba2.webp',
  'a1_scene_mission-three-green-books_d248942.webp',
  'a1_scene_mission-four-yellow-pens_fe7d7c4.webp',
  'a1_scene_near-red-book_0e763e1.webp',
  'a1_scene_six-white-bags_f412a8a.webp',
];
const allCourseMedia = new Set(mediaFilenames(course));
for (const filename of rejectedUnitTwoAssets) {
  assert.equal(
    allCourseMedia.has(filename),
    false,
    `${filename} failed semantic review and must not be referenced by any of the 70 lessons`,
  );
  assert.equal(
    courseScreen.includes(filename),
    false,
    `${filename} failed semantic review and must not return as a unit or lesson browser image`,
  );
}
assert.ok(
  courseScreen.includes("'unit-2': { image: 'unit2_mission_two_blue_cars.webp'"),
  'the Unit 2 browser image must use the exact corrected two-blue-cars replacement',
);

const requiredAssets = [];

const demonstrativeContracts = new Map(
  mediaManifest.assets
    .filter((asset) => (
      /^(near|far)-(book|phone|bag|chair)$/.test(asset.concept)
      && asset.review_contexts.some((context) => context.sub_lesson_id === '2.5')
    ))
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

requiredAssets.push(
  'a1_u1_review_baby_sleeping.webp',
  'a1_u1_review_boy_eating.webp',
  'a1_u1_review_brothers_studying.webp',
  'a1_u1_review_children_running.webp',
  'a1_u1_review_children_swimming.webp',
  'a1_u1_review_family_story.webp',
  'a1_u1_review_father_working.webp',
  'a1_u1_review_girl_writing.webp',
  'a1_u1_review_grandparents_talking.webp',
  'a1_u1_review_man_reading.webp',
  'a1_u1_review_mother_cooking.webp',
  'a1_u1_review_parents_talking.webp',
  'a1_u1_review_sisters_playing.webp',
  'a1_u1_review_woman_drinking.webp',
  'a1_scene_ana_name.webp',
  'a1_scene_ana_age_20.webp',
  'a1_scene_ana_mexico.webp',
  'a1_scene_ana_teacher_book.webp',
  'a1_scene_luis_name.webp',
  'a1_scene_luis_age_18.webp',
  'a1_scene_luis_usa.webp',
  'a1_scene_luis_driver.webp',
  'unit2_near_red_book.webp',
  'unit2_six_white_bags.webp',
  'unit2_mission_two_blue_cars.webp',
  'unit2_mission_three_green_books.webp',
  'unit2_mission_four_yellow_pens.webp',
);

for (const filename of requiredAssets) {
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

const semanticAssetFilenames = [...new Set(mediaManifest.assets.map((asset) => asset.filename))];
for (const filename of semanticAssetFilenames) {
  const canonicalPath = path.join(repositoryRoot, 'Lessons', 'Lesson1', 'images', filename);
  const mobilePath = path.join(mobileRoot, 'assets', 'lesson-assets', filename);
  const frontendPath = path.join(repositoryRoot, 'frontend', 'public', 'lesson-assets', filename);
  assert.ok(fs.existsSync(canonicalPath), `${filename} semantic canonical asset must exist`);
  assert.ok(fs.existsSync(mobilePath), `${filename} semantic mobile copy must exist`);
  assert.ok(fs.existsSync(frontendPath), `${filename} semantic frontend copy must exist`);
  const canonicalBytes = fs.readFileSync(canonicalPath);
  assert.deepEqual(fs.readFileSync(mobilePath), canonicalBytes, `${filename} mobile copy must be exact`);
  assert.deepEqual(fs.readFileSync(frontendPath), canonicalBytes, `${filename} frontend copy must be exact`);
}

assert.doesNotMatch(mediaBuilder, /fallback_files\s*=/, 'generic Ana/Luis media fallback must not return');
assert.match(mediaBuilder, /Generic person or object fallbacks are prohibited/);

console.log('Lesson media semantic guardrails passed.');
