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
  ...Array(5).fill('open-album'),
  ...Array(8).fill('build-family'),
  ...Array(7).fill('restore-memories'),
  ...Array(2).fill('record-and-reveal'),
];
const stages = [
  'Use', 'Learn', 'Use', 'Recognize', 'Use', 'Recognize', 'Listen', 'Use',
  'Recognize', 'Listen', 'Use', 'Speak', 'Recognize', 'Use', 'Listen',
  'Use', 'Listen', 'Recognize', 'Listen', 'Use', 'Speak', 'Use',
];
const interactions = [
  'mission-word-parts',
  ...Array(10).fill('mission-sentence'),
  'mission-speak',
  'mission-clue',
  'mission-sentence',
  'mission-sentence',
  'mission-sentence',
  'mission-listen',
  'mission-clue',
  'mission-sentence',
  'mission-sentence',
  'mission-speak',
  'mission-finale',
];
const heroAssets = [
  'locked', 'people_board', 'pronoun_cast', 'family_index', 'adult_count',
  'parents_branch', 'grandparents_branch', 'tree_complete', 'who_father',
  'who_mother', 'who_parents', 'who_children', 'who_grandparents',
  'man_eating_drinking', 'boy_reading_writing', 'siblings_running_mother_sitting',
  'sisters_swimming_grandfather_sleeping', 'children_playing_sister_studying',
  'family_work_cook_talk', 'negative_contact_sheet', 'voiceover_booth', 'final_portrait',
].map((suffix, index) => `a1_u1_album_${String(index + 1).padStart(2, '0')}_${suffix}.webp`);

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
  if (!['mission-word-parts', 'mission-sentence', 'mission-finale'].includes(card.interaction_type)) {
    values.push(...correctOptions(card).map((option) => option.label));
  }
  return values.filter((value) => String(value || '').trim());
};
const authoredEnglish = (card) => {
  const values = successfulLanguage(card);
  if (card.interaction_type !== 'mission-word-parts') {
    values.push(...card.options.map((option) => option.label));
  }
  if (['mission-word-parts', 'mission-sentence', 'mission-finale'].includes(card.interaction_type)) {
    values.push(card.prompt);
  }
  return values.filter((value) => String(value || '').trim());
};

assert.equal(mission.experience_type, 'mission', 'Lesson 1.10 must route by mission metadata.');
assert.equal(mission.content_revision, 2, 'The redesigned Unit 1 mission must invalidate stale revision-1 progress.');
assert.equal(mission.cards.length, 22, 'Lesson 1.10 must remain a 22-beat mission.');
assert.deepEqual(
  mission.cards.map((card, index) => card.slide_id),
  mission.cards.map((_card, index) => `M${String(index + 1).padStart(2, '0')}`),
  'Mission beat IDs must remain contiguous M01 through M22.',
);
assert.deepEqual(
  mission.mission.chapters.map((chapter) => chapter.id),
  ['open-album', 'build-family', 'restore-memories', 'record-and-reveal'],
  'Mission chapters must preserve the authored story arc.',
);
for (const field of ['label', 'title', 'briefing', 'completion_title', 'completion_message']) {
  assert.ok(String(mission.mission[field] || '').trim(), `Mission presentation needs ${field}.`);
}
assert.deepEqual(mission.cards.map((card) => card.mission_chapter_id), chapterIds);
assert.deepEqual(mission.cards.map((card) => card.stage), stages, 'Internal modalities must remain in mission story order.');
assert.deepEqual(mission.cards.map((card) => card.interaction_type), interactions, 'Mission mechanics must preserve the reviewed 22-beat sequence.');
mission.cards.forEach((card, index) => {
  assert.match(
    card.pedagogy_note || '',
    new RegExp(`^Mission beat ${String(index + 1).padStart(2, '0')}/22:`),
    `${card.slide_id} needs the correct mission beat contract.`,
  );
});

const heroes = mission.cards.map((card) => {
  const primary = card.prompt_image_url || correctOptions(card).find((option) => option.image_url)?.image_url;
  assert.ok(primary, `${card.slide_id} needs a primary or correct hero still.`);
  return filename(primary);
});
assert.deepEqual(heroes, heroAssets, 'Every mission beat must bind its reviewed album hero.');
assert.equal(new Set(heroes).size, 22, 'No two assessed mission beats may reuse one hero still.');
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
assert.equal(missionMedia.every((asset) => asset.startsWith('a1_u1_album_')), true);
assert.deepEqual(
  [...new Set(missionMedia.filter((asset) => earlierUnitMedia.has(asset)))],
  [],
  'Mission media must be fresh relative to Lessons 1.1-1.9.',
);

const foundationVocabulary = course
  .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) <= 8)
  .flatMap((item) => item.vocabulary.map((word) => word.toLowerCase()));
assert.deepEqual(foundationVocabulary, goldVocabulary, 'The Unit 1 mission contract is bound to all 46 taught targets.');
assert.deepEqual(mission.review_vocabulary, goldVocabulary, 'Mission metadata must declare all 46 taught targets in introduction order.');

const successfulTokens = new Set(
  mission.cards
    .flatMap(successfulLanguage)
    .flatMap((value) => [...languageTokens(value)]),
);
assert.deepEqual(
  goldVocabulary.filter((word) => !successfulTokens.has(word)),
  [],
  'All 46 learned targets must occur on correct/successful mission paths.',
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

console.log('Lesson 1.10 continuous mission contract passed for 22 beats and 46 learned targets.');
