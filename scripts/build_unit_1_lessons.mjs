import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = join(process.cwd(), 'backend', 'lessons', 'unit_1');
const stageOrder = ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'];
const stagePrefix = { Learn: 'L', Recognize: 'R', Listen: 'A', Speak: 'S', Use: 'U' };
const media = (name) => `/lesson-assets/${name}`;
const activePrompt = (entry) => entry.active || entry.prompt;
const imageOption = (id, image, label) => ({ id, image_url: media(image), label });
const textOption = (id, label) => ({ id, image_url: '', label });

const assets = {
  boy: 'boy.webp', girl: 'girl.webp', man: 'man.webp', woman: 'woman.webp',
  boyEating: 'boy_is_eating.webp', manDrinking: 'man_is_drinking.webp',
  girlReading: 'girl_is_reading.webp', girlWriting: 'girl_is_writing.webp', womanWriting: 'woman_is_writing.webp',
  manSitting: 'man_is_sitting.webp', boySwimming: 'boy_is_swimming.webp',
  girlSleeping: 'girl_is_sleeping.webp', pair: 'they_boy_girl.webp',
  pairEating: 'they_boy_girl_are_eating.webp', pairReading: 'they_boy_girl_are_reading.webp',
  pairRunning: 'they_boy_girl_are_running.webp', pairWriting: 'they_boy_girl_are_writing.webp',
  family: 'family_all_members.webp', baby: 'family_baby.webp', babies: 'family_babies.webp',
  babySleeping: 'family_baby_sleeping.webp', children: 'family_children.webp',
  childrenPlaying: 'family_children_playing.webp', brother: 'boy.webp', brothers: 'family_brothers.webp',
  brotherStudying: 'family_brother_studying.webp', sister: 'girl.webp', sisters: 'family_sisters.webp',
  sisterPlaying: 'family_sister_playing.webp', adults: 'family_adults.webp', father: 'family_father.webp',
  fatherTalking: 'family_father_talking.webp', fatherWorking: 'family_father_working.webp',
  mother: 'family_mother.webp', motherCooking: 'family_mother_cooking.webp', parents: 'family_parents.webp',
  parentsTalking: 'family_parents_talking.webp', grandfather: 'family_grandfather.webp',
  grandmother: 'family_grandmother.webp', grandparents: 'family_grandparents.webp',
  grandparentsGrandchildren: 'family_grandparents_grandchildren.webp',
  parentsChildren: 'family_parents_children.webp',
  grandparentsTalking: 'family_grandparents_talking.webp', grandparentsSitting: 'family_grandparents_sitting.webp',
  reviewBoyEating: 'a1_u1_review_boy_eating.webp', reviewGirlWriting: 'a1_u1_review_girl_writing.webp',
  reviewManReading: 'a1_u1_review_man_reading.webp', reviewWomanDrinking: 'a1_u1_review_woman_drinking.webp',
  reviewChildrenRunning: 'a1_u1_review_children_running.webp', reviewChildrenSwimming: 'a1_u1_review_children_swimming.webp',
  reviewBabySleeping: 'a1_u1_review_baby_sleeping.webp', reviewBrothersStudying: 'a1_u1_review_brothers_studying.webp',
  reviewSistersPlaying: 'a1_u1_review_sisters_playing.webp', reviewFamily: 'a1_u1_review_family_story.webp',
  reviewFatherWorking: 'a1_u1_review_father_working.webp', reviewMotherCooking: 'a1_u1_review_mother_cooking.webp',
  reviewParentsTalking: 'a1_u1_review_parents_talking.webp', reviewGrandparentsTalking: 'a1_u1_review_grandparents_talking.webp',
};

const missionKickoffAsset = 'a1_u1_reunion_kickoff.webp';
const missionHeroAssets = [
  'a1_u1_reunion_01_people_path.webp',
  'a1_u1_reunion_02_four_people_search.webp',
  'a1_u1_reunion_03_pronoun_arrival.webp',
  'a1_u1_reunion_04_age_groups.webp',
  'a1_u1_reunion_05_babies.webp',
  'a1_u1_reunion_06_brother_sister.webp',
  'a1_u1_reunion_07_sibling_pairs.webp',
  'a1_u1_reunion_08_parents.webp',
  'a1_u1_reunion_09_generations.webp',
  'a1_u1_reunion_10_eat_drink.webp',
  'a1_u1_reunion_11_read_write.webp',
  'a1_u1_reunion_12_run_swim.webp',
  'a1_u1_reunion_13_sit_sleep.webp',
  'a1_u1_reunion_14_play_study.webp',
  'a1_u1_reunion_15_work_cook_talk.webp',
  'a1_u1_reunion_16_not_eating.webp',
  'a1_u1_reunion_17_not_reading.webp',
  'a1_u1_reunion_18_not_running.webp',
  'a1_u1_reunion_19_who_father.webp',
  'a1_u1_reunion_20_who_grandmother.webp',
  'a1_u1_reunion_21_who_parents.webp',
  'a1_u1_reunion_22_family_arrival.webp',
];

function baseCard({ prompt, stage, correct, options, audio = null, answer = null, promptImage = '', interaction, correctIds }) {
  const card = { interaction_type: interaction, prompt, stage, correct_option_id: correct, options,
    audio_text: audio, answer_audio_text: answer, prompt_image_url: promptImage ? media(promptImage) : '' };
  if (correctIds?.length > 1) card.correct_option_ids = correctIds;
  return card;
}

const teach = (entry) => ({ ...baseCard({ prompt: entry.prompt, stage: 'Learn', correct: 'answer',
  options: [imageOption('answer', entry.image, entry.label || entry.prompt)], audio: entry.audio || entry.prompt,
  answer: null, interaction: 'teach' }), translation: entry.translation });

function distinctEntries(entries, entry, count, { matchOptionFamily = false } = {}) {
  const seen = new Set([entry.image]);
  const result = [];
  for (const candidate of entries) {
    if (matchOptionFamily && entry.optionFamily && candidate.optionFamily !== entry.optionFamily) continue;
    if (seen.has(candidate.image)) continue;
    seen.add(candidate.image);
    result.push(candidate);
    if (result.length === count) break;
  }
  if (result.length < count) throw new Error(`Not enough distinct images for ${entry.prompt}`);
  return result;
}

function imageChoice(entry, entries, stage, count = 2, audio = entry.prompt) {
  const effectiveCount = entry.distractors ? Math.min(count, entry.distractors.length + 1) : count;
  const alternatives = entry.distractors?.slice(0, effectiveCount - 1)
    || distinctEntries(entries, entry, effectiveCount - 1, { matchOptionFamily: true });
  if (entry.optionFamily && alternatives.some((candidate) => candidate.optionFamily !== entry.optionFamily)) {
    throw new Error(`Mixed visual option families for ${entry.prompt}`);
  }
  const ordered = entry.reverseOptions ? [...alternatives, entry] : [entry, ...alternatives];
  return { ...baseCard({ prompt: stage === 'Listen' ? 'Listen and choose.' : activePrompt(entry), stage, correct: 'correct',
    options: ordered.map((item, index) => imageOption(item === entry ? 'correct' : `wrong-${index}`, item.image, item.choice || activePrompt(item))),
    audio, answer: entry.answer || null, interaction: `${stage === 'Listen' ? 'a2i' : 't2i'}${effectiveCount}` }), translation: entry.activeTranslation || entry.translation };
}

function textChoice(entry, entries, stage, audio = null) {
  const correctLabel = entry.choice || activePrompt(entry);
  const distractors = entry.textDistractors || distinctEntries(entries, entry, 2).map((item) => item.choice || activePrompt(item));
  const labels = [correctLabel, ...distractors.slice(0, 2)];
  if (entry.reverseOptions) labels.reverse();
  return { ...baseCard({ prompt: stage === 'Listen' ? 'Listen and choose.' : (entry.recognizePrompt ?? ''), stage, correct: 'correct',
    options: labels.map((label, index) => textOption(label === correctLabel ? 'correct' : `wrong-${index}`, label)),
    audio: stage === 'Listen' ? (audio || entry.listenAudio || entry.audio || entry.prompt) : (entry.recognizeAudio ?? null),
    answer: entry.answer || correctLabel, promptImage: stage === 'Recognize' ? entry.image : '',
    interaction: `${stage === 'Listen' ? 'a2t' : 'i2t'}${labels.length}` }), translation: entry.activeTranslation || entry.translation };
}

const say = (entry) => ({ ...baseCard({ prompt: entry.speak || activePrompt(entry), stage: 'Speak', correct: 'answer',
  options: [imageOption('answer', entry.image, entry.speak || activePrompt(entry))], audio: entry.speak || activePrompt(entry),
  interaction: 'speak' }), translation: entry.activeTranslation || entry.translation });

function complete({ prompt, image, answer, correct, choices, translation }) {
  const ids = Array.isArray(correct) ? correct : [correct];
  return { ...baseCard({ prompt, stage: 'Use', correct: ids[0], correctIds: ids,
    options: choices.map(([id, label]) => textOption(id, label)), audio: prompt, answer, promptImage: image,
    interaction: ids.length > 1 ? 'complete4' : `complete${choices.length}` }), translation };
}

function finalizeStage(stage, cards, storyLabel) {
  return cards.map((card, index) => ({ slide_id: `${stagePrefix[stage]}${index + 1}`, ...card,
    spanish_translation: card.translation || '',
    pedagogy_note: `Story beat ${String(index + 1).padStart(2, '0')}: ${storyLabel}; this ${stage.toLowerCase()} card advances the same ordered arc.` }));
}

function buildLesson({ id, number, title, goal, vocabulary, reviewVocabulary, grammarFunction, prerequisite, speakingOutcome, purposefulReviewSlides, entries, textRecognize = [], listenIndexes, speakIndexes, uses, review = false }) {
  const recognize = entries.map((entry, index) => textRecognize.includes(index)
    ? textChoice(entry, entries, 'Recognize')
    : imageChoice(entry, entries, 'Recognize', index % 4 === 0 ? 4 : 2, entry.recognizeAudio ?? activePrompt(entry)));
  const listen = listenIndexes.map((spec, position) => {
    const index = typeof spec === 'number' ? spec : spec.index;
    const entry = entries[index];
    const audio = typeof spec === 'number' ? (entry.listenAudio || entry.audio || activePrompt(entry)) : spec.audio;
    const useTextChoice = (typeof spec !== 'number' && spec.mode === 'text')
      || (typeof spec === 'number' || spec.mode !== 'image') && position % 3 === 2;
    return useTextChoice ? textChoice(entry, entries, 'Listen', audio)
      : imageChoice(entry, entries, 'Listen', position % 4 === 0 ? 4 : 2, audio);
  });
  const cards = [
    ...finalizeStage('Learn', entries.map(teach), `${number} story`),
    ...finalizeStage('Recognize', recognize, `${number} story`),
    ...finalizeStage('Listen', listen, `${number} story`),
    ...finalizeStage('Speak', speakIndexes.map((index) => say(entries[index])), `${number} story`),
    ...finalizeStage('Use', uses, `${number} story`),
  ];
  const expected = review ? 54 : 42;
  if (cards.length !== expected) throw new Error(`${number} must contain ${expected} cards, found ${cards.length}`);
  if (JSON.stringify([...new Set(cards.map((card) => card.stage))]) !== JSON.stringify(stageOrder)) throw new Error(`${number} has invalid stage order`);
  return { id, title: `${number} ${title}`, level: 'Beginner A1', unit_id: 'unit-1',
    unit_title: 'Unit 1: People, Family, and Actions', unit_outcome: 'Understand and produce simple sentences about people, family members, and actions.',
    lesson_id: 'lesson-1', lesson_title: 'Unit 1: People, Family, and Actions', sub_lesson_id: number,
    sub_lesson_title: title, goal, vocabulary, review_vocabulary: reviewVocabulary, grammar_function: grammarFunction,
    prerequisite, speaking_outcome: speakingOutcome, purposeful_review_slides: purposefulReviewSlides, cards };
}

const l12 = [
  { prompt: 'The boy', image: assets.boy, translation: 'El niño', optionFamily: 'person-portrait', distractors: [
    { prompt: 'The girl', image: assets.girl, optionFamily: 'person-portrait' },
    { prompt: 'The man', image: assets.man, optionFamily: 'person-portrait' },
    { prompt: 'The woman', image: assets.woman, optionFamily: 'person-portrait' },
  ] },
  { prompt: 'Eating', image: assets.boyEating, translation: 'Comiendo', optionFamily: 'person-action' },
  { prompt: 'The boy is eating.', image: assets.boyEating, translation: 'El niño está comiendo.', optionFamily: 'person-action', textDistractors: ['The man is drinking.', 'The girl is reading.'], distractors: [{ prompt: 'The man is drinking.', image: assets.manDrinking, optionFamily: 'person-action' }] },
  { prompt: 'He is eating.', image: assets.boyEating, translation: 'Él está comiendo.', optionFamily: 'person-action', distractors: [{ prompt: 'He is drinking.', image: assets.manDrinking, optionFamily: 'person-action' }] },
  { prompt: 'Drinking', image: assets.manDrinking, translation: 'Bebiendo', optionFamily: 'person-action', textDistractors: ['Eating', 'Reading'] },
  { prompt: 'The man is drinking. He is drinking.', image: assets.manDrinking, translation: 'El hombre está bebiendo. Él está bebiendo.', optionFamily: 'person-action', textDistractors: ['The boy is eating. He is eating.', 'The girl is reading. She is reading.'], distractors: [{ prompt: 'The boy is eating. He is eating.', image: assets.boyEating, optionFamily: 'person-action' }] },
  { prompt: 'Reading', image: assets.girlReading, translation: 'Leyendo', optionFamily: 'person-action' },
  { prompt: 'The girl is reading. She is reading.', image: assets.girlReading, translation: 'La niña está leyendo. Ella está leyendo.', optionFamily: 'person-action', textDistractors: ['The man is drinking. He is drinking.', 'The woman is writing. She is writing.'] },
  { prompt: 'Writing', image: assets.womanWriting, translation: 'Escribiendo', optionFamily: 'person-action' },
  { prompt: 'The woman is writing. She is writing.', image: assets.womanWriting, translation: 'La mujer está escribiendo. Ella está escribiendo.', optionFamily: 'person-action', textDistractors: ['The boy is eating. He is eating.', 'The girl is reading. She is reading.'], distractors: [{ prompt: 'The boy is eating. He is eating.', image: assets.boyEating, optionFamily: 'person-action' }] },
];
const lesson12 = buildLesson({
  id: 'lesson-2-pronouns', number: '1.2', title: 'People in Action',
  goal: 'Follow four familiar people through eating, drinking, reading, and writing, then describe each person with a longer sentence.',
  vocabulary: ['the', 'eating', 'drinking', 'reading', 'writing'], reviewVocabulary: ['boy', 'girl', 'man', 'woman', 'he', 'she', 'is'],
  grammarFunction: 'The + person + is + action; He/She is + action.', prerequisite: 'Lesson 1.1: a boy, a girl, a man, a woman, he, she, and is.',
  speakingOutcome: 'Describe one familiar person doing one of four actions.', purposefulReviewSlides: ['L3', 'L4', 'L6', 'L8', 'L10', 'S7', 'U7'],
  entries: l12, textRecognize: [2, 5, 7, 9], listenIndexes: [0, 2, 4, 5, 6, 7, 8, 9], speakIndexes: [0, 2, 3, 5, 7, 8, 9],
  uses: [
    complete({ prompt: 'The ___ is eating.', image: assets.boyEating, answer: 'The boy is eating.', correct: 'boy', choices: [['man', 'man'], ['boy', 'boy']], translation: 'El ___ está comiendo.' }),
    complete({ prompt: 'The boy is eating, ___ is eating.', image: assets.boyEating, answer: 'The boy is eating, he is eating.', correct: 'he', choices: [['she', 'she'], ['he', 'he']], translation: 'El niño está comiendo, ___ está comiendo.' }),
    complete({ prompt: 'The man is ___.', image: assets.manDrinking, answer: 'The man is drinking.', correct: 'drinking', choices: [['drinking', 'drinking'], ['reading', 'reading']], translation: 'El hombre está ___.' }),
    complete({ prompt: 'The girl is ___.', image: assets.girlReading, answer: 'The girl is reading.', correct: 'reading', choices: [['writing', 'writing'], ['reading', 'reading']], translation: 'La niña está ___.' }),
    complete({ prompt: 'She is ___.', image: assets.girlReading, answer: 'She is reading.', correct: 'reading', choices: [['reading', 'reading'], ['drinking', 'drinking']], translation: 'Ella está ___.' }),
    complete({ prompt: 'The woman is ___.', image: assets.womanWriting, answer: 'The woman is writing.', correct: 'writing', choices: [['eating', 'eating'], ['writing', 'writing']], translation: 'La mujer está ___.' }),
    complete({ prompt: 'The ___ is writing. ___ is writing.', image: assets.womanWriting, answer: 'The woman is writing. She is writing.', correct: ['woman', 'she'], choices: [['woman', 'woman'], ['he', 'He'], ['she', 'She']], translation: 'La ___ está escribiendo. ___ está escribiendo.' }),
  ],
});

const l13 = [
  { prompt: 'The boy and the girl', image: assets.pair, translation: 'El niño y la niña', optionFamily: 'person-portrait', distractors: [
    { prompt: 'The boy', image: assets.boy, optionFamily: 'person-portrait' },
    { prompt: 'The girl', image: assets.girl, optionFamily: 'person-portrait' },
    { prompt: 'The man', image: assets.man, optionFamily: 'person-portrait' },
  ] },
  { prompt: 'They', image: assets.pair, translation: 'Ellos', optionFamily: 'person-portrait', textDistractors: ['He', 'She'] },
  { prompt: 'They are eating.', image: assets.pairEating, translation: 'Ellos están comiendo.', optionFamily: 'pair-action' },
  { prompt: 'They are running.', image: assets.pairRunning, translation: 'Ellos están corriendo.', optionFamily: 'pair-action', textDistractors: ['They are eating.', 'They are reading.'] },
  { prompt: 'The man is sitting.', image: assets.manSitting, translation: 'El hombre está sentado.', optionFamily: 'male-action', textDistractors: ['The man is drinking.', 'The boy is swimming.'], distractors: [
    { prompt: 'The boy is swimming.', image: assets.boySwimming, optionFamily: 'male-action' },
    { prompt: 'The boy is eating.', image: assets.boyEating, optionFamily: 'male-action' },
    { prompt: 'The man is drinking.', image: assets.manDrinking, optionFamily: 'male-action' },
  ] },
  { prompt: 'He is swimming.', image: assets.boySwimming, translation: 'Él está nadando.', optionFamily: 'male-action', distractors: [
    { prompt: 'He is sitting.', image: assets.manSitting, optionFamily: 'male-action' },
    { prompt: 'He is eating.', image: assets.boyEating, optionFamily: 'male-action' },
    { prompt: 'He is drinking.', image: assets.manDrinking, optionFamily: 'male-action' },
  ] },
  { prompt: 'She is sleeping.', image: assets.girlSleeping, translation: 'Ella está durmiendo.', optionFamily: 'female-action', textDistractors: ['She is reading.', 'She is writing.'], distractors: [
    { prompt: 'She is reading.', image: assets.girlReading, optionFamily: 'female-action' },
    { prompt: 'She is writing.', image: assets.womanWriting, optionFamily: 'female-action' },
  ] },
  { prompt: 'The boy and the girl are reading.', image: assets.pairReading, translation: 'El niño y la niña están leyendo.', optionFamily: 'pair-action', textDistractors: ['The boy and the girl are eating.', 'The boy and the girl are running.'], distractors: [{ prompt: 'The boy and the girl are eating.', image: assets.pairEating, optionFamily: 'pair-action' }] },
  { prompt: 'They are writing.', image: assets.pairWriting, translation: 'Ellos están escribiendo.', optionFamily: 'pair-action', distractors: [
    { prompt: 'They are eating.', image: assets.pairEating, optionFamily: 'pair-action' },
    { prompt: 'They are running.', image: assets.pairRunning, optionFamily: 'pair-action' },
    { prompt: 'They are reading.', image: assets.pairReading, optionFamily: 'pair-action' },
  ] },
  { prompt: 'The boy and the girl are running.', image: assets.pairRunning, translation: 'El niño y la niña están corriendo.', optionFamily: 'pair-action', textDistractors: ['The boy and the girl are eating.', 'The boy and the girl are reading.'], distractors: [{ prompt: 'The boy and the girl are eating.', image: assets.pairEating, optionFamily: 'pair-action' }] },
];
const lesson13 = buildLesson({
  id: 'lesson-3-two-people', number: '1.3', title: 'Two People: They and Are',
  goal: 'Connect two people with and, replace them with they, and use are while adding running, sitting, swimming, and sleeping.',
  vocabulary: ['and', 'they', 'are', 'running', 'sitting', 'swimming', 'sleeping'], reviewVocabulary: ['the', 'boy', 'girl', 'man', 'he', 'she', 'is', 'eating', 'reading', 'writing'],
  grammarFunction: 'Person and person + are + action; They are + action.', prerequisite: 'Lessons 1.1-1.2: people, he/she, is, the, and familiar actions.',
  speakingOutcome: 'Describe one or two people with is or are.', purposefulReviewSlides: ['L3', 'L7', 'L8', 'L9', 'L10', 'S7', 'U7'],
  entries: l13, textRecognize: [1, 4, 7, 9], listenIndexes: [0, 2, 3, 4, 5, 6, 7, 9], speakIndexes: [0, 2, 3, 4, 5, 6, 9],
  uses: [
    complete({ prompt: 'The boy ___ the girl', image: assets.pair, answer: 'The boy and the girl', correct: 'and', choices: [['and', 'and'], ['are', 'are']], translation: 'El niño ___ la niña' }),
    complete({ prompt: '___ are eating.', image: assets.pairEating, answer: 'They are eating.', correct: 'they', choices: [['he', 'He'], ['they', 'They']], translation: '___ están comiendo.' }),
    complete({ prompt: 'They ___ running.', image: assets.pairRunning, answer: 'They are running.', correct: 'are', choices: [['is', 'is'], ['are', 'are']], translation: 'Ellos ___ corriendo.' }),
    complete({ prompt: 'The man is ___.', image: assets.manSitting, answer: 'The man is sitting.', correct: 'sitting', choices: [['running', 'running'], ['sitting', 'sitting']], translation: 'El hombre está ___.' }),
    complete({ prompt: 'He is ___.', image: assets.boySwimming, answer: 'He is swimming.', correct: 'swimming', choices: [['sleeping', 'sleeping'], ['swimming', 'swimming']], translation: 'Él está ___.' }),
    complete({ prompt: 'She is ___.', image: assets.girlSleeping, answer: 'She is sleeping.', correct: 'sleeping', choices: [['sleeping', 'sleeping'], ['sitting', 'sitting']], translation: 'Ella está ___.' }),
    complete({ prompt: 'The boy and the girl are writing. ___ ___ writing.', image: assets.pairWriting, answer: 'The boy and the girl are writing. They are writing.', correct: ['they', 'are'], choices: [['is', 'is'], ['they', 'They'], ['are', 'are']], translation: 'El niño y la niña están escribiendo. ___ ___ escribiendo.' }),
  ],
});

const l14 = [
  { prompt: 'A family', image: assets.family, translation: 'Una familia', distractors: [{ prompt: 'A man', image: assets.man }, { prompt: 'A woman', image: assets.woman }, { prompt: 'A baby', image: assets.baby }] },
  { prompt: 'A baby', image: assets.baby, translation: 'Un bebé', textDistractors: ['A man', 'A woman'], distractors: [{ prompt: 'A man', image: assets.man }] },
  { prompt: 'Babies', active: 'They are babies.', image: assets.babies, translation: 'Bebés', activeTranslation: 'Ellos son bebés.', textDistractors: ['He is a baby.', 'She is a baby.'], distractors: [{ prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters }] },
  { prompt: 'A child', active: 'He is a child.', image: assets.brother, translation: 'Un niño', activeTranslation: 'Él es un niño.', textDistractors: ['He is a man.', 'She is a child.'], distractors: [{ prompt: 'A man', active: 'He is a man.', image: assets.man }] },
  { prompt: 'Children', active: 'They are children.', image: assets.children, translation: 'Niños', activeTranslation: 'Ellos son niños.', distractors: [{ prompt: 'Adults', active: 'They are adults.', image: assets.adults }, { prompt: 'Parents', active: 'They are parents.', image: assets.parents }, { prompt: 'Grandparents', active: 'They are grandparents.', image: assets.grandparents }] },
  { prompt: 'A brother', active: 'He is a brother.', image: assets.brother, translation: 'Un hermano', activeTranslation: 'Él es un hermano.', textDistractors: ['She is a sister.', 'They are brothers.'], distractors: [{ prompt: 'A sister', active: 'She is a sister.', image: assets.sister }] },
  { prompt: 'Brothers', active: 'They are brothers.', image: assets.brothers, translation: 'Hermanos', activeTranslation: 'Ellos son hermanos.', textDistractors: ['They are sisters.', 'They are babies.'], distractors: [{ prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters }] },
  { prompt: 'A sister', active: 'She is a sister.', image: assets.sister, translation: 'Una hermana', activeTranslation: 'Ella es una hermana.', textDistractors: ['He is a brother.', 'They are sisters.'], distractors: [{ prompt: 'A brother', active: 'He is a brother.', image: assets.brother }] },
  { prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters, translation: 'Hermanas', activeTranslation: 'Ellas son hermanas.', distractors: [{ prompt: 'Brothers', active: 'They are brothers.', image: assets.brothers }, { prompt: 'Parents', active: 'They are parents.', image: assets.parents }, { prompt: 'Grandparents', active: 'They are grandparents.', image: assets.grandparents }] },
  { prompt: 'They are a family.', image: assets.family, translation: 'Ellos son una familia.', distractors: [{ prompt: 'He is a man.', image: assets.man }] },
];
const lesson14 = buildLesson({
  id: 'lesson-4-children-siblings', number: '1.4', title: 'Children and Siblings',
  goal: 'Meet the younger members of one family and distinguish one person from more than one.',
  vocabulary: ['family', 'baby', 'babies', 'child', 'children', 'brother', 'brothers', 'sister', 'sisters'],
  reviewVocabulary: ['a', 'they', 'are'], grammarFunction: 'A + singular family member; plural family words; They are + group.',
  prerequisite: 'Lesson 1.3: and, they, and are for more than one person.',
  speakingOutcome: 'Name babies, children, brothers, sisters, and the family group.', purposefulReviewSlides: ['L9', 'R10', 'A8', 'S7', 'U7'],
  entries: l14, textRecognize: [1, 3, 5, 7], listenIndexes: [0, 1, 2, 4, 5, 6, 8, 9], speakIndexes: [0, 1, 2, 4, 6, 8, 9],
  uses: [
    complete({ prompt: '___ baby.', image: assets.baby, answer: 'A baby.', correct: 'a', choices: [['a', 'A'], ['they', 'They']], translation: '___ bebé.' }),
    complete({ prompt: '___.', image: assets.babies, answer: 'Babies.', correct: 'babies', choices: [['baby', 'Baby'], ['babies', 'Babies']], translation: '___.' }),
    complete({ prompt: '___ child.', image: assets.brother, answer: 'A child.', correct: 'a', choices: [['they', 'They'], ['a', 'A']], translation: '___ niño.' }),
    complete({ prompt: '___.', image: assets.children, answer: 'Children.', correct: 'children', choices: [['children', 'Children'], ['brothers', 'Brothers']], translation: '___.' }),
    complete({ prompt: '___ brother.', image: assets.brother, answer: 'A brother.', correct: 'a', choices: [['a', 'A'], ['the', 'The']], translation: '___ hermano.' }),
    complete({ prompt: '___.', image: assets.sisters, answer: 'Sisters.', correct: 'sisters', choices: [['brothers', 'Brothers'], ['sisters', 'Sisters']], translation: '___.' }),
    complete({ prompt: '___ are ___ family.', image: assets.family, answer: 'They are a family.', correct: ['they', 'a'], choices: [['family', 'family'], ['they', 'They'], ['a', 'a']], translation: '___ son una familia.' }),
  ],
});

const l15 = [
  { prompt: 'An adult', image: assets.father, translation: 'Un adulto', optionFamily: 'single-person', textDistractors: ['A boy', 'A girl'], distractors: [
    { prompt: 'A boy', image: assets.boy, optionFamily: 'single-person' },
    { prompt: 'A girl', image: assets.girl, optionFamily: 'single-person' },
    { prompt: 'A baby', image: assets.baby, optionFamily: 'single-person' },
  ] },
  { prompt: 'Adults', image: assets.adults, translation: 'Adultos' },
  { prompt: 'He is the father.', image: assets.father, translation: 'Él es el padre.', textDistractors: ['She is the mother.', 'They are the parents.'] },
  { prompt: 'She is the mother.', image: assets.mother, translation: 'Ella es la madre.', distractors: [{ prompt: 'He is the father.', image: assets.father }] },
  { prompt: 'They are the parents.', image: assets.parents, translation: 'Ellos son los padres.', optionFamily: 'family-group', distractors: [
    { prompt: 'They are the children.', image: assets.children, optionFamily: 'family-group' },
    { prompt: 'They are the babies.', image: assets.babies, optionFamily: 'family-group' },
    { prompt: 'They are the sisters.', image: assets.sisters, optionFamily: 'family-group' },
  ] },
  { prompt: 'He is the grandfather.', image: assets.grandfather, translation: 'Él es el abuelo.', textDistractors: ['She is the grandmother.', 'They are the grandparents.'] },
  { prompt: 'She is the grandmother.', image: assets.grandmother, translation: 'Ella es la abuela.', distractors: [{ prompt: 'He is the grandfather.', image: assets.grandfather }] },
  { prompt: 'They are the grandparents.', image: assets.grandparents, translation: 'Ellos son los abuelos.', distractors: [{ prompt: 'They are the sisters.', image: assets.sisters }] },
  { prompt: 'The parents and the children are a family.', image: assets.parentsChildren, translation: 'Los padres y los niños son una familia.', textDistractors: ['The parents and the children are babies.', 'The parents and the children are sisters.'] },
  { prompt: 'The grandparents and the grandchildren are family.', image: assets.grandparentsGrandchildren, translation: 'Los abuelos y los nietos son familia.', distractors: [{ prompt: 'The parents and the children are a family.', image: assets.parentsChildren }] },
];
const lesson15 = buildLesson({
  id: 'lesson-5-parents-grandparents', number: '1.5', title: 'Parents and Grandparents',
  goal: 'Meet the adults in the family, name their roles, and connect grandparents with their grandchildren.',
  vocabulary: ['an', 'adult', 'adults', 'father', 'mother', 'parents', 'grandfather', 'grandmother', 'grandparents', 'grandchildren'],
  reviewVocabulary: ['he', 'she', 'they', 'is', 'are', 'the', 'and', 'family', 'children', 'baby'],
  grammarFunction: 'An + singular adult; He/She is the + role; They are the + plural role.',
  prerequisite: 'Lessons 1.1-1.4: singular and plural people, he/she/they, is/are, and family.',
  speakingOutcome: 'Identify parents and grandparents in singular and plural sentences.', purposefulReviewSlides: ['L3', 'L4', 'L5', 'L8', 'L9', 'L10', 'U7'],
  entries: l15, textRecognize: [0, 2, 5, 8], listenIndexes: [0, 1, 2, 3, 4, 5, 6, 7], speakIndexes: [0, 2, 3, 4, 5, 6, 7],
  uses: [
    complete({ prompt: '___ adult.', image: assets.father, answer: 'An adult.', correct: 'an', choices: [['a', 'A'], ['an', 'An']], translation: '___ adulto.' }),
    complete({ prompt: '___.', image: assets.adults, answer: 'Adults.', correct: 'adults', choices: [['adult', 'Adult'], ['adults', 'Adults']], translation: '___.' }),
    complete({ prompt: 'He is the ___.', image: assets.father, answer: 'He is the father.', correct: 'father', choices: [['father', 'father'], ['mother', 'mother']], translation: 'Él es el ___.' }),
    complete({ prompt: 'She is the ___.', image: assets.mother, answer: 'She is the mother.', correct: 'mother', choices: [['father', 'father'], ['mother', 'mother']], translation: 'Ella es la ___.' }),
    complete({ prompt: 'They are the ___.', image: assets.parents, answer: 'They are the parents.', correct: 'parents', choices: [['parents', 'parents'], ['sisters', 'sisters']], translation: 'Ellos son los ___.' }),
    complete({ prompt: 'He is the ___.', image: assets.grandfather, answer: 'He is the grandfather.', correct: 'grandfather', choices: [['grandmother', 'grandmother'], ['grandfather', 'grandfather']], translation: 'Él es el ___.' }),
    complete({ prompt: 'She is the ___. They are the ___.', image: assets.grandparents, answer: 'She is the grandmother. They are the grandparents.', correct: ['grandmother', 'grandparents'], choices: [['grandfather', 'grandfather'], ['grandmother', 'grandmother'], ['grandparents', 'grandparents']], translation: 'Ella es la ___. Ellos son los ___.' }),
  ],
});

const l16 = [
  { prompt: 'Playing', image: assets.childrenPlaying, translation: 'Jugando' },
  { prompt: 'The children are playing.', image: assets.childrenPlaying, translation: 'Los niños están jugando.' },
  { prompt: 'Studying', image: assets.brotherStudying, translation: 'Estudiando' },
  { prompt: 'A brother is studying.', image: assets.brotherStudying, translation: 'Un hermano está estudiando.' },
  { prompt: 'Working', image: assets.fatherWorking, translation: 'Trabajando' },
  { prompt: 'The father is working.', image: assets.fatherWorking, translation: 'El padre está trabajando.' },
  { prompt: 'Cooking', image: assets.motherCooking, translation: 'Cocinando' },
  { prompt: 'The mother is cooking.', image: assets.motherCooking, translation: 'La madre está cocinando.' },
  { prompt: 'Talking', image: assets.parentsTalking, translation: 'Hablando' },
  { prompt: 'The parents are talking.', image: assets.parentsTalking, translation: 'Los padres están hablando.' },
];
const lesson16 = buildLesson({
  id: 'lesson-6-family-actions', number: '1.6', title: 'Family Actions',
  goal: 'Follow family members through playing, studying, working, cooking, and talking.',
  vocabulary: ['playing', 'studying', 'working', 'cooking', 'talking'],
  reviewVocabulary: ['children', 'brother', 'father', 'mother', 'parents', 'a', 'the', 'is', 'are'],
  grammarFunction: 'Family person/group + is/are + action.', prerequisite: 'Lessons 1.1-1.5: family roles and is/are.',
  speakingOutcome: 'Describe what children, a brother, the father, the mother, and the parents are doing.', purposefulReviewSlides: ['L2', 'L4', 'L6', 'L8', 'L10', 'S7', 'U7'],
  entries: l16, textRecognize: [1, 3, 5, 7], listenIndexes: [0, 1, 2, 3, 4, 5, 7, 9], speakIndexes: [0, 1, 3, 5, 7, 8, 9],
  uses: [
    complete({ prompt: 'The children are ___.', image: assets.childrenPlaying, answer: 'The children are playing.', correct: 'playing', choices: [['studying', 'studying'], ['playing', 'playing']], translation: 'Los niños están ___.' }),
    complete({ prompt: 'A brother is ___.', image: assets.brotherStudying, answer: 'A brother is studying.', correct: 'studying', choices: [['playing', 'playing'], ['studying', 'studying']], translation: 'Un hermano está ___.' }),
    complete({ prompt: 'The father is ___.', image: assets.fatherWorking, answer: 'The father is working.', correct: 'working', choices: [['working', 'working'], ['cooking', 'cooking']], translation: 'El padre está ___.' }),
    complete({ prompt: 'The mother is ___.', image: assets.motherCooking, answer: 'The mother is cooking.', correct: 'cooking', choices: [['talking', 'talking'], ['cooking', 'cooking']], translation: 'La madre está ___.' }),
    complete({ prompt: 'The parents are ___.', image: assets.parentsTalking, answer: 'The parents are talking.', correct: 'talking', choices: [['working', 'working'], ['talking', 'talking']], translation: 'Los padres están ___.' }),
    complete({ prompt: 'The ___ are talking.', image: assets.parentsTalking, answer: 'The parents are talking.', correct: 'parents', choices: [['children', 'children'], ['parents', 'parents']], translation: 'Los ___ están hablando.' }),
    complete({ prompt: 'The ___ are talking. ___ are talking.', image: assets.parentsTalking, answer: 'The parents are talking. They are talking.', correct: ['parents', 'they'], choices: [['father', 'father'], ['parents', 'parents'], ['they', 'They']], translation: 'Los ___ están hablando. ___ están hablando.' }),
  ],
});

const l17 = [
  { prompt: 'The father is talking.', image: assets.fatherTalking, translation: 'El padre está hablando.' },
  { prompt: 'He is not cooking.', image: assets.fatherTalking, translation: 'Él no está cocinando.', recognizePrompt: 'He is not cooking.', recognizeAudio: 'He is not cooking.', choice: 'He is not cooking.', textDistractors: ['He is cooking.'], distractors: [{ prompt: 'She is cooking.', image: assets.motherCooking }], answer: 'He is not cooking. He is talking.' },
  { prompt: 'The girl is writing.', image: assets.girlWriting, translation: 'La niña está escribiendo.' },
  { prompt: 'She is not reading.', image: assets.girlWriting, translation: 'Ella no está leyendo.', recognizePrompt: 'She is not reading.', recognizeAudio: 'She is not reading.', choice: 'She is not reading.', textDistractors: ['She is reading.'], distractors: [{ prompt: 'She is reading.', image: assets.girlReading }], answer: 'She is not reading. She is writing.' },
  { prompt: 'The boy and the girl are running.', image: assets.pairRunning, translation: 'El niño y la niña están corriendo.' },
  { prompt: 'They are not sitting.', image: assets.pairRunning, translation: 'Ellos no están sentados.', recognizePrompt: 'They are not sitting.', recognizeAudio: 'They are not sitting.', choice: 'They are not sitting.', textDistractors: ['They are sitting.'], distractors: [{ prompt: 'They are sitting.', image: assets.grandparentsSitting }], answer: 'They are not sitting. They are running.' },
  { prompt: 'The sister is playing.', image: assets.sisterPlaying, translation: 'La hermana está jugando.' },
  { prompt: 'She is not studying.', image: assets.sisterPlaying, translation: 'Ella no está estudiando.', recognizePrompt: 'She is not studying.', recognizeAudio: 'She is not studying.', choice: 'She is not studying.', textDistractors: ['She is studying.'], distractors: [{ prompt: 'He is studying.', image: assets.brotherStudying }], answer: 'She is not studying. She is playing.' },
  { prompt: 'The grandparents are sitting and talking.', image: assets.grandparentsTalking, translation: 'Los abuelos están sentados y hablando.' },
  { prompt: 'They are not sleeping.', image: assets.grandparentsTalking, translation: 'Ellos no están durmiendo.', recognizePrompt: 'They are not sleeping.', recognizeAudio: 'They are not sleeping.', choice: 'They are not sleeping.', textDistractors: ['They are sleeping.'], distractors: [{ prompt: 'The baby is sleeping.', image: assets.babySleeping }], answer: 'They are not sleeping. They are sitting and talking.' },
];
const lesson17 = buildLesson({
  id: 'lesson-7-is-are-not', number: '1.7', title: 'What They Are Not Doing',
  goal: 'Use not to contrast what familiar people are doing with what they are not doing.', vocabulary: ['not'],
  reviewVocabulary: ['he', 'she', 'they', 'is', 'are', 'father', 'girl', 'sister', 'grandparents', 'talking', 'cooking', 'writing', 'reading', 'running', 'sitting', 'playing', 'studying', 'sleeping'],
  grammarFunction: 'He/She is not + action; They are not + action.', prerequisite: 'Lessons 1.1-1.6: people, family roles, pronouns, is/are, and actions.',
  speakingOutcome: 'Say a positive action and a true negative contrast about the same scene.', purposefulReviewSlides: ['L1', 'L3', 'L5', 'L7', 'L9', 'S7', 'U7'],
  entries: l17, textRecognize: [],
  listenIndexes: [{ index: 0, audio: 'The father is talking.' }, { index: 1, audio: 'He is not cooking.', mode: 'image' }, { index: 2, audio: 'The girl is writing.' }, { index: 3, audio: 'She is not reading.', mode: 'image' }, { index: 4, audio: 'They are running.' }, { index: 5, audio: 'They are not sitting.', mode: 'image' }, { index: 7, audio: 'She is not studying.', mode: 'image' }, { index: 9, audio: 'They are not sleeping.', mode: 'image' }],
  speakIndexes: [0, 1, 2, 3, 4, 5, 9],
  uses: [
    complete({ prompt: 'The father is ___.', image: assets.fatherTalking, answer: 'The father is talking.', correct: 'talking', choices: [['cooking', 'cooking'], ['talking', 'talking']], translation: 'El padre está ___.' }),
    complete({ prompt: 'He is ___ cooking.', image: assets.fatherTalking, answer: 'He is not cooking.', correct: 'not', choices: [['not', 'not'], ['is', 'is']], translation: 'Él no está cocinando.' }),
    complete({ prompt: 'The girl is ___.', image: assets.girlWriting, answer: 'The girl is writing.', correct: 'writing', choices: [['reading', 'reading'], ['writing', 'writing']], translation: 'La niña está ___.' }),
    complete({ prompt: 'She is ___ reading.', image: assets.girlWriting, answer: 'She is not reading.', correct: 'not', choices: [['is', 'is'], ['not', 'not']], translation: 'Ella no está leyendo.' }),
    complete({ prompt: 'They are ___.', image: assets.pairRunning, answer: 'They are running.', correct: 'running', choices: [['sitting', 'sitting'], ['running', 'running']], translation: 'Ellos están ___.' }),
    complete({ prompt: 'They are ___ sitting.', image: assets.pairRunning, answer: 'They are not sitting.', correct: 'not', choices: [['are', 'are'], ['not', 'not']], translation: 'Ellos no están sentados.' }),
    complete({ prompt: 'They are ___ sleeping. They are ___.', image: assets.grandparentsTalking, answer: 'They are not sleeping. They are talking.', correct: ['not', 'talking'], choices: [['sleeping', 'sleeping'], ['not', 'not'], ['talking', 'talking']], translation: 'Ellos no están durmiendo. Están hablando.' }),
  ],
});

const l18 = [
  { prompt: 'Who is he?', image: assets.father, translation: '¿Quién es él?', recognizePrompt: 'Who is he?', recognizeAudio: 'Who is he?', choice: 'He is the father.', textDistractors: ['She is the mother.', 'They are the parents.'], distractors: [{ prompt: 'She is the mother.', image: assets.mother }, { prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the sisters.', image: assets.sisters }], answer: 'He is the father.' },
  { prompt: 'He is the father.', image: assets.father, translation: 'Él es el padre.', textDistractors: ['She is the mother.', 'They are the parents.'], distractors: [{ prompt: 'She is the mother.', image: assets.mother }, { prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the sisters.', image: assets.sisters }] },
  { prompt: 'Who is she?', image: assets.mother, translation: '¿Quién es ella?', recognizePrompt: 'Who is she?', recognizeAudio: 'Who is she?', choice: 'She is the mother.', textDistractors: ['He is the father.', 'They are the parents.'], distractors: [{ prompt: 'He is the father.', image: assets.father }, { prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the brothers.', image: assets.brothers }], answer: 'She is the mother.' },
  { prompt: 'She is the mother.', image: assets.mother, translation: 'Ella es la madre.', textDistractors: ['He is the father.', 'They are the parents.'], distractors: [{ prompt: 'He is the father.', image: assets.father }, { prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the brothers.', image: assets.brothers }] },
  { prompt: 'Who are they?', image: assets.parents, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the parents.', textDistractors: ['They are the brothers.', 'They are the sisters.'], distractors: [{ prompt: 'They are the brothers.', image: assets.brothers }, { prompt: 'They are the sisters.', image: assets.sisters }, { prompt: 'They are the babies.', image: assets.babies }], answer: 'They are the parents.' },
  { prompt: 'They are the parents.', image: assets.parents, translation: 'Ellos son los padres.', textDistractors: ['They are the brothers.', 'They are the sisters.'], distractors: [{ prompt: 'They are the brothers.', image: assets.brothers }, { prompt: 'They are the sisters.', image: assets.sisters }, { prompt: 'They are the babies.', image: assets.babies }] },
  { prompt: 'Who are they?', image: assets.children, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the children.', textDistractors: ['They are the parents.', 'They are the grandparents.'], distractors: [{ prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the grandparents.', image: assets.grandparents }, { prompt: 'They are adults.', image: assets.adults }], answer: 'They are the children.' },
  { prompt: 'They are the children.', image: assets.children, translation: 'Ellos son los niños.', textDistractors: ['They are the parents.', 'They are the grandparents.'], distractors: [{ prompt: 'They are the parents.', image: assets.parents }, { prompt: 'They are the grandparents.', image: assets.grandparents }, { prompt: 'They are adults.', image: assets.adults }] },
  { prompt: 'Who are they?', image: assets.grandparents, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the grandparents.', textDistractors: ['They are the brothers.', 'They are the sisters.'], distractors: [{ prompt: 'They are the brothers.', image: assets.brothers }, { prompt: 'They are the sisters.', image: assets.sisters }, { prompt: 'They are the babies.', image: assets.babies }], answer: 'They are the grandparents.' },
  { prompt: 'They are the grandparents.', image: assets.grandparents, translation: 'Ellos son los abuelos.', textDistractors: ['They are the brothers.', 'They are the sisters.'], distractors: [{ prompt: 'They are the brothers.', image: assets.brothers }, { prompt: 'They are the sisters.', image: assets.sisters }, { prompt: 'They are the babies.', image: assets.babies }] },
];
// Five explicit question/answer beats recur in every section. The visitors
// ask about the indicated target; answer choices retain subject-only portraits.
function buildWhoLesson() {
  const questions = l18.filter((_, index) => index % 2 === 0).map((entry, index) => ({
    ...entry, image: `a1_who_question_${['father', 'mother', 'parents', 'children', 'grandparents'][index]}.webp`,
    choice: entry.prompt, answer: null, recognizePrompt: '', recognizeAudio: null,
    textDistractors: ['Who is he?', 'Who is she?', 'Who are they?'].filter((text) => text !== entry.prompt),
  }));
  const answerImages = Object.fromEntries(['father', 'mother', 'parents', 'children'].map(
    (identity) => [assets[identity], `a1_who_answer_${identity}.webp`],
  ));
  const answers = l18.filter((_, index) => index % 2 === 1).map((entry) => ({
    ...entry, image: answerImages[entry.image] || entry.image,
    distractors: entry.distractors.map((alternative) => ({
      ...alternative, image: answerImages[alternative.image] || alternative.image,
    })),
  }));
  const castQuestion = (card) => ({ ...card, audio_speaker: 'male-character', answer_audio_speaker: 'male-character' });
  const pairCards = (questionBuilder, answerBuilder) => questions.flatMap((question, index) => [
    castQuestion(questionBuilder(question, index)), answerBuilder(answers[index], index),
  ]);
  const questionChoice = (question, index) => {
    // Each bank contrasts the indicated referent's singular/plural or gender,
    // never two different groups which both answer "Who are they?".
    const alternative = questions[index === 0 ? 1 : 0];
    return imageChoice({ ...question, distractors: [alternative], reverseOptions: index % 2 === 1 },
      questions, 'Listen', 2, question.prompt);
  };
  const questionCompletions = [
    ['Who ___ he?', 'is', [['are', 'are'], ['is', 'is']]],
    ['Who is ___?', 'she', [['he', 'he'], ['she', 'she']]],
    ['Who ___ they?', 'are', [['are', 'are'], ['is', 'is']]],
    ['Who are ___?', 'they', [['she', 'she'], ['they', 'they']]],
    ['Who ___ they?', 'are', [['is', 'is'], ['are', 'are']]],
  ];
  const answerCompletions = [
    ['He is the ___.', 'father', [['mother', 'mother'], ['father', 'father']]],
    ['She is the ___.', 'mother', [['mother', 'mother'], ['father', 'father']]],
    ['They are the ___.', 'parents', [['brothers', 'brothers'], ['parents', 'parents']]],
    ['They are the ___.', 'children', [['children', 'children'], ['parents', 'parents']]],
    ['They ___ the ___.', ['are', 'grandparents'], [['is', 'is'], ['are', 'are'], ['grandparents', 'grandparents']]],
  ];
  const completion = (entry, spec) => complete({ prompt: spec[0], image: entry.image,
    answer: entry.prompt, correct: spec[1], choices: spec[2], translation: entry.translation });
  const sections = {
    Learn: pairCards(teach, teach),
    Recognize: pairCards((question, index) => textChoice({ ...question, reverseOptions: index % 2 === 1 }, questions, 'Recognize'),
      (answer, index) => imageChoice({ ...answer, reverseOptions: index % 2 === 0 }, answers, 'Recognize', 2)),
    Listen: pairCards(questionChoice, (answer, index) => index % 2 === 0
      ? imageChoice({ ...answer, reverseOptions: true }, answers, 'Listen', 2, answer.prompt)
      : textChoice(answer, answers, 'Listen', answer.prompt)),
    Speak: pairCards(say, say),
    Use: pairCards((question, index) => completion(question, questionCompletions[index]),
      (answer, index) => completion(answer, answerCompletions[index])),
  };
  return {
    id: 'lesson-8-who', title: '1.8 Who Is He? Who Are They?', level: 'Beginner A1',
    unit_id: 'unit-1', unit_title: 'Unit 1: People, Family, and Actions',
    unit_outcome: 'Understand and produce simple sentences about people, family members, and actions.',
    lesson_id: 'lesson-1', lesson_title: 'Unit 1: People, Family, and Actions',
    sub_lesson_id: '1.8', sub_lesson_title: 'Who Is He? Who Are They?',
    goal: 'Ask who people are and answer with the correct family role.', vocabulary: ['who'],
    review_vocabulary: ['he', 'she', 'they', 'is', 'are', 'the', 'father', 'mother', 'parents', 'children', 'grandparents'],
    grammar_function: 'Who is he/she? Who are they? Identity answer with is/are.',
    prerequisite: 'Lessons 1.1-1.7: pronouns, is/are, and family roles.',
    speaking_outcome: 'Ask and answer who one person or a family group is.',
    purposeful_review_slides: ['L2', 'L4', 'L6', 'L8', 'L10', 'S10', 'U10'],
    cards: stageOrder.flatMap((stage) => finalizeStage(stage, sections[stage], '1.8 identity question/answer pairs')),
  };
}
const lesson18 = buildWhoLesson();

const l19 = [
  { prompt: 'The boy is eating. He is eating.', image: assets.reviewBoyEating, translation: 'El niño está comiendo. Él está comiendo.' },
  { prompt: 'The girl is writing. She is writing.', image: assets.reviewGirlWriting, translation: 'La niña está escribiendo. Ella está escribiendo.' },
  { prompt: 'The man is reading. He is reading.', image: assets.reviewManReading, translation: 'El hombre está leyendo. Él está leyendo.' },
  { prompt: 'The woman is drinking. She is drinking.', image: assets.reviewWomanDrinking, translation: 'La mujer está bebiendo. Ella está bebiendo.' },
  { prompt: 'The boy and the girl are running. They are running.', image: assets.reviewChildrenRunning, translation: 'El niño y la niña están corriendo. Ellos están corriendo.' },
  { prompt: 'The children are swimming.', image: assets.reviewChildrenSwimming, translation: 'Los niños están nadando.', textDistractors: ['The children are running.', 'The children are studying.'] },
  { prompt: 'The baby is sleeping.', image: assets.reviewBabySleeping, translation: 'El bebé está durmiendo.', distractors: [{ prompt: 'The boy is eating.', image: assets.reviewBoyEating }] },
  { prompt: 'The brothers are studying.', image: assets.reviewBrothersStudying, translation: 'Los hermanos están estudiando.', textDistractors: ['The brothers are swimming.', 'The brothers are running.'], distractors: [{ prompt: 'The sisters are playing.', image: assets.reviewSistersPlaying }] },
  { prompt: 'The sisters are playing.', image: assets.reviewSistersPlaying, translation: 'Las hermanas están jugando.', distractors: [
    { prompt: 'The brothers are studying.', image: assets.reviewBrothersStudying },
    { prompt: 'The children are swimming.', image: assets.reviewChildrenSwimming },
    { prompt: 'The boy and the girl are running.', image: assets.reviewChildrenRunning },
  ] },
  { prompt: 'They are a family.', image: assets.reviewFamily, translation: 'Ellos son una familia.', textDistractors: ['They are not a family.', 'They are babies.'] },
  { prompt: 'Who is he? He is the father. The father is working.', image: assets.reviewFatherWorking, translation: '¿Quién es él? Es el padre. El padre está trabajando.', distractors: [{ prompt: 'Who is she? She is the mother. The mother is cooking.', image: assets.reviewMotherCooking }] },
  { prompt: 'Who is she? She is the mother. The mother is cooking.', image: assets.reviewMotherCooking, translation: '¿Quién es ella? Es la madre. La madre está cocinando.', textDistractors: ['Who is she? She is the mother. The mother is reading.', 'Who is she? She is the mother. The mother is swimming.'] },
  { prompt: 'Who are they? They are the parents. The parents are talking.', image: assets.reviewParentsTalking, translation: '¿Quiénes son ellos? Son los padres. Los padres están hablando.', textDistractors: ['Who are they? They are the parents. The parents are running.', 'Who are they? They are the parents. The parents are swimming.'], distractors: [
    { prompt: 'Who are they? They are the brothers. The brothers are studying.', image: assets.reviewBrothersStudying },
    { prompt: 'Who are they? They are the sisters. The sisters are playing.', image: assets.reviewSistersPlaying },
    { prompt: 'Who are they? They are the children. The children are swimming.', image: assets.reviewChildrenSwimming },
  ] },
  { prompt: 'Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.', image: assets.reviewGrandparentsTalking, translation: '¿Quiénes son ellos? Son los abuelos. Están sentados y hablando. No están durmiendo.', textDistractors: ['Who are they? They are the grandparents. They are running and talking. They are not sleeping.', 'Who are they? They are the grandparents. They are sitting and sleeping. They are not talking.'], distractors: [{ prompt: 'Who are they? They are the brothers. They are sitting and studying. They are not sleeping.', image: assets.reviewBrothersStudying }] },
];
const lesson19 = buildLesson({
  id: 'lesson-9-unit-review', number: '1.9', title: 'Unit 1 Story Review', review: true,
  goal: 'Revisit the Unit 1 cast in entirely new scenes and connect people, pronouns, family roles, actions, questions, and one true contrast.',
  vocabulary: [], reviewVocabulary: ['a', 'an', 'the', 'boy', 'girl', 'man', 'woman', 'he', 'she', 'is', 'and', 'they', 'are', 'running', 'sitting', 'swimming', 'sleeping', 'family', 'baby', 'children', 'brothers', 'sisters', 'adult', 'father', 'mother', 'parents', 'grandfather', 'grandmother', 'grandparents', 'playing', 'studying', 'working', 'cooking', 'talking', 'not', 'who', 'eating', 'drinking', 'reading', 'writing'],
  grammarFunction: 'Integrated Unit 1 identity, action, question, singular/plural, and negative patterns.', prerequisite: 'Lessons 1.1-1.8 completed.',
  speakingOutcome: 'Tell a short connected story about people and family members in action.', purposefulReviewSlides: ['L1', 'L5', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'S8', 'U8'],
  entries: l19, textRecognize: [1, 3, 5, 7, 9, 11, 13],
  listenIndexes: [{ index: 0, audio: l19[0].prompt }, { index: 1, audio: l19[1].prompt }, { index: 2, audio: l19[2].prompt }, { index: 3, audio: l19[3].prompt }, { index: 4, audio: l19[4].prompt }, { index: 5, audio: l19[5].prompt }, { index: 7, audio: l19[7].prompt }, { index: 9, audio: l19[9].prompt, mode: 'text' }, { index: 12, audio: l19[12].prompt }, { index: 13, audio: l19[13].prompt }],
  speakIndexes: [0, 1, 4, 5, 8, 10, 12, 13],
  uses: [
    complete({ prompt: 'The ___ is eating. ___ is eating.', image: assets.reviewBoyEating, answer: 'The boy is eating. He is eating.', correct: ['boy', 'he'], choices: [['girl', 'girl'], ['boy', 'boy'], ['he', 'He']], translation: 'El ___ está comiendo. ___ está comiendo.' }),
    complete({ prompt: 'The woman is ___. ___ is drinking.', image: assets.reviewWomanDrinking, answer: 'The woman is drinking. She is drinking.', correct: ['drinking', 'she'], choices: [['reading', 'reading'], ['drinking', 'drinking'], ['she', 'She']], translation: 'La mujer está ___. ___ está bebiendo.' }),
    complete({ prompt: 'The boy ___ the girl are running. ___ are running.', image: assets.reviewChildrenRunning, answer: 'The boy and the girl are running. They are running.', correct: ['and', 'they'], choices: [['are', 'are'], ['and', 'and'], ['they', 'They']], translation: 'El niño ___ la niña están corriendo. ___ están corriendo.' }),
    complete({ prompt: 'The ___ are studying.', image: assets.reviewBrothersStudying, answer: 'The brothers are studying.', correct: 'brothers', choices: [['sisters', 'sisters'], ['brothers', 'brothers']], translation: 'Los ___ están estudiando.' }),
    complete({ prompt: 'The sisters are ___.', image: assets.reviewSistersPlaying, answer: 'The sisters are playing.', correct: 'playing', choices: [['studying', 'studying'], ['playing', 'playing']], translation: 'Las hermanas están ___.' }),
    complete({ prompt: 'Who ___ he? He is the ___.', image: assets.reviewFatherWorking, answer: 'Who is he? He is the father.', correct: ['is', 'father'], choices: [['are', 'are'], ['is', 'is'], ['father', 'father']], translation: '¿Quién es él? Él es el padre.' }),
    complete({ prompt: 'Who are they? They are the ___. They are ___.', image: assets.reviewParentsTalking, answer: 'Who are they? They are the parents. They are talking.', correct: ['parents', 'talking'], choices: [['sisters', 'sisters'], ['parents', 'parents'], ['talking', 'talking']], translation: '¿Quiénes son ellos? Son los padres. Están hablando.' }),
    complete({ prompt: 'They are the ___. They are ___ sleeping.', image: assets.reviewGrandparentsTalking, answer: 'They are the grandparents. They are not sleeping.', correct: ['grandparents', 'not'], choices: [['brothers', 'brothers'], ['grandparents', 'grandparents'], ['not', 'not']], translation: 'Ellos son los abuelos. No están durmiendo.' }),
  ],
});

const missionTarget = (id, labelEs, acceptedOptionIds, [x, y, width, height]) => ({
  id,
  label_es: labelEs,
  rect: { x, y, width, height },
  accepted_option_ids: acceptedOptionIds,
});

function missionGameCard({
  beat, chapter, phase, kind, stage, instruction, validation, targets, choices,
  translation, prompt = '', audio = null, answer = null, cueAudio = null,
  tutorialMode = null, interaction = null, imageOptionId = null,
}) {
  const image = missionHeroAssets[beat - 1];
  const correct = targets.flatMap((target) => target.accepted_option_ids);
  const effectiveInteraction = interaction
    || (kind === 'speak' ? 'mission-speak' : kind === 'finale' ? 'mission-finale' : 'mission-sentence');
  const options = choices.map(([id, label]) => (
    id === imageOptionId ? imageOption(id, image, label) : textOption(id, label)
  ));
  return {
    chapter,
    phase,
    card: {
      ...baseCard({
        prompt,
        stage,
        correct: correct[0],
        correctIds: correct,
        options,
        audio,
        answer,
        promptImage: image,
        interaction: effectiveInteraction,
      }),
      translation,
      mission_game: {
        kind,
        instruction_es: instruction,
        validation,
        targets,
        ...(tutorialMode ? { tutorial_mode: tutorialMode } : {}),
        ...(cueAudio ? { cue_audio_text: cueAudio } : {}),
      },
    },
  };
}

const missionBlueprint = [
  missionGameCard({
    beat: 1, chapter: 'find-the-people', kind: 'hotspot', stage: 'Learn',
    phase: 'a guided no-fail search teaches the first mission gesture while finding the boy',
    prompt: 'A boy.', audio: 'A boy.', translation: 'Un niño.',
    instruction: 'Escucha “A boy” y toca al niño que está iluminado. Esta primera búsqueda es una guía: no puedes fallar.',
    validation: 'single', tutorialMode: 'guided-no-fail', interaction: 'mission-clue',
    choices: [['boy', 'A boy.']],
    targets: [missionTarget('boy', 'Niño iluminado', ['boy'], [0.08, 0.16, 0.28, 0.68])],
  }),
  missionGameCard({
    beat: 2, chapter: 'find-the-people', kind: 'hotspot', stage: 'Listen',
    phase: 'the searchlight finds the girl, man, and woman in the spoken sequence',
    audio: 'A girl. A man. A woman.', answer: null,
    translation: 'Una niña. Un hombre. Una mujer.',
    instruction: 'Escucha cada pista y toca, en ese orden, a la niña, al hombre y a la mujer. La luz avanzará después de cada acierto.',
    validation: 'ordered', interaction: 'mission-sentence',
    choices: [['girl', 'A girl.'], ['man', 'A man.'], ['woman', 'A woman.']],
    targets: [
      missionTarget('girl', 'Niña', ['girl'], [0.72, 0.15, 0.24, 0.73]),
      missionTarget('man', 'Hombre', ['man'], [0.28, 0.11, 0.22, 0.76]),
      missionTarget('woman', 'Mujer', ['woman'], [0.52, 0.12, 0.22, 0.76]),
    ],
  }),
  missionGameCard({
    beat: 3, chapter: 'find-the-people', kind: 'label-placement', stage: 'Use',
    phase: 'pronoun signals identify each person with correct singular agreement',
    answer: 'He is a boy. She is a girl. He is a man. She is a woman.',
    translation: 'Él es un niño. Ella es una niña. Él es un hombre. Ella es una mujer.',
    instruction: 'Arrastra cada señal hasta la persona que describe. También puedes tocar una señal y después su destino.',
    validation: 'unordered',
    choices: [
      ['he-boy', 'He is a boy.'], ['she-girl', 'She is a girl.'],
      ['he-man', 'He is a man.'], ['she-woman', 'She is a woman.'],
    ],
    targets: [
      missionTarget('boy', 'Niño', ['he-boy'], [0.12, 0.12, 0.17, 0.78]),
      missionTarget('girl', 'Niña', ['she-girl'], [0.57, 0.14, 0.16, 0.76]),
      missionTarget('man', 'Hombre', ['he-man'], [0.30, 0.10, 0.20, 0.80]),
      missionTarget('woman', 'Mujer', ['she-woman'], [0.72, 0.10, 0.19, 0.80]),
    ],
  }),
  missionGameCard({
    beat: 4, chapter: 'connect-the-family', kind: 'label-placement', stage: 'Use',
    phase: 'people pass through child and adult checkpoints before forming the two groups',
    answer: 'The boy is a child. The girl is a child. The man is an adult. The woman is an adult. The boy and the girl are children. The man and the woman are adults.',
    translation: 'El niño es un menor. La niña es una menor. El hombre es un adulto. La mujer es una adulta. El niño y la niña son menores. El hombre y la mujer son adultos.',
    instruction: 'Coloca cada descripción en su retrato. Después une a los dos menores y a los dos adultos en sus grupos.',
    validation: 'unordered',
    choices: [
      ['boy-child', 'The boy is a child.'], ['girl-child', 'The girl is a child.'],
      ['man-adult', 'The man is an adult.'], ['woman-adult', 'The woman is an adult.'],
      ['children', 'The boy and the girl are children.'], ['adults', 'The man and the woman are adults.'],
    ],
    targets: [
      missionTarget('boy', 'Niño', ['boy-child'], [0.10, 0.12, 0.16, 0.80]),
      missionTarget('girl', 'Niña', ['girl-child'], [0.24, 0.14, 0.15, 0.76]),
      missionTarget('man', 'Hombre', ['man-adult'], [0.57, 0.10, 0.16, 0.82]),
      missionTarget('woman', 'Mujer', ['woman-adult'], [0.72, 0.10, 0.17, 0.82]),
      missionTarget('children', 'Grupo de menores', ['children'], [0.05, 0.08, 0.43, 0.86]),
      missionTarget('adults', 'Grupo de adultos', ['adults'], [0.52, 0.08, 0.43, 0.86]),
    ],
  }),
  missionGameCard({
    beat: 5, chapter: 'connect-the-family', kind: 'relationship-link', stage: 'Use',
    phase: 'singular and plural baby clues connect to child and children',
    answer: 'A baby is a child. Babies are children.',
    translation: 'Un bebé es un menor. Los bebés son menores.',
    instruction: 'Une el bebé con la relación singular y el grupo de bebés con la relación plural. También puedes tocar origen y destino.',
    validation: 'unordered',
    choices: [['baby-child', 'A baby is a child.'], ['babies-children', 'Babies are children.']],
    targets: [
      missionTarget('baby', 'Un bebé', ['baby-child'], [0.06, 0.15, 0.40, 0.68]),
      missionTarget('babies', 'Varios bebés', ['babies-children'], [0.54, 0.15, 0.40, 0.68]),
    ],
  }),
  missionGameCard({
    beat: 6, chapter: 'connect-the-family', kind: 'relationship-link', stage: 'Recognize',
    phase: 'the singular brother and sister connections are established',
    answer: 'He is the brother. She is the sister.',
    translation: 'Él es el hermano. Ella es la hermana.',
    instruction: 'Une cada persona con su relación: brother para él y sister para ella.',
    validation: 'unordered',
    choices: [['brother', 'He is the brother.'], ['sister', 'She is the sister.']],
    targets: [
      missionTarget('brother', 'Hermano', ['brother'], [0.07, 0.14, 0.39, 0.70]),
      missionTarget('sister', 'Hermana', ['sister'], [0.54, 0.14, 0.39, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 7, chapter: 'connect-the-family', kind: 'relationship-link', stage: 'Recognize',
    phase: 'the plural brothers and sisters groups are marked without ambiguous overlap',
    answer: 'They are the brothers. They are the sisters.',
    translation: 'Ellos son los hermanos. Ellas son las hermanas.',
    instruction: 'Une brothers con el grupo de niños y sisters con el grupo de niñas.',
    validation: 'unordered',
    choices: [['brothers', 'They are the brothers.'], ['sisters', 'They are the sisters.']],
    targets: [
      missionTarget('brothers', 'Grupo de hermanos', ['brothers'], [0.05, 0.16, 0.42, 0.67]),
      missionTarget('sisters', 'Grupo de hermanas', ['sisters'], [0.53, 0.16, 0.42, 0.67]),
    ],
  }),
  missionGameCard({
    beat: 8, chapter: 'connect-the-family', kind: 'relationship-link', stage: 'Use',
    phase: 'father and mother connect into the parents relationship',
    answer: 'He is the father. She is the mother. They are the parents.',
    translation: 'Él es el padre. Ella es la madre. Ellos son los padres.',
    instruction: 'Conecta al padre y a la madre con sus nombres. Luego conecta a la pareja con parents.',
    validation: 'unordered',
    choices: [
      ['father', 'He is the father.'], ['mother', 'She is the mother.'],
      ['parents', 'They are the parents.'],
    ],
    targets: [
      missionTarget('father', 'Padre', ['father'], [0.05, 0.13, 0.29, 0.60]),
      missionTarget('mother', 'Madre', ['mother'], [0.66, 0.13, 0.29, 0.60]),
      missionTarget('parents', 'Pareja de padres', ['parents'], [0.34, 0.54, 0.32, 0.41]),
    ],
  }),
  missionGameCard({
    beat: 9, chapter: 'connect-the-family', kind: 'relationship-link', stage: 'Listen',
    phase: 'the generation bridge connects grandparents and grandchildren',
    audio: 'He is the grandfather. She is the grandmother. They are the grandparents. They are the grandchildren.',
    answer: null,
    translation: 'Él es el abuelo. Ella es la abuela. Ellos son los abuelos. Ellos son los nietos.',
    instruction: 'Escucha cada relación y conéctala con la persona o el grupo correcto.',
    validation: 'ordered',
    choices: [
      ['grandfather', 'He is the grandfather.'], ['grandmother', 'She is the grandmother.'],
      ['grandparents', 'They are the grandparents.'], ['grandchildren', 'They are the grandchildren.'],
    ],
    targets: [
      missionTarget('grandfather', 'Abuelo', ['grandfather'], [0.04, 0.08, 0.27, 0.38]),
      missionTarget('grandmother', 'Abuela', ['grandmother'], [0.36, 0.08, 0.27, 0.38]),
      missionTarget('grandparents', 'Abuelos', ['grandparents'], [0.68, 0.08, 0.27, 0.38]),
      missionTarget('grandchildren', 'Nietos', ['grandchildren'], [0.22, 0.55, 0.56, 0.38]),
    ],
  }),
  missionGameCard({
    beat: 10, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Listen',
    phase: 'the first visible route follows eating and then drinking',
    audio: 'He is eating. He is drinking.', answer: null,
    translation: 'Él está comiendo. Él está bebiendo.',
    instruction: 'Escucha y sigue la ruta de izquierda a derecha: primero eating y después drinking.',
    validation: 'ordered',
    choices: [['eating', 'He is eating.'], ['drinking', 'He is drinking.']],
    targets: [
      missionTarget('eating', 'Primera acción', ['eating'], [0.05, 0.14, 0.42, 0.70]),
      missionTarget('drinking', 'Segunda acción', ['drinking'], [0.53, 0.14, 0.42, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 11, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Use',
    phase: 'the next visible route follows reading and then writing',
    answer: 'She is reading. She is writing.',
    translation: 'Ella está leyendo. Ella está escribiendo.',
    instruction: 'Traza la secuencia visible: toca primero reading y después writing.',
    validation: 'ordered',
    choices: [['reading', 'She is reading.'], ['writing', 'She is writing.']],
    targets: [
      missionTarget('reading', 'Primera acción', ['reading'], [0.05, 0.14, 0.42, 0.70]),
      missionTarget('writing', 'Segunda acción', ['writing'], [0.53, 0.14, 0.42, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 12, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Use',
    phase: 'the mother runs before the girl reaches the swimming station',
    answer: 'She is running. She is swimming.',
    translation: 'Ella está corriendo. Ella está nadando.',
    instruction: 'Sigue las flechas de la escena: primero running y después swimming.',
    validation: 'ordered',
    choices: [['running', 'She is running.'], ['swimming', 'She is swimming.']],
    targets: [
      missionTarget('running', 'Primera acción', ['running'], [0.05, 0.14, 0.42, 0.70]),
      missionTarget('swimming', 'Segunda acción', ['swimming'], [0.53, 0.14, 0.42, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 13, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Listen',
    phase: 'the boy is sitting before the route reaches the sleeping girl',
    audio: 'He is sitting. She is sleeping.', answer: null,
    translation: 'Él está sentado. Ella está durmiendo.',
    instruction: 'Escucha y toca las acciones en el orden indicado: sitting y luego sleeping.',
    validation: 'ordered',
    choices: [['sitting', 'He is sitting.'], ['sleeping', 'She is sleeping.']],
    targets: [
      missionTarget('sitting', 'Primera acción', ['sitting'], [0.05, 0.14, 0.42, 0.70]),
      missionTarget('sleeping', 'Segunda acción', ['sleeping'], [0.53, 0.14, 0.42, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 14, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Use',
    phase: 'the father and babies play before the route reaches the studying sister',
    answer: 'They are playing. She is studying.',
    translation: 'Ellos están jugando. Ella está estudiando.',
    instruction: 'Completa la ruta de preparación: primero playing y después studying.',
    validation: 'ordered',
    choices: [['playing', 'They are playing.'], ['studying', 'She is studying.']],
    targets: [
      missionTarget('playing', 'Primera acción', ['playing'], [0.05, 0.14, 0.42, 0.70]),
      missionTarget('studying', 'Segunda acción', ['studying'], [0.53, 0.14, 0.42, 0.70]),
    ],
  }),
  missionGameCard({
    beat: 15, chapter: 'follow-the-actions', kind: 'action-sequence', stage: 'Listen',
    phase: 'the grandmother works, the father cooks, and the sisters talk along the final route',
    audio: 'She is working. He is cooking. They are talking.', answer: null,
    translation: 'Ella está trabajando. Él está cocinando. Ellas están hablando.',
    instruction: 'Escucha y sigue las tres estaciones de izquierda a derecha: working, cooking y talking.',
    validation: 'ordered',
    choices: [
      ['working', 'She is working.'], ['cooking', 'He is cooking.'],
      ['talking', 'They are talking.'],
    ],
    targets: [
      missionTarget('working', 'Primera acción', ['working'], [0.03, 0.15, 0.30, 0.68]),
      missionTarget('cooking', 'Segunda acción', ['cooking'], [0.35, 0.15, 0.30, 0.68]),
      missionTarget('talking', 'Tercera acción', ['talking'], [0.67, 0.15, 0.30, 0.68]),
    ],
  }),
  missionGameCard({
    beat: 16, chapter: 'repair-the-clues', kind: 'not-correction', stage: 'Use',
    phase: 'the first false report is repaired with not and the visible drinking action',
    prompt: 'He is eating.', audio: 'He is eating.',
    answer: 'He is not eating. He is drinking.',
    translation: 'Él no está comiendo. Él está bebiendo.',
    instruction: 'La pista dice eating, pero la imagen muestra drinking. Toca la corrección verdadera con not.',
    validation: 'single',
    choices: [
      ['correct', 'He is not eating. He is drinking.'],
      ['wrong', 'He is eating. He is not drinking.'],
    ],
    targets: [missionTarget('false-report', 'Pista falsa', ['correct'], [0.08, 0.13, 0.84, 0.72])],
  }),
  missionGameCard({
    beat: 17, chapter: 'repair-the-clues', kind: 'not-correction', stage: 'Recognize',
    phase: 'the second false report is repaired with not and the visible writing action',
    prompt: 'She is reading.', audio: 'She is reading.',
    answer: 'She is not reading. She is writing.',
    translation: 'Ella no está leyendo. Ella está escribiendo.',
    instruction: 'La pista dice reading, pero ella está writing. Toca la corrección verdadera con not.',
    validation: 'single',
    choices: [
      ['correct', 'She is not reading. She is writing.'],
      ['wrong', 'She is reading. She is not writing.'],
    ],
    targets: [missionTarget('false-report', 'Pista falsa', ['correct'], [0.08, 0.13, 0.84, 0.72])],
  }),
  missionGameCard({
    beat: 18, chapter: 'repair-the-clues', kind: 'not-correction', stage: 'Listen',
    phase: 'the third false report is repaired with not and the visible sitting action',
    prompt: 'They are running.', audio: 'They are running.',
    answer: 'They are not running. They are sitting.',
    translation: 'Ellos no están corriendo. Ellos están sentados.',
    instruction: 'Escucha la pista falsa, observa la escena y toca la corrección que usa not.',
    validation: 'single', interaction: 'mission-listen',
    choices: [
      ['correct', 'They are not running. They are sitting.'],
      ['wrong', 'They are running. They are not sitting.'],
    ],
    targets: [missionTarget('false-report', 'Pista falsa', ['correct'], [0.08, 0.13, 0.84, 0.72])],
  }),
  missionGameCard({
    beat: 19, chapter: 'welcome-everyone', kind: 'who-dialogue', stage: 'Recognize',
    phase: 'the greeter asks who the clearly indicated father is',
    prompt: 'Who is he?', audio: 'Who is he?', answer: 'He is the father.',
    translation: '¿Quién es él? Él es el padre.',
    instruction: 'Mira a la persona señalada, escucha la pregunta y elige la respuesta correcta.',
    validation: 'single', interaction: 'mission-clue',
    choices: [
      ['father', 'He is the father.'], ['mother', 'He is the mother.'],
      ['sister', 'He is the sister.'],
    ],
    targets: [missionTarget('father', 'Padre señalado', ['father'], [0.31, 0.10, 0.38, 0.75])],
  }),
  missionGameCard({
    beat: 20, chapter: 'welcome-everyone', kind: 'speak', stage: 'Speak',
    phase: 'the learner hears who is she and speaks the grandmother answer',
    prompt: 'She is the grandmother.', audio: 'She is the grandmother.', cueAudio: 'Who is she?',
    answer: null, translation: '¿Quién es ella? Ella es la abuela.',
    instruction: 'Escucha “Who is she?”. Después escucha el modelo y di: “She is the grandmother.”',
    validation: 'single', imageOptionId: 'grandmother',
    choices: [['grandmother', 'She is the grandmother.']],
    targets: [missionTarget('grandmother', 'Abuela señalada', ['grandmother'], [0.31, 0.10, 0.38, 0.75])],
  }),
  missionGameCard({
    beat: 21, chapter: 'welcome-everyone', kind: 'who-dialogue', stage: 'Listen',
    phase: 'the plural who question resolves the parents relationship pass',
    prompt: 'Who are they?', audio: 'Who are they?', answer: 'They are the parents.',
    translation: '¿Quiénes son ellos? Ellos son los padres.',
    instruction: 'Escucha la pregunta plural y entrega la respuesta a la pareja señalada.',
    validation: 'single', interaction: 'mission-listen',
    choices: [
      ['parents', 'They are the parents.'], ['brothers', 'They are the brothers.'],
      ['sisters', 'They are the sisters.'],
    ],
    targets: [missionTarget('parents', 'Pareja de padres', ['parents'], [0.21, 0.12, 0.58, 0.72])],
  }),
  missionGameCard({
    beat: 22, chapter: 'welcome-everyone', kind: 'finale', stage: 'Speak',
    phase: 'the last family groups arrive and the learner speaks the reunion line',
    prompt: 'They are a family.', audio: 'They are a family.', cueAudio: 'Who are they?',
    answer: null, translation: '¿Quiénes son ellos? Ellos son una familia.',
    instruction: 'Toca el punto de reunión para recibir a los últimos grupos. Después escucha el modelo y di: “They are a family.”',
    validation: 'single', imageOptionId: 'family',
    choices: [['family', 'They are a family.']],
    targets: [missionTarget('reunion', 'Punto de reunión familiar', ['family'], [0.12, 0.12, 0.76, 0.75])],
  }),
];

const lesson110Cards = missionBlueprint.map(({ chapter, phase, card }, index) => {
  const { translation, ...cardFields } = card;
  return {
    slide_id: `M${String(index + 1).padStart(2, '0')}`,
    ...cardFields,
    mission_chapter_id: chapter,
    spanish_translation: translation || '',
    pedagogy_note: `Mission beat ${String(index + 1).padStart(2, '0')}/22: ${phase}; the completed interaction advances the same family celebration adventure.`,
  };
});

if (lesson110Cards.length !== 22) throw new Error(`1.10 must contain 22 mission beats, found ${lesson110Cards.length}`);
const missionChapterOrder = ['find-the-people', 'connect-the-family', 'follow-the-actions', 'repair-the-clues', 'welcome-everyone'];
if (JSON.stringify([...new Set(lesson110Cards.map((card) => card.mission_chapter_id))]) !== JSON.stringify(missionChapterOrder)) {
  throw new Error('1.10 mission chapters must remain in the reviewed celebration story order');
}
if (lesson110Cards.some((card, index) => card.slide_id !== `M${String(index + 1).padStart(2, '0')}`)) {
  throw new Error('1.10 mission slide IDs must remain M01 through M22');
}
const requiredMissionKinds = ['hotspot', 'label-placement', 'relationship-link', 'action-sequence', 'not-correction', 'who-dialogue', 'speak', 'finale'];
const authoredMissionKinds = new Set(lesson110Cards.map((card) => card.mission_game.kind));
if (requiredMissionKinds.some((kind) => !authoredMissionKinds.has(kind))) {
  throw new Error('1.10 must exercise all eight approved mission game kinds');
}
for (const [index, card] of lesson110Cards.entries()) {
  const expectedPrefix = `a1_u1_reunion_${String(index + 1).padStart(2, '0')}_`;
  if (!card.prompt_image_url.endsWith('.webp') || !card.prompt_image_url.includes(`/${expectedPrefix}`)) {
    throw new Error(`${card.slide_id} must use its ordered ${expectedPrefix} hero still`);
  }
  if (!card.mission_game.instruction_es.trim() || !card.mission_game.targets.length) {
    throw new Error(`${card.slide_id} requires an exact Spanish instruction and at least one target`);
  }
}

const unitOneLearnedVocabulary = [
  'a', 'boy', 'girl', 'man', 'woman', 'he', 'she', 'is', 'the', 'eating', 'drinking', 'reading', 'writing',
  'and', 'they', 'are', 'running', 'sitting', 'swimming', 'sleeping', 'family', 'baby', 'babies', 'child',
  'children', 'brother', 'brothers', 'sister', 'sisters', 'an', 'adult', 'adults', 'father', 'mother', 'parents',
  'grandfather', 'grandmother', 'grandparents', 'grandchildren', 'playing', 'studying', 'working', 'cooking', 'talking',
  'not', 'who',
];
const missionGoldText = lesson110Cards.map((card) => {
  const correctIds = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  const correctLabels = correctIds.map((id) => card.options.find((option) => option.id === id)?.label || '');
  return [card.prompt, card.audio_text, card.answer_audio_text, card.mission_game.cue_audio_text, ...correctLabels].filter(Boolean).join(' ');
}).join(' ').toLowerCase();
const missingMissionVocabulary = unitOneLearnedVocabulary.filter((word) => !new RegExp(`\\b${word}\\b`, 'i').test(missionGoldText));
if (missingMissionVocabulary.length) {
  throw new Error(`1.10 gold paths omit learned Unit 1 vocabulary: ${missingMissionVocabulary.join(', ')}`);
}

const authoredHeroUrls = lesson110Cards.map((card) => card.prompt_image_url);
if (
  new Set(authoredHeroUrls).size !== 22
  || JSON.stringify(authoredHeroUrls) !== JSON.stringify(missionHeroAssets.map(media))
) {
  throw new Error('1.10 requires the 22 ordered, unique a1_u1_reunion hero assets');
}

const lesson110 = {
  id: 'lesson-10-family-mission', title: '1.10 ¡Todos a la celebración!', level: 'Beginner A1',
  unit_id: 'unit-1', unit_title: 'Unit 1: People, Family, and Actions',
  unit_outcome: 'Understand and produce simple sentences about people, family members, and actions.',
  lesson_id: 'lesson-1', lesson_title: 'Unit 1: People, Family, and Actions',
  sub_lesson_id: '1.10', sub_lesson_title: '¡Todos a la celebración!',
  experience_type: 'mission', content_revision: 3,
  mission: {
    label: 'MISIÓN FINAL · UNIDAD 1',
    title: '¡Todos a la celebración!',
    briefing: 'La celebración familiar está por comenzar, pero todavía falta reunir a todos. Encuentra a cada persona, descubre qué está haciendo y responde quién es. Vas a tocar, unir, escuchar y hablar. Yo te mostraré el primer paso.',
    kickoff_image_url: media(missionKickoffAsset),
    objectives: ['Encuentra personas', 'Sigue sus acciones', 'Reúne a la familia'],
    completion_title: '¡La familia está reunida!',
    completion_message: 'Encontraste a las personas, conectaste a la familia, seguiste sus acciones y respondiste quiénes son. La celebración puede comenzar.',
    chapters: [
      { id: 'find-the-people', title: 'Encuentra a las personas', objective: 'Sigue la luz y localiza a quienes faltan.' },
      { id: 'connect-the-family', title: 'Conecta a la familia', objective: 'Une a cada persona con su relación correcta.' },
      { id: 'follow-the-actions', title: 'Sigue las acciones', objective: 'Recorre las pistas en el orden que muestran y dicen.' },
      { id: 'repair-the-clues', title: 'Repara las pistas', objective: 'Corrige los reportes falsos con not.' },
      { id: 'welcome-everyone', title: 'Recibe a todos', objective: 'Responde quiénes son y reúne a la familia.' },
    ],
  },
  goal: 'Bring every person to one family celebration by finding people, connecting relationships, following actions, correcting false clues, and answering who they are.',
  vocabulary: [], review_vocabulary: unitOneLearnedVocabulary,
  grammar_function: 'Apply every Unit 1 identity, article, singular/plural, pronoun, action, negative, and who-question pattern inside one continuous celebration adventure.',
  prerequisite: 'Lessons 1.1-1.9 completed.',
  speaking_outcome: 'Answer who a family member is and identify the reunited family aloud.',
  purposeful_review_slides: ['M01', 'M03', 'M04', 'M09', 'M10', 'M15', 'M16', 'M19', 'M20', 'M21', 'M22'],
  cards: lesson110Cards,
};

const lessons = [
  ['1.2_he_and_she.yaml', lesson12], ['1.3_two_people_they_and_are.yaml', lesson13],
  ['1.4_children_and_siblings.yaml', lesson14], ['1.5_parents_and_grandparents.yaml', lesson15],
  ['1.6_family_actions.yaml', lesson16], ['1.7_is_are_and_not.yaml', lesson17],
  ['1.8_who_is_he_who_are_they.yaml', lesson18], ['1.9_unit_1_spiral_review.yaml', lesson19],
  ['1.10_family_scene_mission.yaml', lesson110],
];
for (const [filename, lesson] of lessons) {
  writeFileSync(join(outputDir, filename), `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, lesson.cards.filter((card) => card.stage === stage).length]));
  console.log(`${lesson.sub_lesson_id} ${lesson.sub_lesson_title}: ${lesson.cards.length} cards ${JSON.stringify(counts)}`);
}
