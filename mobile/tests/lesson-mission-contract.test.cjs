const assert = require('node:assert/strict');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));

const lesson = (number) => {
  const found = course.find((item) => item.sub_lesson_id === number);
  assert.ok(found, `Missing lesson ${number}.`);
  return found;
};
const mission = lesson('1.10');

const goldVocabulary = [
  'a', 'boy', 'girl', 'man', 'woman', 'he', 'she', 'is', 'the',
  'eating', 'drinking', 'reading', 'writing', 'and', 'they', 'are',
  'running', 'sitting', 'swimming', 'sleeping', 'family', 'baby',
  'babies', 'child', 'children', 'brother', 'brothers', 'sister',
  'sisters', 'an', 'adult', 'adults', 'father', 'mother', 'parents',
  'grandfather', 'grandmother', 'grandparents', 'grandchildren', 'playing',
  'studying', 'working', 'cooking', 'talking', 'not', 'who',
];
const chapterIds = [
  ...Array(5).fill('casting-call'),
  ...Array(8).fill('build-the-cast'),
  ...Array(7).fill('shoot-and-edit'),
  ...Array(2).fill('record-and-premiere'),
];
const stages = [
  'Use', 'Learn', 'Recognize', 'Recognize', 'Use', 'Recognize', 'Recognize', 'Use',
  'Use', 'Listen', 'Use', 'Speak', 'Recognize', 'Use', 'Listen',
  'Use', 'Listen', 'Recognize', 'Listen', 'Use', 'Speak', 'Use',
];
const interactions = [
  'mission-unlock',
  'mission-match',
  'mission-clue',
  'mission-match',
  'mission-truth-stamp',
  'mission-match',
  'mission-match',
  'mission-sentence',
  'mission-sentence',
  'mission-listen',
  'mission-sentence',
  'mission-speak',
  'mission-clue',
  'mission-match',
  'mission-listen',
  'mission-match',
  'mission-listen',
  'mission-clue',
  'mission-match',
  'mission-truth-stamp',
  'mission-speak',
  'mission-finale',
];
const visualKeys = [
  'clapperboard', 'people_casting', 'pronoun_marks', 'young_cast', 'adult_cast',
  'parent_roles', 'generation_roles', 'title_card', 'who_father', 'who_mother',
  'who_parents', 'who_children', 'who_grandparents', 'eating_drinking',
  'reading_writing', 'running_sitting', 'swimming_sleeping', 'playing_studying',
  'work_cook_talk', 'not_continuity', 'final_question', 'premiere',
].map((suffix, index) => `a1_u1_studio_${String(index + 1).padStart(2, '0')}_${suffix}`);
const boundStills = new Map([
  [1, 'a1_u1_studio_01_clapperboard.webp'],
  [2, 'a1_u1_studio_02_people_casting.webp'],
  [3, 'a1_u1_studio_03_pronoun_marks.webp'],
  [4, 'a1_u1_studio_04_young_cast.webp'],
  [5, 'a1_u1_studio_05_adult_cast.webp'],
  [6, 'a1_u1_studio_06_parent_roles.webp'],
  [7, 'a1_u1_studio_07_generation_roles.webp'],
  [8, 'a1_u1_studio_08_title_card.webp'],
  [9, 'a1_u1_studio_09_who_father.webp'],
  [10, 'a1_u1_studio_10_who_mother.webp'],
  [11, 'a1_u1_studio_11_who_parents.webp'],
  [12, 'a1_u1_studio_12_who_children.webp'],
  [13, 'a1_u1_studio_13_who_grandparents.webp'],
  [14, 'a1_u1_studio_14_eating_drinking.webp'],
  [15, 'a1_u1_studio_15_reading_writing.webp'],
  [16, 'a1_u1_studio_16_running_sitting.webp'],
  [17, 'a1_u1_studio_17_swimming_sleeping.webp'],
  [18, 'a1_u1_studio_18_playing_studying.webp'],
  [19, 'a1_u1_studio_19_work_cook_talk.webp'],
  [20, 'a1_u1_studio_20_not_continuity.webp'],
  [21, 'a1_u1_studio_21_final_question.webp'],
  [22, 'a1_u1_studio_22_premiere.webp'],
]);
const targetLabels = new Map([
  ['M02', ['Arriba izquierda', 'Arriba derecha', 'Abajo izquierda', 'Abajo derecha']],
  ['M04', ['Arriba izquierda', 'Arriba derecha', 'Abajo izquierda', 'Abajo derecha']],
  ['M06', ['Arriba izquierda', 'Arriba derecha', 'Abajo · pareja']],
  ['M07', ['Arriba izquierda', 'Arriba derecha', 'Abajo izquierda', 'Abajo derecha']],
  ['M14', ['Toma izquierda', 'Toma derecha']],
  ['M16', ['Persona izquierda', 'Persona del centro', 'Persona derecha']],
  ['M19', ['Toma 1', 'Toma 2', 'Toma 3']],
  ['M20', ['Toma 1', 'Toma 2', 'Toma 3']],
]);

const filename = (url) => path.basename(String(url || '').split(/[?#]/, 1)[0]);
const correctOptions = (card) => {
  const ids = card.correct_option_ids?.length
    ? card.correct_option_ids
    : [card.correct_option_id];
  return ids.map((id) => {
    const option = card.options.find((candidate) => candidate.id === id);
    assert.ok(option, `${card.slide_id} is missing correct option ${id}.`);
    return option;
  });
};
const languageTokens = (text) => new Set(
  String(text || '')
    .replace(/(?<=[A-Za-z])-(?=[A-Za-z])/g, '')
    .toLowerCase()
    .match(/[a-z]+/g) || [],
);
const successfulLanguage = (card) => {
  const values = [card.audio_text, card.answer_audio_text];
  const promptIsTarget = card.interaction_type === 'mission-speak'
    || card.prompt === card.audio_text
    || card.prompt === card.answer_audio_text
    || /^Who\s+(?:is|are)\b/i.test(card.prompt || '');
  if (promptIsTarget) values.push(card.prompt);
  if (card.interaction_type !== 'mission-unlock') {
    values.push(...correctOptions(card).map((option) => option.label));
  }
  return values.filter((value) => String(value || '').trim());
};
const authoredEnglish = (card) => {
  const values = successfulLanguage(card);
  if (card.interaction_type !== 'mission-unlock') {
    values.push(...card.options.map((option) => option.label));
  }
  if (['mission-unlock', 'mission-sentence', 'mission-finale'].includes(card.interaction_type)) {
    values.push(card.prompt);
  }
  return values.filter((value) => String(value || '').trim());
};

assert.equal(mission.experience_type, 'mission', 'Lesson 1.10 must route by mission metadata.');
assert.equal(mission.content_revision, 3, 'The studio Unit 1 mission must invalidate the retired album revision.');
assert.equal(mission.cards.length, 22, 'Lesson 1.10 must remain a 22-beat mission.');
assert.deepEqual(
  mission.cards.map((card, index) => card.slide_id),
  mission.cards.map((_card, index) => `M${String(index + 1).padStart(2, '0')}`),
  'Mission beat IDs must remain contiguous M01 through M22.',
);
assert.deepEqual(
  mission.mission.chapters.map((chapter) => chapter.id),
  ['casting-call', 'build-the-cast', 'shoot-and-edit', 'record-and-premiere'],
  'Mission chapters must preserve the authored story arc.',
);
for (const field of ['label', 'title', 'briefing', 'completion_title', 'completion_message']) {
  assert.ok(String(mission.mission[field] || '').trim(), `Mission presentation needs ${field}.`);
}
assert.ok(mission.mission.briefing.length <= 200, 'Spoken mission briefing must remain within the audio contract.');
assert.deepEqual(mission.cards.map((card) => card.mission_chapter_id), chapterIds);
assert.deepEqual(mission.cards.map((card) => card.stage), stages, 'Internal modalities must remain in mission story order.');
assert.deepEqual(mission.cards.map((card) => card.interaction_type), interactions, 'Mission mechanics must preserve the reviewed 22-beat sequence.');
mission.cards.forEach((card, index) => {
  assert.match(
    card.pedagogy_note || '',
    new RegExp(`^Mission beat ${String(index + 1).padStart(2, '0')}/22:`),
    `${card.slide_id} needs the correct mission beat contract.`,
  );
  assert.ok(String(card.instruction_es || '').trim(), `${card.slide_id} needs a direct Spanish instruction.`);
  assert.ok(String(card.success_outcome_es || '').trim(), `${card.slide_id} needs a visible success outcome.`);
  assert.ok(String(card.visual_description_es || '').trim(), `${card.slide_id} needs authored Spanish visual alt text.`);
  const expectedStill = boundStills.get(index + 1);
  assert.equal(filename(card.prompt_image_url), expectedStill || '');
  if (card.interaction_type === 'mission-speak') {
    assert.equal(card.options.length, 1, `${card.slide_id} needs one focused speaking model.`);
    assert.equal(filename(card.options[0].image_url), expectedStill);
  } else {
    assert.equal(card.options.some((option) => option.image_url), false);
  }

  const targets = card.mission_targets || [];
  const targetOptionIds = targets.map((target) => target.correct_option_id);
  if (card.interaction_type === 'mission-match') {
    assert.ok(targets.length, `${card.slide_id} mission-match needs local targets.`);
  }
  if (targets.length) {
    assert.ok(
      ['mission-match', 'mission-truth-stamp'].includes(card.interaction_type),
      `${card.slide_id} may use targets only on a target-based board.`,
    );
    assert.equal(new Set(targets.map((target) => target.id)).size, targets.length);
    assert.equal(new Set(targetOptionIds).size, targets.length);
    assert.ok(targetOptionIds.every((optionId) => card.options.some((option) => option.id === optionId)));
    assert.deepEqual(targetOptionIds, card.correct_option_ids);
    assert.deepEqual(
      targets.map((target) => target.label),
      targetLabels.get(card.slide_id),
      `${card.slide_id} target labels must locate rather than reveal each answer.`,
    );
  }
});

assert.deepEqual(
  mission.cards.map((card) => card.mission_visual_key),
  visualKeys,
  'Every mission beat must declare its own studio visual contract.',
);
assert.equal(new Set(visualKeys).size, 22, 'No two assessed mission beats may reuse one visual contract.');
const earlierUnitMedia = new Set(
  course
    .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) < 10)
    .flatMap((item) => item.cards)
    .flatMap((card) => [
      card.prompt_image_url,
      ...card.options.map((option) => option.image_url),
      ...(card.audio_turns || []).map((turn) => turn.image_url),
      ...(card.answer_audio_turns || []).map((turn) => turn.image_url),
    ])
    .filter(Boolean)
    .map(filename),
);
const missionMedia = mission.cards.flatMap((card) => [
  card.prompt_image_url,
  ...card.options.map((option) => option.image_url),
  ...(card.audio_turns || []).map((turn) => turn.image_url),
  ...(card.answer_audio_turns || []).map((turn) => turn.image_url),
]).filter(Boolean).map(filename);
assert.equal(
  missionMedia.some((asset) => asset.startsWith('a1_u1_album_')),
  false,
  'The retired album stills may not appear in the studio mission.',
);
assert.deepEqual(
  [...new Set(missionMedia.filter((asset) => earlierUnitMedia.has(asset)))],
  [],
  'Mission media must be fresh relative to Lessons 1.1-1.9.',
);

const visibleCopy = [
  mission.title,
  mission.sub_lesson_title,
  ...Object.values(mission.mission).filter((value) => typeof value === 'string'),
  ...mission.mission.chapters.flatMap((chapter) => [chapter.title, chapter.objective]),
  ...mission.cards.flatMap((card) => [card.instruction_es, card.success_outcome_es, card.visual_description_es]),
].join(' ');
assert.doesNotMatch(visibleCopy.toLowerCase(), /\b(?:album|álbum)\b/);

const opener = mission.cards[0];
assert.equal(opener.interaction_type, 'mission-unlock');
assert.equal(opener.mission_tutorial_mode, 'guided-no-fail');
assert.deepEqual(
  opener.correct_option_ids.map((id) => opener.options.find((option) => option.id === id).label),
  ['FA', 'MI', 'LY'],
);
assert.equal(opener.answer_audio_text.toLowerCase(), 'family');

assert.deepEqual(
  mission.cards.slice(1, 7).map((card) => card.interaction_type),
  ['mission-match', 'mission-clue', 'mission-match', 'mission-truth-stamp', 'mission-match', 'mission-match'],
  'The casting loop must alternate mapping, clue approval, and construction instead of repeating one board.',
);
const pronounScript = mission.cards[2];
assert.equal(pronounScript.interaction_type, 'mission-clue');
assert.equal((pronounScript.mission_targets || []).length, 0);
assert.equal(
  pronounScript.answer_audio_text,
  'He is a boy. He is a man. She is a woman. She is a girl.',
  'M03 must follow the approved left-to-right cast order.',
);
assert.equal(
  pronounScript.options.find((option) => option.id === pronounScript.correct_option_id).label,
  pronounScript.answer_audio_text,
  'M03 must make the left-to-right script an explicit, assessable choice.',
);
assert.deepEqual(
  new Set(pronounScript.options.filter((option) => option.id !== pronounScript.correct_option_id).map((option) => option.label)),
  new Set([
    'She is a boy. He is a man. She is a woman. He is a girl.',
    'He is a boy. He is a woman. She is a man. She is a girl.',
  ]),
  'M03 needs both a pronoun contrast and a visible-order contrast.',
);
const youngerCast = mission.cards[3];
assert.deepEqual(
  youngerCast.mission_targets.map((target) => (
    youngerCast.options.find((option) => option.id === target.correct_option_id).label
  )),
  [
    'The baby is a child.',
    'The babies are children.',
    'The brother and the sister are children.',
    'The brothers and the sisters are children.',
  ],
  'M04 must make the child/baby/sibling superclass relationship explicit in 2x2 visual order.',
);
assert.ok(
  ['The baby is an adult.', 'The babies are adults.'].every((label) => youngerCast.options.some((option) => option.label === label)),
  'M04 must require child/children by contrasting babies with adults.',
);
const adultCast = mission.cards[4];
assert.equal(adultCast.interaction_type, 'mission-truth-stamp');
assert.equal((adultCast.mission_targets || []).length, 0);
assert.equal(adultCast.options.find((option) => option.id === adultCast.correct_option_id).label, 'An adult. Adults.');
assert.ok(
  adultCast.options.some((option) => option.label === 'A adult. Adults.' && option.id !== adultCast.correct_option_id),
  'M05 must require AN against a silent A distractor.',
);
assert.ok(
  adultCast.options.some((option) => option.label === 'An adult. Children.' && option.id !== adultCast.correct_option_id),
  'M05 must distinguish the visible adult group from children.',
);
const parentRoles = mission.cards[5];
assert.equal(parentRoles.interaction_type, 'mission-match');
assert.deepEqual(
  parentRoles.mission_targets.map((target) => parentRoles.options.find((option) => option.id === target.correct_option_id).label),
  ['He is the father.', 'She is the mother.', 'They are the parents.'],
  'M06 must independently require father, mother, and parents.',
);
assert.deepEqual(
  new Set(parentRoles.options.filter((option) => !parentRoles.correct_option_ids.includes(option.id)).map((option) => option.label)),
  new Set([
    'He is the grandfather.', 'She is the grandmother.', 'They are the grandparents.',
    'He is a boy.', 'She is a girl.',
  ]),
  'M06 must contrast every family role against same-pronoun grandparents plus visibly younger roles.',
);
const generationRoles = mission.cards[6];
assert.deepEqual(
  generationRoles.mission_targets.map((target) => generationRoles.options.find((option) => option.id === target.correct_option_id).label),
  ['He is the grandfather.', 'She is the grandmother.', 'They are the grandparents.', 'They are the grandchildren.'],
  'M07 must independently require every older-generation role.',
);
assert.deepEqual(
  new Set(generationRoles.options.filter((option) => !generationRoles.correct_option_ids.includes(option.id)).map((option) => option.label)),
  new Set(['He is a boy.', 'She is a girl.', 'They are the brothers.', 'They are the sisters.']),
  'M07 distractors must remain visibly false instead of overlapping parents or children.',
);
const grandparentClue = mission.cards[12];
assert.equal(grandparentClue.audio_text, 'Who are they?', 'M13 prompt audio must not reveal the answer.');
assert.equal(
  grandparentClue.answer_audio_text,
  'They are the grandparents.',
  'M13 may reveal only the answer after success, without replaying the question.',
);
assert.ok(!grandparentClue.audio_text.toLowerCase().includes('grandparents'), 'M13 prompt audio must exclude the answer.');
assert.ok(!grandparentClue.answer_audio_text.toLowerCase().includes('who are they'), 'M13 answer audio must not repeat the question.');
const fatherQuestion = mission.cards[8];
const fatherQuestionOptions = new Map(fatherQuestion.options.map((option) => [option.id, option.label]));
assert.equal(fatherQuestion.interaction_type, 'mission-sentence');
assert.equal(fatherQuestion.prompt, '___ ___ ___?');
assert.deepEqual(
  fatherQuestion.correct_option_ids.map((optionId) => fatherQuestionOptions.get(optionId)),
  ['Who', 'is', 'he'],
  'M09 must require constructing Who is he?.',
);
assert.equal(fatherQuestion.answer_audio_text, 'Who is he?');
assert.ok(
  fatherQuestion.options.some((option) => option.label === 'are' && !fatherQuestion.correct_option_ids.includes(option.id)),
  'M09 must contrast correct IS with an ARE distractor.',
);
const motherQuestion = mission.cards[9];
assert.equal(motherQuestion.audio_text, 'Who is she?');
assert.equal(
  motherQuestion.options.find((option) => option.id === motherQuestion.correct_option_id).label,
  'Who is she?',
  'M10 must require identifying the exact heard question.',
);
assert.deepEqual(
  new Set(motherQuestion.options.map((option) => option.label)),
  new Set(['Who is she?', 'Who is he?', 'Who are they?']),
);
const eatingDrinkingShot = mission.cards[13];
const eatingDrinkingOptions = new Map(eatingDrinkingShot.options.map((option) => [option.id, option.label]));
assert.deepEqual(
  eatingDrinkingShot.mission_targets.map((target) => eatingDrinkingOptions.get(target.correct_option_id)),
  ['The man is eating.', 'The man is drinking.'],
  'M14 must map each visible side to its action, never a hidden sentence order.',
);
const actionSync = mission.cards[18];
assert.deepEqual(
  new Set(actionSync.options.map((option) => option.label)),
  new Set([
    'The parents are working.',
    'The parents are talking.',
    'The grandmother is cooking.',
    'The grandmother is working.',
    'The brothers are talking.',
    'The brothers are cooking.',
  ]),
  'M19 must require each action against a same-subject near distractor.',
);
const castActionBoard = mission.cards[15];
const castActionOptions = new Map(castActionBoard.options.map((option) => [option.id, option.label]));
assert.deepEqual(
  castActionBoard.mission_targets.map((target) => castActionOptions.get(target.correct_option_id)),
  ['The brother is running.', 'The sister is running.', 'The mother is sitting.'],
  'M16 must assign a distinct visible action to the brother, sister, and mother.',
);
assert.deepEqual(
  new Set(castActionBoard.options.map((option) => option.label)),
  new Set([
    'The brother is running.',
    'The brother is sitting.',
    'The sister is running.',
    'The sister is sitting.',
    'The mother is sitting.',
    'The mother is running.',
  ]),
  'M16 must contrast running and sitting for each pictured cast member.',
);
const polarityBoard = mission.cards[19];
const polarityOptions = new Map(polarityBoard.options.map((option) => [option.id, option.label]));
assert.equal(polarityBoard.options.length, 6, 'M20 needs one polarity-paired distractor per scene.');
assert.deepEqual(
  polarityBoard.mission_targets.map((target) => polarityOptions.get(target.correct_option_id)),
  [
    'He is not sitting. He is running.',
    'She is not sleeping. She is cooking.',
    'They are not sitting. They are swimming.',
  ],
);
assert.deepEqual(
  new Set(polarityBoard.options.filter((option) => !polarityBoard.correct_option_ids.includes(option.id)).map((option) => option.label)),
  new Set([
    'He is sitting. He is not running.',
    'She is sleeping. She is not cooking.',
    'They are sitting. They are not swimming.',
  ]),
  'M20 must assess NOT by contrasting the same actions with reversed polarity.',
);
assert.deepEqual(
  new Set(mission.cards[14].options.map((option) => option.label)),
  new Set([
    'The boy is reading and writing.',
    'The boy is reading and sleeping.',
    'The boy is eating and writing.',
  ]),
  'M15 must require both reading and writing through one-action-near distractors.',
);
for (const card of mission.cards.filter((candidate) => candidate.stage === 'Listen')) {
  if (!card.audio_text || !card.answer_audio_text) continue;
  assert.notEqual(
    card.audio_text.trim().toLowerCase(),
    card.answer_audio_text.trim().toLowerCase(),
    `${card.slide_id} must not replay an identical Listen line after success.`,
  );
}
assert.deepEqual(new Set(mission.cards.map((card) => card.stage)), new Set(['Learn', 'Recognize', 'Listen', 'Speak', 'Use']));

const foundationVocabulary = course
  .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) <= 8)
  .flatMap((item) => item.vocabulary.map((word) => word.toLowerCase()));
assert.deepEqual(foundationVocabulary, goldVocabulary, 'The Unit 1 mission contract is bound to all 46 taught targets.');
assert.deepEqual(mission.review_vocabulary, goldVocabulary, 'Mission metadata must declare all 46 taught targets in introduction order.');

const successfulTokens = new Set(
  mission.cards
    .filter((card) => card.mission_tutorial_mode !== 'guided-no-fail')
    .flatMap(successfulLanguage)
    .flatMap((value) => [...languageTokens(value)]),
);
assert.deepEqual(
  goldVocabulary.filter((word) => !successfulTokens.has(word)),
  [],
  'All 46 learned targets must occur on assessed correct/successful mission paths outside M01.',
);
const authoredTokens = new Set(
  mission.cards
    .flatMap(authoredEnglish)
    .flatMap((value) => [...languageTokens(value)]),
);
assert.deepEqual(
  [...authoredTokens].filter((word) => !goldVocabulary.includes(word)).sort(),
  [],
  'Assessed and distractor English may not introduce language beyond Lessons 1.1-1.8.',
);
const normalizedSuccess = mission.cards.flatMap(successfulLanguage).join(' ')
  .toLowerCase().replace(/[^a-z]+/g, ' ');
for (const question of ['who is he', 'who is she', 'who are they']) {
  assert.ok(normalizedSuccess.includes(question), `Mission must assess ${question}.`);
}
for (const [label, pattern] of [
  ['article a', /\ba\s+(?:boy|girl|man|woman|baby|child|brother|sister|family)\b/],
  ['article an', /\ban\s+adult\b/],
  ['article the', /\bthe\s+(?:father|mother|parents|grandfather|grandmother|grandparents|grandchildren|man|boy|brother|sister|children)\b/],
  ['he is', /\bhe\s+is\b/],
  ['she is', /\bshe\s+is\b/],
  ['they are', /\bthey\s+are\b/],
  ['and', /\band\b/],
  ['not', /\bnot\b/],
]) {
  assert.match(normalizedSuccess, pattern, `Mission must assess ${label}.`);
}

console.log('Lesson 1.10 continuous mission contract passed for 22 beats and 46 learned targets.');
