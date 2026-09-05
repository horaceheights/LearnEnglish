const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mediaManifest = require(path.join(repositoryRoot, 'docs', 'product', 'a1-media-manifest.json'));
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const courseScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'CourseScreen.tsx'), 'utf8');
const mediaBuilder = fs.readFileSync(path.join(repositoryRoot, 'scripts', 'build_a1_media_composites.py'), 'utf8');

const unitOneBuilderPath = path.join(repositoryRoot, 'scripts', 'build_unit_1_lessons.mjs');
const authoredUnitOne = [];
const unitOneBuilderSource = fs.readFileSync(unitOneBuilderPath, 'utf8')
  .replace(/^import \{ writeFileSync \} from 'node:fs';\r?\n/m, '')
  .replace(/^import \{ join \} from 'node:path';\r?\n/m, '');
// Exercise the real authoring source without generating or changing any files.
vm.runInNewContext(unitOneBuilderSource, {
  writeFileSync: (filename, contents) => {
    assert.equal(path.dirname(filename), path.join(repositoryRoot, 'backend', 'lessons', 'unit_1'));
    authoredUnitOne.push(JSON.parse(contents));
  },
  join: path.join,
  process: { cwd: () => repositoryRoot },
  console: { log: () => {} },
}, { filename: unitOneBuilderPath, timeout: 2000 });
assert.equal(authoredUnitOne.length, 9, 'source-level QA must capture lessons 1.2 through 1.10 without disk writes');

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
  ['1.4', 'R2', ['A baby', 'A man', 'A woman']],
  ['1.4', 'R4', ['He is a child.', 'He is a man.', 'She is a child.']],
  ['1.4', 'R6', ['He is a brother.', 'She is a sister.', 'They are brothers.']],
  ['1.4', 'R8', ['She is a sister.', 'He is a brother.', 'They are sisters.']],
  ['1.4', 'A3', ['They are babies.', 'He is a baby.', 'She is a baby.']],
  ['1.4', 'A6', ['They are brothers.', 'They are sisters.', 'They are babies.']],
  ['1.5', 'R1', ['An adult', 'A boy', 'A girl']],
  ['1.5', 'R3', ['He is the father.', 'She is the mother.', 'They are the parents.']],
  ['1.5', 'A3', ['He is the father.', 'She is the mother.', 'They are the parents.']],
  ['1.9', 'R6', ['The children are swimming.', 'The children are running.', 'The children are studying.']],
  ['1.9', 'R8', ['The brothers are studying.', 'The brothers are swimming.', 'The brothers are running.']],
  ['1.9', 'R10', ['They are a family.', 'They are not a family.', 'They are babies.']],
  ['1.9', 'R12', ['Who is she? She is the mother. The mother is cooking.', 'Who is she? She is the mother. The mother is reading.', 'Who is she? She is the mother. The mother is swimming.']],
  ['1.9', 'R14', ['Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.', 'Who are they? They are the grandparents. They are running and talking. They are not sleeping.', 'Who are they? They are the grandparents. They are sitting and sleeping. They are not talking.']],
  ['1.9', 'A6', ['The children are swimming.', 'The children are running.', 'The children are studying.']],
  ['1.9', 'A8', ['They are a family.', 'They are not a family.', 'They are babies.']],
  ['1.9', 'A9', ['Who are they? They are the parents. The parents are talking.', 'Who are they? They are the parents. The parents are running.', 'Who are they? They are the parents. The parents are swimming.']],
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
  for (const number of ['1.2', '1.3', '1.4', '1.5', '1.8', '1.9']) {
    const current = findLesson(number);
    for (const card of current.cards.filter((item) => ['Recognize', 'Listen'].includes(item.stage))) {
      const frames = card.options.map((option) => choiceFrame(option.label));
      assert.equal(new Set(frames).size, 1, `${context}: ${number} ${card.slide_id} mixes grammatical/semantic frames: ${card.options.map((option) => option.label).join(' | ')}`);
    }
    const expectedCounts = number === '1.9' ? [14, 14, 10, 8, 8]
      : number === '1.8' ? [10, 10, 10, 10, 10] : [10, 10, 8, 7, 7];
    assert.deepEqual(
      ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'].map((stage) => current.cards.filter((card) => card.stage === stage).length),
      expectedCounts,
      `${context}: ${number} choice repair must preserve stage/card counts`,
    );
    assert.deepEqual([...new Set(current.cards.map((card) => card.stage))], ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'], `${context}: ${number} choice repair must preserve story stage order`);
  }
  assert.equal(findCard('1.9', 'A8').interaction_type, 'a2t3', `${context}: review family listening must use the approved parallel text bank`);
  assert.equal(findLesson('1.9').review_vocabulary.includes('grandchildren'), false, `${context}: review metadata may not claim unretrieved grandchildren`);
  assert.equal(findLesson('1.5').vocabulary.includes('grandchildren'), true, `${context}: keep the new word in lesson 1.5`);
  assert.equal(path.basename(findCard('1.5', 'L9').options[0].image_url), 'family_parents_children.webp', `${context}: L9 must show only the parents and children`);
  assert.equal(path.basename(findCard('1.5', 'R9').prompt_image_url), 'family_parents_children.webp', `${context}: R9 must assess the exact parents-and-children scene`);
  assert.deepEqual(findCard('1.5', 'R10').options.map((option) => path.basename(option.image_url)), ['family_grandparents_grandchildren.webp', 'family_parents_children.webp'], `${context}: preserve the parallel generation scenes`);
}

assertParallelUnitOneChoices(authoredUnitOne, 'Unit 1 authoring source');
if (process.argv.includes('--source-only')) {
  console.log('Unit 1 source-level parallel-choice guardrails passed without generating files.');
  process.exit(0);
}
assertParallelUnitOneChoices(course, 'Embedded Unit 1 course');

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

assert.deepEqual(
  cardBySlide('1.2', 'Recognize', 'R3').options.map((option) => option.label),
  ['The boy is eating.', 'The man is drinking.', 'The girl is reading.'],
  'Lesson 1.2 R3 must contrast complete action sentences, never the still-true subject label',
);

const expectedParallelPairActions = new Map([
  ['R8', [
    'The boy and the girl are reading.',
    'The boy and the girl are eating.',
    'The boy and the girl are running.',
  ]],
  ['R10', [
    'The boy and the girl are running.',
    'The boy and the girl are eating.',
    'The boy and the girl are reading.',
  ]],
]);
for (const [slideId, expectedLabels] of expectedParallelPairActions) {
  assert.deepEqual(
    cardBySlide('1.3', 'Recognize', slideId).options.map((option) => option.label),
    expectedLabels,
    `Lesson 1.3 ${slideId} must use full parallel two-person action sentences`,
  );
}

const optionImageNames = (number, stage, slideId) => cardBySlide(number, stage, slideId)
  .options
  .map((option) => path.basename(option.image_url));
for (const [stage, slideId] of [['Recognize', 'R1'], ['Listen', 'A1']]) {
  assert.deepEqual(
    optionImageNames('1.4', stage, slideId),
    ['family_all_members.webp', 'man.webp', 'woman.webp', 'family_baby.webp'],
    `Lesson 1.4 ${slideId} must contrast the whole family with single people, not a true child subset`,
  );
}
for (const [stage, slideId] of [['Recognize', 'R10'], ['Listen', 'A8']]) {
  assert.deepEqual(
    optionImageNames('1.4', stage, slideId),
    ['family_all_members.webp', 'man.webp'],
    `Lesson 1.4 ${slideId} must not use a pair of adults that can also be a family`,
  );
}

const expectedParentsContrastImages = [
  'family_babies.webp',
  'family_children.webp',
  'family_parents.webp',
  'family_sisters.webp',
].sort();
for (const [stage, slideId] of [['Recognize', 'R5'], ['Listen', 'A5']]) {
  assert.deepEqual(
    cardBySlide('1.5', stage, slideId).options
      .map((option) => path.basename(option.image_url))
      .sort(),
    expectedParentsContrastImages,
    `Lesson 1.5 ${slideId} must show one parents pair and only child-group distractors`,
  );
}
assert.deepEqual(
  cardBySlide('1.5', 'Listen', 'A1').options
    .map((option) => path.basename(option.image_url))
    .sort(),
  ['boy.webp', 'family_baby.webp', 'family_father.webp', 'girl.webp'].sort(),
  'Lesson 1.5 A1 must contrast one adult only with three single children',
);

const expectedGrandfatherTextLabels = [
  'He is the grandfather.',
  'She is the grandmother.',
  'They are the grandparents.',
];
for (const [stage, slideId] of [['Recognize', 'R6'], ['Listen', 'A6']]) {
  assert.deepEqual(
    cardBySlide('1.5', stage, slideId).options.map((option) => option.label),
    expectedGrandfatherTextLabels,
    `Lesson 1.5 ${slideId} must use complete gender/number contrasts instead of true adult labels`,
  );
}
assert.deepEqual(
  cardBySlide('1.5', 'Recognize', 'R9').options.map((option) => option.label),
  [
    'The parents and the children are a family.',
    'The parents and the children are babies.',
    'The parents and the children are sisters.',
  ],
  'Lesson 1.5 R9 must contrast complete claims about the full pictured group',
);

const grandparentsGrandchildrenSentence = 'The grandparents and the grandchildren are family.';
const grandparentsGrandchildrenAsset = 'family_grandparents_grandchildren.webp';
assert.equal(
  lesson('1.5').vocabulary.includes('grandchildren'),
  true,
  'Lesson 1.5 must declare grandchildren before assessing the new relationship sentence',
);
assert.deepEqual(
  {
    image: path.basename(cardBySlide('1.5', 'Learn', 'L10').options[0].image_url),
    prompt: cardBySlide('1.5', 'Learn', 'L10').prompt,
  },
  { image: grandparentsGrandchildrenAsset, prompt: grandparentsGrandchildrenSentence },
  'Lesson 1.5 L10 must introduce grandchildren with the dedicated grandparents-only generation scene',
);
assert.deepEqual(
  cardBySlide('1.5', 'Recognize', 'R10').options.map((option) => [
    option.label,
    path.basename(option.image_url),
  ]),
  [
    [grandparentsGrandchildrenSentence, grandparentsGrandchildrenAsset],
    ['The parents and the children are a family.', 'family_parents_children.webp'],
  ],
  'Lesson 1.5 R10 must contrast parallel generation scenes with no parents in the correct image and no grandparents in the distractor',
);

const expectedLessonFiveCompletionLabels = new Map([
  ['U3', ['father', 'mother']],
  ['U4', ['father', 'mother']],
  ['U5', ['parents', 'sisters']],
  ['U6', ['grandmother', 'grandfather']],
  ['U7', ['grandfather', 'grandmother', 'grandparents']],
]);
for (const [slideId, expectedLabels] of expectedLessonFiveCompletionLabels) {
  assert.deepEqual(
    cardBySlide('1.5', 'Use', slideId).options.map((option) => option.label),
    expectedLabels,
    `Lesson 1.5 ${slideId} must use visibly false family-role completion alternatives`,
  );
}

const expectedLessonEightQuestions = new Map([
  ['R1', 'Who is he?'],
  ['R3', 'Who is she?'],
  ['R5', 'Who are they?'],
  ['R7', 'Who are they?'],
  ['R9', 'Who are they?'],
]);
for (const [slideId, question] of expectedLessonEightQuestions) {
  const card = cardBySlide('1.8', 'Recognize', slideId);
  assert.deepEqual(
    card.options.map((option) => option.label).sort(),
    ['Who are they?', 'Who is he?', 'Who is she?'],
    `Lesson 1.8 ${slideId} must assess the question before revealing the identity`,
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
  const card = cardBySlide('1.8', 'Recognize', slideId);
  const imageNames = new Set(card.options.map((option) => path.basename(option.image_url)));
  assert.deepEqual(
    card.options.map((option) => [option.label, path.basename(option.image_url)]),
    expectedLessonEightImageChoices.get(slideId),
    `Lesson 1.8 ${slideId} must keep its exact safe identity/image pairing`,
  );
  assert.equal(
    card.options.every((option) => /^(?:He is|She is|They are)\b/.test(option.label)),
    true,
    `Lesson 1.8 ${slideId} image choices must use parallel identity statements, not questions`,
  );
  for (const unsafePair of unsafeIdentityImagePairs) {
    assert.equal(
      [...unsafePair].every((filename) => imageNames.has(filename)),
      false,
      `Lesson 1.8 ${slideId} cannot contrast overlapping family roles ${[...unsafePair].join(' / ')}`,
    );
  }
}

const expectedLessonEightCompletionLabels = new Map([
  ['U2', ['mother', 'father']],
  ['U4', ['mother', 'father']],
  ['U6', ['brothers', 'parents']],
  ['U8', ['children', 'parents']],
  ['U10', ['is', 'are', 'grandparents']],
]);
for (const [slideId, expectedLabels] of expectedLessonEightCompletionLabels) {
  assert.deepEqual(
    cardBySlide('1.8', 'Use', slideId).options.map((option) => option.label),
    expectedLabels,
    `Lesson 1.8 ${slideId} must not offer an overlapping family role for the pictured answer`,
  );
}

assert.deepEqual(
  cardBySlide('1.9', 'Use', 'U7').options.map((option) => option.label),
  ['sisters', 'parents', 'talking'],
  'Lesson 1.9 U7 must use a visibly false group alternative for the parents scene',
);
assert.deepEqual(
  cardBySlide('1.9', 'Use', 'U8').options.map((option) => option.label),
  ['brothers', 'grandparents', 'not'],
  'Lesson 1.9 U8 must use a visibly false group alternative for the grandparents scene',
);

const unitOneMission = lesson('1.10');
const expectedMissionHeroes = [
  'locked', 'people_board', 'pronoun_cast', 'family_index', 'adult_count',
  'parents_branch', 'grandparents_branch', 'tree_complete', 'who_father',
  'who_mother', 'who_parents', 'who_children', 'who_grandparents',
  'man_eating_drinking', 'boy_reading_writing', 'siblings_running_mother_sitting',
  'sisters_swimming_grandfather_sleeping', 'children_playing_sister_studying',
  'family_work_cook_talk', 'negative_contact_sheet', 'voiceover_booth', 'final_portrait',
].map((suffix, index) => `a1_u1_album_${String(index + 1).padStart(2, '0')}_${suffix}.webp`);
const missionHeroes = unitOneMission.cards.map((card) => {
  const correct = card.options.find((option) => option.id === card.correct_option_id);
  return path.basename((card.prompt_image_url || correct?.image_url || '').split(/[?#]/, 1)[0]);
});
assert.deepEqual(missionHeroes, expectedMissionHeroes, 'every Lesson 1.10 beat needs its own ordered album hero');
assert.equal(new Set(missionHeroes).size, 22, 'Lesson 1.10 may not repeat an assessed hero image');
assert.equal(
  mediaFilenames(unitOneMission).every((filename) => filename.startsWith('a1_u1_album_')),
  true,
  'every Lesson 1.10 still must stay inside the new album mission namespace',
);
const preMissionMedia = new Set(
  course
    .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) < 10)
    .flatMap((item) => mediaFilenames(item)),
);
assert.deepEqual(
  [...new Set(mediaFilenames(unitOneMission).filter((filename) => preMissionMedia.has(filename)))],
  [],
  'Lesson 1.10 stills must not reuse Lessons 1.1-1.9 assets',
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
