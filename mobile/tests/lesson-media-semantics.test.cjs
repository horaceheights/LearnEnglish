const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');
const vm = require('node:vm');
const crypto = require('node:crypto');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mediaManifest = require(path.join(repositoryRoot, 'docs', 'product', 'a1-media-manifest.json'));
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const courseScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'CourseScreen.tsx'), 'utf8');
const mediaBuilder = fs.readFileSync(path.join(repositoryRoot, 'scripts', 'build_a1_media_composites.py'), 'utf8');

const expectedParallelTextBanks = [
  ['1.2', 'R6', ['The man is drinking. He is drinking.', 'The boy is eating. He is eating.', 'The girl is reading. She is reading.']],
  ['1.2', 'R8', ['The girl is reading. She is reading.', 'The man is drinking. He is drinking.', 'The woman is writing. She is writing.']],
  ['1.2', 'R10', ['The woman is writing. She is writing.', 'The boy is eating. He is eating.', 'The girl is reading. She is reading.']],
  ['1.2', 'A3', ['Drinking', 'Eating', 'Reading']],
  ['1.2', 'A6', ['The girl is reading. She is reading.', 'The man is drinking. He is drinking.', 'The woman is writing. She is writing.']],
  ['1.3', 'R2', ['They', 'He', 'She']],
  ['1.3', 'R5', ['The man is sitting.', 'The man is drinking.', 'The boy is swimming.']],
  ['1.3', 'A3', ['They are running.', 'They are eating.', 'They are reading.']],
  ['1.3', 'A6', ['She is sleeping.', 'She is reading.', 'She is writing.']],
  ['1.10', 'R6', ['The children are swimming.', 'The brothers are studying.', 'The sisters are playing.']],
  ['1.10', 'R8', ['The brothers are studying.', 'The children are swimming.', 'The sisters are playing.']],
  ['1.10', 'R10', ['They are a family.', 'They are not a family.', 'They are babies.']],
  ['1.10', 'R12', ['Who is she? She is the mother. The mother is cooking.', 'Who is he? He is the father. The father is working.', 'Who are they? They are the sisters. The sisters are playing.']],
  ['1.10', 'R14', ['Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.', 'Who are they? They are the grandparents. They are running and talking. They are not sleeping.', 'Who are they? They are the grandparents. They are sitting and sleeping. They are not talking.']],
  ['1.10', 'A6', ['The children are swimming.', 'The brothers are studying.', 'The sisters are playing.']],
  ['1.10', 'A8', ['They are a family.', 'They are not a family.', 'They are babies.']],
  ['1.10', 'A9', ['Who are they? They are the parents. The parents are talking.', 'Who is he? He is the father. The father is working.', 'Who is she? She is the mother. The mother is cooking.']],
];
const unitOneActions = /\b(?:eating|drinking|reading|writing|running|sitting|swimming|sleeping|playing|studying|working|cooking|talking)\b/i;
const choiceFrame = (label) => (label.match(/[^.!?]+[.!?]?/g) || []).map((part) => {
  const clause = part.trim();
  if (clause.endsWith('?')) return 'question';
  if (/^(?:he|she|they)$/i.test(clause)) return 'pronoun-label';
  const dimension = unitOneActions.test(clause) ? 'action' : 'identity';
  return `${dimension}-${/\b(?:is|are)\b/i.test(clause) ? 'sentence' : 'label'}`;
}).join('/');

function assertParallelUnitOneChoices(lessons, context) {
  const findLesson = (number) => {
    const found = lessons.find((item) => item.sub_lesson_id === number);
    assert.ok(found, `${context}: missing lesson ${number}`);
    return found;
  };
  const findCard = (number, slideId) => {
    const found = findLesson(number).cards.find((card) => card.slide_id === slideId);
    assert.ok(found, `${context}: missing lesson ${number} ${slideId}`);
    return found;
  };
  for (const [number, slideId, labels] of expectedParallelTextBanks) {
    const card = findCard(number, slideId);
    assert.equal(card.options.every((option) => !option.image_url), true, `${context}: ${number} ${slideId} must remain a text-answer bank`);
    assert.deepEqual(card.options.map((option) => option.label), labels, `${context}: ${number} ${slideId} must preserve its reviewed exclusive, parallel alternatives`);
  }
  for (const number of ['1.2', '1.3', '1.4', '1.5', '1.6', '1.9', '1.10']) {
    const current = findLesson(number);
    for (const card of current.cards.filter((item) => ['Recognize', 'Listen'].includes(item.stage))) {
      const frames = card.options.map((option) => choiceFrame(option.label));
      assert.equal(new Set(frames).size, 1, `${context}: ${number} ${card.slide_id} mixes grammatical/semantic frames: ${card.options.map((option) => option.label).join(' | ')}`);
    }
    const expectedCounts = number === '1.10' ? [14, 14, 10, 8, 8] : [10, 10, 8, 7, 7];
    assert.deepEqual(
      ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'].map((stage) => current.cards.filter((card) => card.stage === stage).length),
      expectedCounts,
      `${context}: ${number} choice repair must preserve stage/card counts`,
    );
    assert.deepEqual([...new Set(current.cards.map((card) => card.stage))], ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'], `${context}: ${number} choice repair must preserve story stage order`);
  }
  assert.equal(findCard('1.10', 'A8').interaction_type, 'a2t3', `${context}: review family listening must use the approved parallel text bank`);
  assert.equal(findLesson('1.10').review_vocabulary.includes('grandchildren'), false, `${context}: review metadata may not claim unretrieved grandchildren`);
  assert.equal(findLesson('1.6').vocabulary.includes('grandchildren'), true, `${context}: keep the new word in lesson 1.6`);
  assert.equal(path.basename(findCard('1.6', 'L10').options[0].image_url), 'family_grandparents_grandchildren.webp', `${context}: L10 must show the grandparents with their grandchildren`);
  assert.equal(path.basename(findCard('1.6', 'R10').prompt_image_url), 'family_grandparents_grandchildren.webp', `${context}: R10 must assess the exact generations scene`);
  assert.deepEqual(findCard('1.6', 'R10').options.map((option) => option.label), ['The grandparents and the grandchildren', 'The parents and the children'], `${context}: preserve the parallel generation phrases`);
}

assertParallelUnitOneChoices(course, 'Embedded Unit 1 course');

assert.equal(course.length, courseContract.lessonCount, 'semantic media QA must cover every A1 lesson');

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

const unitOneReview = learnMedia('1.10');
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
assert.deepEqual(unitOneReview, expectedUnitOneReview, 'Lesson 1.10 must use the complete fresh-scene story in order');
assert.equal(
  mediaFilenames(lesson('1.10')).every((filename) => filename.startsWith('a1_u1_review_')),
  true,
  'every Lesson 1.10 card and distractor must stay inside the newly authored review media set',
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
const cardImage = (card) => path.basename(card.prompt_image_url
  || card.options.find((option) => option.id === card.correct_option_id)?.image_url || '');
const choiceCards = (number) => lesson(number).cards.filter((card) => ['Recognize', 'Listen'].includes(card.stage));
// A wrong picture may never also show what the correct answer says (reviewed 2026-09-23):
// keyed by the correct photo, listing photos that also contain those people.
const unsafeWrongImages = new Map([
  ['family_all_members.webp', ['family_parents_children.webp']],
  ['family_children.webp', ['family_babies.webp', 'family_all_members.webp', 'family_brothers.webp', 'family_sisters.webp']],
  ['boy.webp', ['family_brothers.webp', 'family_children.webp', 'family_all_members.webp']],
  ['girl.webp', ['family_sisters.webp', 'family_children.webp', 'family_all_members.webp']],
  ['family_father.webp', ['family_adults.webp', 'family_parents.webp', 'man.webp', 'family_all_members.webp']],
  ['family_adults.webp', ['family_parents.webp', 'family_grandparents.webp', 'family_all_members.webp']],
  ['family_parents.webp', ['family_all_members.webp', 'family_parents_children.webp']],
  ['family_grandfather.webp', ['family_grandparents.webp', 'family_all_members.webp']],
  ['family_grandmother.webp', ['family_grandparents.webp', 'family_all_members.webp']],
  ['family_grandparents.webp', ['family_all_members.webp', 'family_grandparents_grandchildren.webp']],
]);
for (const number of ['1.4', '1.5', '1.6']) {
  for (const card of choiceCards(number)) {
    const unsafe = unsafeWrongImages.get(cardImage(card)) || [];
    const wrongImages = card.options.filter((option) => option.id !== card.correct_option_id)
      .map((option) => path.basename(option.image_url || ''));
    assert.deepEqual(wrongImages.filter((image) => unsafe.includes(image)), [],
      `Lesson ${number} ${card.slide_id} offers a wrong picture that is also true of ${cardImage(card)}`);
  }
}
for (const [number, slideId, target] of [
  ['1.6', 'R10', 'The grandparents and the grandchildren'],
]) {
  assert.equal(cardBySlide(number, 'Recognize', slideId).answer_audio_text, target);
}

// Former guided banks now construct the complete approved claim. Check both
// authoring and bundled content, including every repeated word and no distractors.
for (const [number, slideId, target] of [
  ['1.6', 'U4', 'He is the grandfather.'],
  ['1.6', 'U5', 'She is the grandmother.'],
  ['1.6', 'U6', 'They are the grandparents.'],
  ['1.9', 'U8', 'They are the children.'],
  ['1.9', 'U10', 'They are the grandparents.'],
  ['1.10', 'U8', 'They are the grandparents. They are not sleeping.'],
]) {
  for (const current of [cardBySlide(number, 'Use', slideId)]) {
    assert.equal(current.interaction_type, 'complete-sentence');
    assert.equal(current.audio_text, target);
    assert.equal(current.answer_audio_text, target);
    const words = target.match(/[A-Za-z]+/g);
    assert.deepEqual(current.correct_option_ids.map(id => current.options.find(option => option.id === id).label), words);
    assert.deepEqual(current.options.map(option => option.label).sort(), [...words].sort());
    assert.equal(current.options.length, new Set(current.correct_option_ids).size);
  }
}

// Lesson 1.6 moves from guided completion to whole-sentence construction, keeping
// each generation identity on its own matching photo, in lesson order.
{
  const cards = lesson('1.6').cards.filter(card => card.stage === 'Use');
  assert.equal(cards.length, 7);
  assert.ok(cards.slice(0, 3).every(card => card.interaction_type === 'complete2'));
  assert.ok(cards.slice(3).every(card => card.interaction_type === 'complete-sentence'));
  assert.deepEqual(cards.slice(3, 6).map(card => [card.slide_id, card.audio_text, path.basename(card.prompt_image_url)]), [
    ['U4', 'He is the grandfather.', 'family_grandfather.webp'],
    ['U5', 'She is the grandmother.', 'family_grandmother.webp'],
    ['U6', 'They are the grandparents.', 'family_grandparents.webp'],
  ]);
  assert.equal(cards[4].spanish_translation, 'Ella es la abuela.');
}

const expectedLessonEightQuestions = new Map([
  ['R1', 'Who is he?'],
  ['R3', 'Who is she?'],
  ['R5', 'Who are they?'],
  ['R7', 'Who are they?'],
  ['R9', 'Who are they?'],
]);
for (const [slideId, question] of expectedLessonEightQuestions) {
  const card = cardBySlide('1.9', 'Recognize', slideId);
  assert.deepEqual(
    card.options.map((option) => option.label).sort(),
    ['Who are they?', 'Who is he?', 'Who is she?'],
    `Lesson 1.9 ${slideId} must assess the question before revealing the identity`,
  );
  assert.equal(card.options.find((option) => option.id === 'correct').label, question);
}

const expectedLessonEightImageChoices = new Map([
  ['R2', [
    ['She is the mother.', 'a1_who_answer_mother.webp'],
    ['He is the father.', 'a1_who_answer_father.webp'],
  ]],
  ['R4', [
    ['She is the mother.', 'a1_who_answer_mother.webp'],
    ['He is the father.', 'a1_who_answer_father.webp'],
  ]],
  ['R6', [
    ['They are the brothers.', 'family_brothers.webp'],
    ['They are the parents.', 'a1_who_answer_parents.webp'],
  ]],
  ['R8', [
    ['They are the children.', 'a1_who_answer_children.webp'],
    ['They are the parents.', 'a1_who_answer_parents.webp'],
  ]],
  ['R10', [
    ['They are the brothers.', 'family_brothers.webp'],
    ['They are the grandparents.', 'family_grandparents.webp'],
  ]],
]);
const unsafeIdentityImagePairs = [
  new Set(['a1_who_answer_father.webp', 'family_grandfather.webp']),
  new Set(['a1_who_answer_mother.webp', 'family_grandmother.webp']),
  new Set(['a1_who_answer_parents.webp', 'family_grandparents.webp']),
];
for (const slideId of ['R2', 'R4', 'R6', 'R8', 'R10']) {
  const card = cardBySlide('1.9', 'Recognize', slideId);
  const imageNames = new Set(card.options.map((option) => path.basename(option.image_url)));
  assert.deepEqual(
    card.options.map((option) => [option.label, path.basename(option.image_url)]),
    expectedLessonEightImageChoices.get(slideId),
    `Lesson 1.9 ${slideId} must keep its exact safe identity/image pairing`,
  );
  assert.equal(
    card.options.every((option) => /^(?:He is|She is|They are)\b/.test(option.label)),
    true,
    `Lesson 1.9 ${slideId} image choices must use parallel identity statements, not questions`,
  );
  for (const unsafePair of unsafeIdentityImagePairs) {
    assert.equal(
      [...unsafePair].every((filename) => imageNames.has(filename)),
      false,
      `Lesson 1.9 ${slideId} cannot contrast overlapping family roles ${[...unsafePair].join(' / ')}`,
    );
  }
}

const expectedLessonEightCompletionLabels = new Map([
  ['U4', ['the', 'mother']],
  ['U6', ['the', 'parents']],
]);
for (const [slideId, expectedLabels] of expectedLessonEightCompletionLabels) {
  assert.deepEqual(
    cardBySlide('1.9', 'Use', slideId).options.map((option) => option.label),
    expectedLabels,
    `Lesson 1.9 ${slideId} must provide the required completion tiles`,
  );
}

assert.deepEqual(
  cardBySlide('1.10', 'Use', 'U7').options.map((option) => option.label),
  ['parents', 'talking'],
  'Lesson 1.10 U7 must provide the required completion tiles',
);


const unitOneMission = lesson('1.11');
const expectedMissionHeroes = [
  '01_people_path', '02_four_people_search', '03_pronoun_arrival',
  '04_age_groups', '05_babies', '06_brother_sister', '07_sibling_pairs',
  '08_parents', '09_generations', '10_eat_drink', '11_read_write',
  '12_run_swim', '13_sit_sleep', '14_play_study', '15_work_cook_talk',
  '16_not_eating_v2', '17_not_reading', '18_not_running', '19_who_father',
  '20_who_grandmother', '21_who_parents', '22_family_arrival',
].map((suffix) => `a1_u1_reunion_${suffix}.webp`);
const missionHeroes = unitOneMission.cards.map((card) => {
  const correct = card.options.find((option) => option.id === card.correct_option_id);
  return path.basename((card.prompt_image_url || correct?.image_url || '').split(/[?#]/, 1)[0]);
});
assert.deepEqual(missionHeroes, expectedMissionHeroes, 'every Lesson 1.10 beat needs its own ordered celebration hero');
assert.equal(new Set(missionHeroes).size, 22, 'Lesson 1.10 may not repeat an assessed hero image');
assert.equal(
  mediaFilenames(unitOneMission).every((filename) => filename.startsWith('a1_u1_reunion_')),
  true,
  'every Lesson 1.10 still must stay inside the celebration mission namespace',
);
const preMissionMedia = new Set(
  course
    .filter((item) => item.unit_id === 'unit-1' && item.experience_type !== 'mission')
    .flatMap((item) => mediaFilenames(item)),
);
assert.deepEqual(
  [...new Set(mediaFilenames(unitOneMission).filter((filename) => preMissionMedia.has(filename)))],
  [],
  'Lesson 1.10 stills must not reuse Lessons 1.1-1.9 assets',
);

const singularBrother = cardFor('1.5', 'Recognize', 'He is a brother.');
assert.equal(cardImage(singularBrother), 'boy.webp');
assert.equal(
  singularBrother.options.some((option) => path.basename(option.image_url || '') === 'family_brothers.webp'),
  false,
  'a single brother may not be contrasted with a photo that also shows a brother',
);
const pluralSisters = cardFor('1.5', 'Recognize', 'Sisters');
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
  '/lesson-assets/a1_photo_u6_pair_waits_red_v1.webp',
  'the adult-pair distractor is valid only while the prompt explicitly requires the boy',
);
const redSignalPhoto = require(path.join(repositoryRoot, 'docs/qa/course-photo-reuse-v1.json')).assets
  .find((asset) => asset.candidate_filename === 'a1_photo_u6_pair_waits_red_v1.webp');
assert.ok(redSignalPhoto, 'the replacement adult pair needs its inspected pixel evidence');
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(path.join(mobileRoot, 'assets/lesson-assets', redSignalPhoto.candidate_filename))).digest('hex'),
  redSignalPhoto.new_sha256,
  'the exclusive adult-pair contrast must retain the exact inspected photograph',
);

const pharmacyOnRight = cardBySlide('6.7', 'Listen', 'A5');
assert.equal(pharmacyOnRight.audio_text, 'The pharmacy is on the right.');
assert.equal(pharmacyOnRight.correct_option_id, 'pharmacy-right-4');
assert.equal(
  pharmacyOnRight.options.filter((option) => option.id.includes('-right-')).length,
  3,
  'the audio must name the place because three authored options are on the right',
);

// The Unit 3 parity review shows each of Ana's facts in a fresh scene rather
// than replaying the teaching photographs from 3.1-3.6.
const media39 = learnMedia('3.9');
assert.equal(media39.get('I am twenty years old.'), 'a1_u3_review_v1_ana_age.webp');
assert.equal(media39.get('I am from Mexico. I am Mexican.'), 'a1_u3_review_v1_ana_mexico.webp');
assert.equal(media39.get('I am a teacher. I have a book.'), 'a1_u3_review_v1_ana_teacher.webp');
assert.equal(media39.get('My name is Ana.'), 'a1_u3_review_v1_ana_name.webp');

const requiredUnitTwoReplacementsByLesson = new Map([
  [
    '2.9',
    [
      'unit2_near_red_book.webp',
      'unit2_six_white_bags.webp',
    ],
  ],
  [
    '2.11',
    ['a1_u2_review_v1_white_bags.webp'],
  ],
  [
    '2.12',
    [
      'a1_u2_meeting_v4_places.webp',
      'a1_u2_meeting_v4_transport.webp',
      'a1_u2_meeting_v4_arrival.webp',
    ],
  ],
]);

// 2026-09-24: these *_four-card files are byte-identical copies of their 3:2 photos, and the
// four-picture grid's centered crop cut the phones and bags. Lesson 2.9 shows the full photos
// in three-picture cards instead.
for (const retired of [
  'a1_scene_six-white-bags_f412a8a_four-card.webp',
  'a1_scene_five-black-phones_734dda6_four-card.webp',
  'a1_three-green-books_four-card.webp',
]) {
  assert.ok(!mediaFilenames(lesson('2.9')).includes(retired), `lesson 2.9 must not show the unreframed ${retired}`);
}

for (const [number, expectedFilenames] of requiredUnitTwoReplacementsByLesson) {
  const filenames = new Set(mediaFilenames(lesson(number)));
  for (const filename of expectedFilenames) {
    assert.ok(filenames.has(filename), `lesson ${number} must use corrected semantic asset ${filename}`);
  }
}

// Intentional new packs must match the exact inspected runtime bytes, not
// merely any new filename. Original teaching assets remain required below.
const freshUnitTwoAssets = [];
for (const recordFile of ['unit-2-review-media-v1.json', 'unit-2-mission-media-v4.json']) {
  const proof = require(path.join(repositoryRoot, 'docs/qa', recordFile));
  for (const asset of proof.assets) {
    freshUnitTwoAssets.push(asset.runtime_filename);
    const pixels = fs.readFileSync(path.join(mobileRoot, 'assets/lesson-assets', asset.runtime_filename));
    assert.equal(crypto.createHash('sha256').update(pixels).digest('hex'), asset.runtime_sha256);
    assert.equal(asset.agent_review.disposition, 'usable');
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
    `${filename} failed semantic review and must not be referenced by any lesson`,
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

const requiredAssets = [...freshUnitTwoAssets];

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
  // The reviewed #164 pairs: the near photo points at the held object, the far photo aims up at its
  // identical twin, and the fingertip never reaches either object.
  assert.match(near.description, /left hand (?:still holds|grips) the near .+index finger (?:now )?points left at the (?:held|gripped)/);
  assert.match(near.description, /identical far \w+ (?:stays complete|stands alone).*un-pointed/);
  assert.match(far.description, /left hand (?:holds|gripping) /);
  assert.match(far.description, /finger (?:aims up|now points up)/);
  assert.match(far.description, /(?:fingertip stops (?:well short|clearly below|visibly below and short)|separates the fingertip from the far chair)/i);

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
assert.match(demonstrativeContracts.get('near-chair').description, /far chair stands alone .*about 14 percent width/);
assert.match(demonstrativeContracts.get('far-chair').description, /empty floor separates the fingertip from the far chair's feet/);
assert.match(demonstrativeContracts.get('near-bag').description, /identical far backpack stays complete/);

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
  'a1_u3_review_v1_ana_name.webp',
  'a1_u3_review_v1_ana_age.webp',
  'a1_u3_review_v1_ana_mexico.webp',
  'a1_u3_review_v1_ana_teacher.webp',
  'a1_u3_dinner_v1_courtyard.webp',
  'a1_u3_dinner_v1_registration.webp',
  'a1_u3_l33_v1_reading_question.webp',
  'a1_u3_l33_v1_writing_answer.webp',
  'unit2_near_red_book.webp',
  'unit2_six_white_bags.webp',
  'unit2_mission_two_blue_cars.webp',
);

// Retired mission shots stay recoverable in every original asset location,
// but unused files do not need to increase the learner's Metro bundle.
// The Unit 3 parity rebuild retires its old review repeats and blurred-inset
// mission scenes the same way.
for (const filename of ['a1_u2_scene_01_park_path.webp', 'a1_u2_scene_02_bench.webp', 'a1_u2_scene_03_bus_stop.webp',
  'a1_scene_ana_name.webp', 'a1_scene_ana_age_20.webp', 'a1_scene_ana_mexico.webp', 'a1_scene_ana_teacher_book.webp',
  'a1_u3_scene_01_kitchen.webp', 'a1_u3_scene_02_dining.webp',
  // 2026-09-24: the Unit 2 mission's single near/far scene and phone gate gave way to
  // the these/those pairs and the What number is it? gate.
  'a1_u2_meeting_v4_near_far_tight.webp', 'a1_u2_meeting_v4_voice_phone_response.webp',
  'a1_u2_meeting_v4_voice_phone_question.webp']) {
  const source = fs.readFileSync(path.join(repositoryRoot, 'Lessons/Lesson1/images', filename));
  for (const folder of ['mobile/assets/lesson-assets', 'frontend/public/lesson-assets']) {
    assert.deepEqual(fs.readFileSync(path.join(repositoryRoot, folder, filename)), source);
  }
}

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
