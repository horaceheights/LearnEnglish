const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
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

const requiredUnitTwoReplacementsByLesson = new Map([
  ['2.8', ['unit2_near_red_book.webp', 'unit2_six_white_bags.webp']],
  ['2.9', ['unit2_six_white_bags.webp']],
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

const requiredAssets = [
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
  'unit2_near_red_book.webp',
  'unit2_six_white_bags.webp',
  'unit2_mission_two_blue_cars.webp',
  'unit2_mission_three_green_books.webp',
  'unit2_mission_four_yellow_pens.webp',
];

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

assert.doesNotMatch(mediaBuilder, /fallback_files\s*=/, 'generic Ana/Luis media fallback must not return');
assert.match(mediaBuilder, /Generic person or object fallbacks are prohibited/);

console.log('Lesson media semantic guardrails passed.');
