const assert = require('node:assert/strict');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mission = course.find((item) => item.sub_lesson_id === '1.10');
assert.ok(mission, 'Missing lesson 1.10.');

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
  ...Array(3).fill('find-the-people'),
  ...Array(6).fill('connect-the-family'),
  ...Array(6).fill('follow-the-actions'),
  ...Array(3).fill('repair-the-clues'),
  ...Array(4).fill('welcome-everyone'),
];
const stages = [
  'Learn', 'Listen', 'Use', 'Use', 'Use', 'Recognize', 'Recognize', 'Use',
  'Listen', 'Listen', 'Use', 'Use', 'Listen', 'Use', 'Listen', 'Use',
  'Recognize', 'Listen', 'Recognize', 'Speak', 'Listen', 'Speak',
];
const interactions = [
  'mission-clue', 'mission-sentence', 'mission-sentence', 'mission-sentence',
  'mission-sentence', 'mission-sentence', 'mission-sentence', 'mission-sentence',
  'mission-sentence', 'mission-sentence', 'mission-sentence', 'mission-sentence',
  'mission-sentence', 'mission-sentence', 'mission-sentence', 'mission-sentence',
  'mission-sentence', 'mission-listen', 'mission-clue', 'mission-speak',
  'mission-listen', 'mission-finale',
];
const gameKinds = [
  'hotspot', 'hotspot', 'label-placement', 'label-placement',
  'relationship-link', 'relationship-link', 'relationship-link',
  'relationship-link', 'relationship-link', ...Array(6).fill('action-sequence'),
  ...Array(3).fill('not-correction'), 'who-dialogue', 'speak',
  'who-dialogue', 'finale',
];
const heroAssets = [
  '01_people_path', '02_four_people_search', '03_pronoun_arrival',
  '04_age_groups', '05_babies', '06_brother_sister', '07_sibling_pairs',
  '08_parents', '09_generations', '10_eat_drink', '11_read_write',
  '12_run_swim', '13_sit_sleep', '14_play_study', '15_work_cook_talk',
  '16_not_eating', '17_not_reading', '18_not_running', '19_who_father',
  '20_who_grandmother', '21_who_parents', '22_family_arrival',
].map((suffix) => `a1_u1_reunion_${suffix}.webp`);

const filename = (url) => path.basename(String(url || '').split(/[?#]/, 1)[0]);
const tokens = (text) => String(text || '')
  .replace(/(?<=[A-Za-z])-(?=[A-Za-z])/g, '')
  .toLowerCase()
  .match(/[a-z]+/g) || [];
const correctOptions = (card) => {
  const ids = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  return ids.map((id) => {
    const option = card.options.find((candidate) => candidate.id === id);
    assert.ok(option, `${card.slide_id} is missing correct option ${id}.`);
    return option;
  });
};
const successfulLanguage = (card) => [
  card.prompt,
  card.audio_text,
  card.answer_audio_text,
  card.mission_game?.cue_audio_text,
  ...correctOptions(card).map((option) => option.label),
].filter(Boolean);

assert.equal(mission.experience_type, 'mission');
assert.equal(mission.content_revision, 3, 'The celebration adventure must invalidate the rejected revision-2 mission.');
assert.equal(mission.cards.length, 22, 'Lesson 1.10 must remain a 22-beat mission.');
assert.deepEqual(
  mission.cards.map((_card, index) => `M${String(index + 1).padStart(2, '0')}`),
  mission.cards.map((card) => card.slide_id),
  'Mission beat IDs must remain contiguous M01 through M22.',
);
assert.deepEqual(
  mission.mission.chapters.map((chapter) => chapter.id),
  ['find-the-people', 'connect-the-family', 'follow-the-actions', 'repair-the-clues', 'welcome-everyone'],
  'Mission chapters must preserve the celebration story arc.',
);
for (const field of ['label', 'title', 'briefing', 'kickoff_image_url', 'completion_title', 'completion_message']) {
  assert.ok(String(mission.mission[field] || '').trim(), `Mission presentation needs ${field}.`);
}
assert.ok(mission.mission.objectives.length >= 3, 'The kickoff must explain concrete objectives.');
assert.deepEqual(mission.cards.map((card) => card.mission_chapter_id), chapterIds);
assert.deepEqual(mission.cards.map((card) => card.stage), stages);
assert.deepEqual(mission.cards.map((card) => card.interaction_type), interactions);
assert.deepEqual(mission.cards.map((card) => card.mission_game.kind), gameKinds);

mission.cards.forEach((card, index) => {
  assert.match(card.pedagogy_note || '', new RegExp(`^Mission beat ${String(index + 1).padStart(2, '0')}/22:`));
  assert.ok(card.mission_game.instruction_es.trim(), `${card.slide_id} needs a visible and spoken Spanish instruction.`);
  assert.ok(['ordered', 'unordered', 'single'].includes(card.mission_game.validation));
  assert.ok(card.mission_game.targets.length, `${card.slide_id} needs at least one meaningful target.`);
  const optionIds = new Set(card.options.map((option) => option.id));
  for (const target of card.mission_game.targets) {
    for (const field of ['x', 'y', 'width', 'height']) {
      assert.ok(target.rect[field] >= 0 && target.rect[field] <= 1, `${card.slide_id} target ${target.id} has an invalid ${field}.`);
    }
    assert.ok(target.rect.x + target.rect.width <= 1.0001);
    assert.ok(target.rect.y + target.rect.height <= 1.0001);
    assert.ok(target.accepted_option_ids.length);
    assert.ok(target.accepted_option_ids.every((id) => optionIds.has(id)), `${card.slide_id} target references a missing option.`);
  }
});

const heroes = mission.cards.map((card) => filename(card.prompt_image_url));
assert.deepEqual(heroes, heroAssets, 'Every mission beat must bind its exact celebration hero.');
assert.equal(new Set(heroes).size, 22, 'No two assessed mission beats may reuse one hero still.');
const missionMedia = [mission.mission.kickoff_image_url, ...mission.cards.flatMap((card) => [
  card.prompt_image_url,
  ...card.options.map((option) => option.image_url),
])].filter(Boolean).map(filename);
assert.equal(missionMedia.every((asset) => asset.startsWith('a1_u1_reunion_')), true);
assert.equal(missionMedia.some((asset) => /album|studio/i.test(asset)), false);

const earlierUnitMedia = new Set(course
  .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) < 10)
  .flatMap((item) => item.cards)
  .flatMap((card) => [card.prompt_image_url, ...card.options.map((option) => option.image_url)])
  .filter(Boolean)
  .map(filename));
assert.deepEqual([...new Set(missionMedia.filter((asset) => earlierUnitMedia.has(asset)))], []);

const foundationVocabulary = course
  .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) <= 8)
  .flatMap((item) => item.vocabulary.map((word) => word.toLowerCase()));
assert.deepEqual(foundationVocabulary, goldVocabulary);
assert.deepEqual(mission.review_vocabulary, goldVocabulary);
const successfulTokens = new Set(mission.cards.flatMap(successfulLanguage).flatMap(tokens));
assert.deepEqual(goldVocabulary.filter((word) => !successfulTokens.has(word)), [], 'All 46 learned targets must occur on successful mission paths.');
const authoredTokens = new Set(mission.cards.flatMap((card) => [
  card.prompt, card.audio_text, card.answer_audio_text, card.mission_game.cue_audio_text,
  ...card.options.map((option) => option.label),
]).filter(Boolean).flatMap(tokens));
assert.deepEqual([...authoredTokens].filter((word) => !goldVocabulary.includes(word)).sort(), []);
const normalizedSuccess = mission.cards.flatMap(successfulLanguage).join(' ').toLowerCase().replace(/[^a-z]+/g, ' ');
for (const question of ['who is he', 'who is she', 'who are they']) {
  assert.ok(normalizedSuccess.includes(question), `Mission must assess ${question}.`);
}

console.log('Lesson 1.10 celebration mission contract passed for 22 beats and all 46 learned targets.');
