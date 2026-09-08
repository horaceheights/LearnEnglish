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
const gameKinds = [
  'guided-search', 'crowd-search', 'crowd-search',
  ...Array(6).fill('family-link'),
  ...Array(6).fill('action-hunt'),
  ...Array(3).fill('contrast-hunt'),
  ...Array(4).fill('voice-gate'),
];
const heroAssets = [
  '01_people_path', '02_four_people_search', '03_pronoun_arrival',
  '04_age_groups', '05_babies', '06_brother_sister', '07_sibling_pairs',
  '08_parents', '09_generations', '10_eat_drink', '11_read_write',
  '12_run_swim', '13_sit_sleep', '14_play_study', '15_work_cook_talk',
  '16_not_eating_v2', '17_not_reading', '18_not_running', '19_who_father',
  '20_who_grandmother', '21_who_parents', '22_family_arrival',
].map((suffix) => `a1_u1_reunion_${suffix}.webp`);
const rejectedInstructionTerms = /\b(?:modelo|señal|señales|destino|origen|relación singular|relación plural|pista dice|boy|girl|man|woman|father|mother|reading|writing|eating|drinking)\b/i;

const filename = (url) => path.basename(String(url || '').split(/[?#]/, 1)[0]);
const heroFilename = (card) => filename(
  card.prompt_image_url || card.options.find((option) => option.image_url)?.image_url,
);
const tokens = (text) => String(text || '').toLowerCase().match(/[a-z]+/g) || [];

assert.equal(mission.experience_type, 'mission');
assert.equal(mission.content_revision, 6, 'The voice-game mission must invalidate the ordinary pronunciation-panel revision.');
assert.equal(mission.cards.length, 22);
assert.deepEqual(mission.cards.map((card) => card.slide_id), Array.from({ length: 22 }, (_item, index) => `M${String(index + 1).padStart(2, '0')}`));
assert.deepEqual(mission.cards.map((card) => card.mission_chapter_id), chapterIds);
assert.deepEqual(mission.cards.map((card) => card.mission_game.kind), gameKinds);
assert.deepEqual(mission.cards.map((card) => card.stage), [...Array(18).fill('Listen'), ...Array(4).fill('Speak')]);
assert.deepEqual(mission.cards.map((card) => card.interaction_type), [...Array(18).fill('mission-game'), ...Array(3).fill('mission-speak'), 'mission-finale']);
assert.deepEqual(mission.review_vocabulary, goldVocabulary);

mission.cards.forEach((card) => {
  const game = card.mission_game;
  const options = new Map(card.options.map((option) => [option.id, option]));
  const targets = new Map(game.targets.map((target) => [target.id, target]));
  const expectedIds = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  assert.ok(game.instruction_es.startsWith('Escucha'));
  assert.doesNotMatch(game.instruction_es, rejectedInstructionTerms);
  assert.ok(game.cues.length >= 1);
  assert.deepEqual(game.cues.map((cue) => cue.option_id), expectedIds);
  if (game.kind !== 'voice-gate') assert.ok(game.targets.length >= 4, `${card.slide_id} needs at least four visible candidates.`);
  for (const target of game.targets) {
    assert.ok(target.rect.width >= 0.12 && target.rect.height >= 0.16);
    assert.ok(target.rect.x >= 0 && target.rect.y >= 0);
    assert.ok(target.rect.x + target.rect.width <= 1.0001);
    assert.ok(target.rect.y + target.rect.height <= 1.0001);
  }
  for (const cue of game.cues) {
    assert.ok(options.has(cue.option_id));
    assert.ok(targets.has(cue.target_id));
    assert.ok(targets.get(cue.target_id).accepted_option_ids.includes(cue.option_id));
  }
  const expectedTurns = game.kind === 'voice-gate'
    ? [game.cues[0].text]
    : game.cues.map((cue) => cue.text);
  assert.deepEqual(card.audio_turns.map((turn) => turn.text), expectedTurns);
});

assert.equal(mission.cards[0].mission_game.tutorial_mode, 'guided-no-fail');
assert.ok(mission.cards.slice(1).every((card) => !card.mission_game.tutorial_mode));
for (const card of mission.cards.slice(18)) {
  assert.equal(card.prompt_image_url, '', `${card.slide_id} must not duplicate its speaking image.`);
  assert.equal(card.options.filter((option) => option.image_url).length, 1);
}

const heroes = mission.cards.map(heroFilename);
assert.deepEqual(heroes, heroAssets);
assert.equal(new Set(heroes).size, 22);
const earlierMedia = new Set(course
  .filter((item) => item.unit_id === 'unit-1' && Number(item.sub_lesson_id.split('.')[1]) < 10)
  .flatMap((item) => item.cards)
  .flatMap((card) => [card.prompt_image_url, ...card.options.map((option) => option.image_url)])
  .filter(Boolean)
  .map(filename));
assert.deepEqual(heroes.filter((asset) => earlierMedia.has(asset)), []);

const learnedTokens = new Set(mission.cards.flatMap((card) => [
  card.prompt,
  card.audio_text,
  ...card.mission_game.cues.flatMap((cue) => [cue.text, cue.answer_text]),
  ...card.options.map((option) => option.label),
]).flatMap(tokens));
assert.deepEqual(goldVocabulary.filter((word) => !learnedTokens.has(word)), []);
const missionLanguage = [...learnedTokens].join(' ');
for (const question of ['who', 'he', 'she', 'they']) assert.ok(missionLanguage.includes(question));

console.log('Lesson 1.10 real-game contract passed: 18 listening challenges, 4 speaking gates, 22 unique scenes.');
