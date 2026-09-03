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
  grandparentsTalking: 'family_grandparents_talking.webp',
  reviewBoyEating: 'a1_u1_review_boy_eating.webp', reviewGirlWriting: 'a1_u1_review_girl_writing.webp',
  reviewManReading: 'a1_u1_review_man_reading.webp', reviewWomanDrinking: 'a1_u1_review_woman_drinking.webp',
  reviewChildrenRunning: 'a1_u1_review_children_running.webp', reviewChildrenSwimming: 'a1_u1_review_children_swimming.webp',
  reviewBabySleeping: 'a1_u1_review_baby_sleeping.webp', reviewBrothersStudying: 'a1_u1_review_brothers_studying.webp',
  reviewSistersPlaying: 'a1_u1_review_sisters_playing.webp', reviewFamily: 'a1_u1_review_family_story.webp',
  reviewFatherWorking: 'a1_u1_review_father_working.webp', reviewMotherCooking: 'a1_u1_review_mother_cooking.webp',
  reviewParentsTalking: 'a1_u1_review_parents_talking.webp', reviewGrandparentsTalking: 'a1_u1_review_grandparents_talking.webp',
};

function baseCard({ prompt, stage, correct, options, audio = null, answer = null, promptImage = '', interaction, correctIds }) {
  const card = { interaction_type: interaction, prompt, stage, correct_option_id: correct, options,
    audio_text: audio, answer_audio_text: answer, prompt_image_url: promptImage ? media(promptImage) : '' };
  if (correctIds?.length > 1) card.correct_option_ids = correctIds;
  return card;
}

const teach = (entry) => ({ ...baseCard({ prompt: entry.prompt, stage: 'Learn', correct: 'answer',
  options: [imageOption('answer', entry.image, entry.label || entry.prompt)], audio: entry.audio || entry.prompt,
  answer: null, interaction: 'teach' }), translation: entry.translation });

function distinctEntries(entries, entry, count) {
  const seen = new Set([entry.image]);
  const result = [];
  for (const candidate of entries) {
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
  const alternatives = entry.distractors?.slice(0, effectiveCount - 1) || distinctEntries(entries, entry, effectiveCount - 1);
  const ordered = entry.reverseOptions ? [...alternatives, entry] : [entry, ...alternatives];
  return { ...baseCard({ prompt: stage === 'Listen' ? 'Listen and choose.' : activePrompt(entry), stage, correct: 'correct',
    options: ordered.map((item, index) => imageOption(item === entry ? 'correct' : `wrong-${index}`, item.image, activePrompt(item))),
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
    return (typeof spec !== 'number' && spec.mode === 'text') || position % 3 === 2 ? textChoice(entry, entries, 'Listen', audio)
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
  { prompt: 'The boy', image: assets.boy, translation: 'El niño' },
  { prompt: 'Eating', image: assets.boyEating, translation: 'Comiendo' },
  { prompt: 'The boy is eating.', image: assets.boyEating, translation: 'El niño está comiendo.' },
  { prompt: 'He is eating.', image: assets.boyEating, translation: 'Él está comiendo.' },
  { prompt: 'Drinking', image: assets.manDrinking, translation: 'Bebiendo' },
  { prompt: 'The man is drinking. He is drinking.', image: assets.manDrinking, translation: 'El hombre está bebiendo. Él está bebiendo.' },
  { prompt: 'Reading', image: assets.girlReading, translation: 'Leyendo' },
  { prompt: 'The girl is reading. She is reading.', image: assets.girlReading, translation: 'La niña está leyendo. Ella está leyendo.' },
  { prompt: 'Writing', image: assets.womanWriting, translation: 'Escribiendo' },
  { prompt: 'The woman is writing. She is writing.', image: assets.womanWriting, translation: 'La mujer está escribiendo. Ella está escribiendo.' },
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
    complete({ prompt: 'He is ___.', image: assets.boyEating, answer: 'He is eating.', correct: 'eating', choices: [['drinking', 'drinking'], ['eating', 'eating']], translation: 'Él está ___.' }),
    complete({ prompt: 'The man is ___.', image: assets.manDrinking, answer: 'The man is drinking.', correct: 'drinking', choices: [['drinking', 'drinking'], ['reading', 'reading']], translation: 'El hombre está ___.' }),
    complete({ prompt: 'The girl is ___.', image: assets.girlReading, answer: 'The girl is reading.', correct: 'reading', choices: [['writing', 'writing'], ['reading', 'reading']], translation: 'La niña está ___.' }),
    complete({ prompt: 'She is ___.', image: assets.girlReading, answer: 'She is reading.', correct: 'reading', choices: [['reading', 'reading'], ['drinking', 'drinking']], translation: 'Ella está ___.' }),
    complete({ prompt: 'The woman is ___.', image: assets.womanWriting, answer: 'The woman is writing.', correct: 'writing', choices: [['eating', 'eating'], ['writing', 'writing']], translation: 'La mujer está ___.' }),
    complete({ prompt: 'The ___ is writing. ___ is writing.', image: assets.womanWriting, answer: 'The woman is writing. She is writing.', correct: ['woman', 'she'], choices: [['woman', 'woman'], ['he', 'He'], ['she', 'She']], translation: 'La ___ está escribiendo. ___ está escribiendo.' }),
  ],
});

const l13 = [
  { prompt: 'The boy and the girl', image: assets.pair, translation: 'El niño y la niña' },
  { prompt: 'They', image: assets.pair, translation: 'Ellos' },
  { prompt: 'They are eating.', image: assets.pairEating, translation: 'Ellos están comiendo.' },
  { prompt: 'They are running.', image: assets.pairRunning, translation: 'Ellos están corriendo.' },
  { prompt: 'The man is sitting.', image: assets.manSitting, translation: 'El hombre está sentado.' },
  { prompt: 'He is swimming.', image: assets.boySwimming, translation: 'Él está nadando.' },
  { prompt: 'She is sleeping.', image: assets.girlSleeping, translation: 'Ella está durmiendo.' },
  { prompt: 'The boy and the girl are reading.', image: assets.pairReading, translation: 'El niño y la niña están leyendo.' },
  { prompt: 'They are writing.', image: assets.pairWriting, translation: 'Ellos están escribiendo.' },
  { prompt: 'The boy and the girl are running.', image: assets.pairRunning, translation: 'El niño y la niña están corriendo.' },
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
  { prompt: 'A family', image: assets.family, translation: 'Una familia', distractors: [{ prompt: 'A man', image: assets.man }, { prompt: 'A woman', image: assets.woman }, { prompt: 'Children', image: assets.children }] },
  { prompt: 'A baby', image: assets.baby, translation: 'Un bebé', distractors: [{ prompt: 'An adult', image: assets.father }] },
  { prompt: 'Babies', active: 'They are babies.', image: assets.babies, translation: 'Bebés', activeTranslation: 'Ellos son bebés.', distractors: [{ prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters }] },
  { prompt: 'A child', active: 'He is a child.', image: assets.brother, translation: 'Un niño', activeTranslation: 'Él es un niño.', distractors: [{ prompt: 'An adult', active: 'He is an adult.', image: assets.father }] },
  { prompt: 'Children', active: 'They are children.', image: assets.children, translation: 'Niños', activeTranslation: 'Ellos son niños.', distractors: [{ prompt: 'Adults', active: 'They are adults.', image: assets.adults }, { prompt: 'Parents', active: 'They are parents.', image: assets.parents }, { prompt: 'Grandparents', active: 'They are grandparents.', image: assets.grandparents }] },
  { prompt: 'A brother', active: 'He is a brother.', image: assets.brother, translation: 'Un hermano', activeTranslation: 'Él es un hermano.', distractors: [{ prompt: 'A sister', active: 'She is a sister.', image: assets.sister }] },
  { prompt: 'Brothers', active: 'They are brothers.', image: assets.brothers, translation: 'Hermanos', activeTranslation: 'Ellos son hermanos.', distractors: [{ prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters }] },
  { prompt: 'A sister', active: 'She is a sister.', image: assets.sister, translation: 'Una hermana', activeTranslation: 'Ella es una hermana.', distractors: [{ prompt: 'A brother', active: 'He is a brother.', image: assets.brother }] },
  { prompt: 'Sisters', active: 'They are sisters.', image: assets.sisters, translation: 'Hermanas', activeTranslation: 'Ellas son hermanas.', distractors: [{ prompt: 'Brothers', active: 'They are brothers.', image: assets.brothers }, { prompt: 'Parents', active: 'They are parents.', image: assets.parents }, { prompt: 'Grandparents', active: 'They are grandparents.', image: assets.grandparents }] },
  { prompt: 'They are a family.', image: assets.family, translation: 'Ellos son una familia.', distractors: [{ prompt: 'Adults', image: assets.adults }] },
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
  { prompt: 'An adult', image: assets.father, translation: 'Un adulto' },
  { prompt: 'Adults', image: assets.adults, translation: 'Adultos' },
  { prompt: 'He is the father.', image: assets.father, translation: 'Él es el padre.' },
  { prompt: 'She is the mother.', image: assets.mother, translation: 'Ella es la madre.' },
  { prompt: 'They are the parents.', image: assets.parents, translation: 'Ellos son los padres.' },
  { prompt: 'He is the grandfather.', image: assets.grandfather, translation: 'Él es el abuelo.' },
  { prompt: 'She is the grandmother.', image: assets.grandmother, translation: 'Ella es la abuela.' },
  { prompt: 'They are the grandparents.', image: assets.grandparents, translation: 'Ellos son los abuelos.' },
  { prompt: 'The parents and the children are a family.', image: assets.family, translation: 'Los padres y los niños son una familia.' },
  { prompt: 'The grandparents and the baby are a family.', image: assets.family, translation: 'Los abuelos y el bebé son una familia.' },
];
const lesson15 = buildLesson({
  id: 'lesson-5-parents-grandparents', number: '1.5', title: 'Parents and Grandparents',
  goal: 'Meet the adults in the family, name their roles, and connect generations into one family.',
  vocabulary: ['an', 'adult', 'adults', 'father', 'mother', 'parents', 'grandfather', 'grandmother', 'grandparents'],
  reviewVocabulary: ['he', 'she', 'they', 'is', 'are', 'the', 'and', 'family', 'children', 'baby'],
  grammarFunction: 'An + singular adult; He/She is the + role; They are the + plural role.',
  prerequisite: 'Lessons 1.1-1.4: singular and plural people, he/she/they, is/are, and family.',
  speakingOutcome: 'Identify parents and grandparents in singular and plural sentences.', purposefulReviewSlides: ['L3', 'L4', 'L5', 'L8', 'L9', 'L10', 'U7'],
  entries: l15, textRecognize: [0, 2, 5, 8], listenIndexes: [0, 1, 2, 3, 4, 5, 6, 7], speakIndexes: [0, 2, 3, 4, 5, 6, 7],
  uses: [
    complete({ prompt: '___ adult.', image: assets.father, answer: 'An adult.', correct: 'an', choices: [['a', 'A'], ['an', 'An']], translation: '___ adulto.' }),
    complete({ prompt: '___.', image: assets.adults, answer: 'Adults.', correct: 'adults', choices: [['adult', 'Adult'], ['adults', 'Adults']], translation: '___.' }),
    complete({ prompt: 'He is the ___.', image: assets.father, answer: 'He is the father.', correct: 'father', choices: [['father', 'father'], ['grandfather', 'grandfather']], translation: 'Él es el ___.' }),
    complete({ prompt: 'She is the ___.', image: assets.mother, answer: 'She is the mother.', correct: 'mother', choices: [['grandmother', 'grandmother'], ['mother', 'mother']], translation: 'Ella es la ___.' }),
    complete({ prompt: 'They are the ___.', image: assets.parents, answer: 'They are the parents.', correct: 'parents', choices: [['parents', 'parents'], ['grandparents', 'grandparents']], translation: 'Ellos son los ___.' }),
    complete({ prompt: 'He is the ___.', image: assets.grandfather, answer: 'He is the grandfather.', correct: 'grandfather', choices: [['father', 'father'], ['grandfather', 'grandfather']], translation: 'Él es el ___.' }),
    complete({ prompt: 'She is the ___. They are the ___.', image: assets.grandparents, answer: 'She is the grandmother. They are the grandparents.', correct: ['grandmother', 'grandparents'], choices: [['mother', 'mother'], ['grandmother', 'grandmother'], ['grandparents', 'grandparents']], translation: 'Ella es la ___. Ellos son los ___.' }),
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
  { prompt: 'He is not cooking.', image: assets.fatherTalking, translation: 'Él no está cocinando.', recognizePrompt: 'He is not cooking.', recognizeAudio: 'He is not cooking.', choice: 'He is not cooking.', textDistractors: ['He is cooking.'], answer: 'He is not cooking. He is talking.' },
  { prompt: 'The girl is writing.', image: assets.girlWriting, translation: 'La niña está escribiendo.' },
  { prompt: 'She is not reading.', image: assets.girlWriting, translation: 'Ella no está leyendo.', recognizePrompt: 'She is not reading.', recognizeAudio: 'She is not reading.', choice: 'She is not reading.', textDistractors: ['She is reading.'], answer: 'She is not reading. She is writing.' },
  { prompt: 'The boy and the girl are running.', image: assets.pairRunning, translation: 'El niño y la niña están corriendo.' },
  { prompt: 'They are not sitting.', image: assets.pairRunning, translation: 'Ellos no están sentados.', recognizePrompt: 'They are not sitting.', recognizeAudio: 'They are not sitting.', choice: 'They are not sitting.', textDistractors: ['They are sitting.'], answer: 'They are not sitting. They are running.' },
  { prompt: 'The sister is playing.', image: assets.sisterPlaying, translation: 'La hermana está jugando.' },
  { prompt: 'She is not studying.', image: assets.sisterPlaying, translation: 'Ella no está estudiando.', recognizePrompt: 'She is not studying.', recognizeAudio: 'She is not studying.', choice: 'She is not studying.', textDistractors: ['She is studying.'], answer: 'She is not studying. She is playing.' },
  { prompt: 'The grandparents are sitting and talking.', image: assets.grandparentsTalking, translation: 'Los abuelos están sentados y hablando.' },
  { prompt: 'They are not sleeping.', image: assets.grandparentsTalking, translation: 'Ellos no están durmiendo.', recognizePrompt: 'They are not sleeping.', recognizeAudio: 'They are not sleeping.', choice: 'They are not sleeping.', textDistractors: ['They are sleeping.'], answer: 'They are not sleeping. They are sitting and talking.' },
];
const lesson17 = buildLesson({
  id: 'lesson-7-is-are-not', number: '1.7', title: 'What They Are Not Doing',
  goal: 'Use not to contrast what familiar people are doing with what they are not doing.', vocabulary: ['not'],
  reviewVocabulary: ['he', 'she', 'they', 'is', 'are', 'father', 'girl', 'sister', 'grandparents', 'talking', 'cooking', 'writing', 'reading', 'running', 'sitting', 'playing', 'studying', 'sleeping'],
  grammarFunction: 'He/She is not + action; They are not + action.', prerequisite: 'Lessons 1.1-1.6: people, family roles, pronouns, is/are, and actions.',
  speakingOutcome: 'Say a positive action and a true negative contrast about the same scene.', purposefulReviewSlides: ['L1', 'L3', 'L5', 'L7', 'L9', 'S7', 'U7'],
  entries: l17, textRecognize: [1, 3, 5, 7, 9],
  listenIndexes: [{ index: 0, audio: 'The father is talking.' }, { index: 1, audio: 'He is not cooking. He is talking.', mode: 'text' }, { index: 2, audio: 'The girl is writing.' }, { index: 3, audio: 'She is not reading. She is writing.', mode: 'text' }, { index: 4, audio: 'They are running.' }, { index: 5, audio: 'They are not sitting. They are running.', mode: 'text' }, { index: 7, audio: 'She is not studying. She is playing.', mode: 'text' }, { index: 9, audio: 'They are not sleeping. They are sitting and talking.', mode: 'text' }],
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
  { prompt: 'Who is he?', image: assets.father, translation: '¿Quién es él?', recognizePrompt: 'Who is he?', recognizeAudio: 'Who is he?', choice: 'He is the father.', textDistractors: ['He is the grandfather.', 'She is the mother.'], answer: 'He is the father.' },
  { prompt: 'He is the father.', image: assets.father, translation: 'Él es el padre.' },
  { prompt: 'Who is she?', image: assets.mother, translation: '¿Quién es ella?', recognizePrompt: 'Who is she?', recognizeAudio: 'Who is she?', choice: 'She is the mother.', textDistractors: ['She is the grandmother.', 'He is the father.'], answer: 'She is the mother.' },
  { prompt: 'She is the mother.', image: assets.mother, translation: 'Ella es la madre.' },
  { prompt: 'Who are they?', image: assets.parents, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the parents.', textDistractors: ['They are the children.', 'They are the grandparents.'], answer: 'They are the parents.' },
  { prompt: 'They are the parents.', image: assets.parents, translation: 'Ellos son los padres.' },
  { prompt: 'Who are they?', image: assets.children, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the children.', textDistractors: ['They are the parents.', 'They are the grandparents.'], answer: 'They are the children.' },
  { prompt: 'They are the children.', image: assets.children, translation: 'Ellos son los niños.' },
  { prompt: 'Who are they?', image: assets.grandparents, translation: '¿Quiénes son ellos?', recognizePrompt: 'Who are they?', recognizeAudio: 'Who are they?', choice: 'They are the grandparents.', textDistractors: ['They are the parents.', 'They are the children.'], answer: 'They are the grandparents.' },
  { prompt: 'They are the grandparents.', image: assets.grandparents, translation: 'Ellos son los abuelos.' },
];
const lesson18 = buildLesson({
  id: 'lesson-8-who', number: '1.8', title: 'Who Is He? Who Are They?',
  goal: 'Ask who familiar people are and answer with the correct family role.', vocabulary: ['who'],
  reviewVocabulary: ['he', 'she', 'they', 'is', 'are', 'the', 'father', 'mother', 'parents', 'children', 'grandparents'],
  grammarFunction: 'Who is he/she? Who are they? Identity answer with is/are.', prerequisite: 'Lessons 1.1-1.7: pronouns, is/are, and family roles.',
  speakingOutcome: 'Ask and answer who one person or a family group is.', purposefulReviewSlides: ['L2', 'L4', 'L6', 'L8', 'L10', 'S7', 'U7'],
  entries: l18, textRecognize: [0, 2, 4, 6, 8],
  listenIndexes: [{ index: 0, audio: 'Who is he? He is the father.' }, { index: 2, audio: 'Who is she? She is the mother.' }, { index: 4, audio: 'Who are they? They are the parents.' }, { index: 6, audio: 'Who are they? They are the children.' }, { index: 8, audio: 'Who are they? They are the grandparents.' }, { index: 1, audio: 'He is the father.' }, { index: 3, audio: 'She is the mother.' }, { index: 9, audio: 'They are the grandparents.' }],
  speakIndexes: [0, 1, 2, 3, 4, 6, 8],
  uses: [
    complete({ prompt: 'Who ___ he?', image: assets.father, answer: 'Who is he?', correct: 'is', choices: [['are', 'are'], ['is', 'is']], translation: '¿Quién es él?' }),
    complete({ prompt: 'He is the ___.', image: assets.father, answer: 'He is the father.', correct: 'father', choices: [['grandfather', 'grandfather'], ['father', 'father']], translation: 'Él es el ___.' }),
    complete({ prompt: 'Who is ___?', image: assets.mother, answer: 'Who is she?', correct: 'she', choices: [['he', 'he'], ['she', 'she']], translation: '¿Quién es ella?' }),
    complete({ prompt: 'She is the ___.', image: assets.mother, answer: 'She is the mother.', correct: 'mother', choices: [['mother', 'mother'], ['grandmother', 'grandmother']], translation: 'Ella es la ___.' }),
    complete({ prompt: 'Who ___ they?', image: assets.parents, answer: 'Who are they?', correct: 'are', choices: [['is', 'is'], ['are', 'are']], translation: '¿Quiénes son ellos?' }),
    complete({ prompt: 'They are the ___.', image: assets.children, answer: 'They are the children.', correct: 'children', choices: [['parents', 'parents'], ['children', 'children']], translation: 'Ellos son los ___.' }),
    complete({ prompt: 'Who ___ they? They are the ___.', image: assets.grandparents, answer: 'Who are they? They are the grandparents.', correct: ['are', 'grandparents'], choices: [['is', 'is'], ['are', 'are'], ['grandparents', 'grandparents']], translation: '¿Quiénes son ellos? Ellos son los abuelos.' }),
  ],
});

const l19 = [
  { prompt: 'The boy is eating. He is eating.', image: assets.reviewBoyEating, translation: 'El niño está comiendo. Él está comiendo.' },
  { prompt: 'The girl is writing. She is writing.', image: assets.reviewGirlWriting, translation: 'La niña está escribiendo. Ella está escribiendo.' },
  { prompt: 'The man is reading. He is reading.', image: assets.reviewManReading, translation: 'El hombre está leyendo. Él está leyendo.' },
  { prompt: 'The woman is drinking. She is drinking.', image: assets.reviewWomanDrinking, translation: 'La mujer está bebiendo. Ella está bebiendo.' },
  { prompt: 'The boy and the girl are running. They are running.', image: assets.reviewChildrenRunning, translation: 'El niño y la niña están corriendo. Ellos están corriendo.' },
  { prompt: 'The children are swimming.', image: assets.reviewChildrenSwimming, translation: 'Los niños están nadando.' },
  { prompt: 'The baby is sleeping.', image: assets.reviewBabySleeping, translation: 'El bebé está durmiendo.' },
  { prompt: 'The brothers are studying.', image: assets.reviewBrothersStudying, translation: 'Los hermanos están estudiando.' },
  { prompt: 'The sisters are playing.', image: assets.reviewSistersPlaying, translation: 'Las hermanas están jugando.' },
  { prompt: 'They are a family.', image: assets.reviewFamily, translation: 'Ellos son una familia.' },
  { prompt: 'Who is he? He is the father. The father is working.', image: assets.reviewFatherWorking, translation: '¿Quién es él? Es el padre. El padre está trabajando.' },
  { prompt: 'Who is she? She is the mother. The mother is cooking.', image: assets.reviewMotherCooking, translation: '¿Quién es ella? Es la madre. La madre está cocinando.' },
  { prompt: 'Who are they? They are the parents. The parents are talking.', image: assets.reviewParentsTalking, translation: '¿Quiénes son ellos? Son los padres. Los padres están hablando.' },
  { prompt: 'Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.', image: assets.reviewGrandparentsTalking, translation: '¿Quiénes son ellos? Son los abuelos. Están sentados y hablando. No están durmiendo.' },
];
const lesson19 = buildLesson({
  id: 'lesson-9-unit-review', number: '1.9', title: 'Unit 1 Story Review', review: true,
  goal: 'Revisit the Unit 1 cast in entirely new scenes and connect people, pronouns, family roles, actions, questions, and one true contrast.',
  vocabulary: [], reviewVocabulary: ['a', 'an', 'the', 'boy', 'girl', 'man', 'woman', 'he', 'she', 'is', 'and', 'they', 'are', 'running', 'sitting', 'swimming', 'sleeping', 'family', 'baby', 'children', 'brothers', 'sisters', 'adult', 'father', 'mother', 'parents', 'grandfather', 'grandmother', 'grandparents', 'playing', 'studying', 'working', 'cooking', 'talking', 'not', 'who', 'eating', 'drinking', 'reading', 'writing'],
  grammarFunction: 'Integrated Unit 1 identity, action, question, singular/plural, and negative patterns.', prerequisite: 'Lessons 1.1-1.8 completed.',
  speakingOutcome: 'Tell a short connected story about people and family members in action.', purposefulReviewSlides: ['L1', 'L5', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'S8', 'U8'],
  entries: l19, textRecognize: [1, 3, 5, 7, 9, 11, 13],
  listenIndexes: [{ index: 0, audio: l19[0].prompt }, { index: 1, audio: l19[1].prompt }, { index: 2, audio: l19[2].prompt }, { index: 3, audio: l19[3].prompt }, { index: 4, audio: l19[4].prompt }, { index: 5, audio: l19[5].prompt }, { index: 7, audio: l19[7].prompt }, { index: 9, audio: l19[9].prompt }, { index: 12, audio: l19[12].prompt }, { index: 13, audio: l19[13].prompt }],
  speakIndexes: [0, 1, 4, 5, 8, 10, 12, 13],
  uses: [
    complete({ prompt: 'The ___ is eating. ___ is eating.', image: assets.reviewBoyEating, answer: 'The boy is eating. He is eating.', correct: ['boy', 'he'], choices: [['girl', 'girl'], ['boy', 'boy'], ['he', 'He']], translation: 'El ___ está comiendo. ___ está comiendo.' }),
    complete({ prompt: 'The woman is ___. ___ is drinking.', image: assets.reviewWomanDrinking, answer: 'The woman is drinking. She is drinking.', correct: ['drinking', 'she'], choices: [['reading', 'reading'], ['drinking', 'drinking'], ['she', 'She']], translation: 'La mujer está ___. ___ está bebiendo.' }),
    complete({ prompt: 'The boy ___ the girl are running. ___ are running.', image: assets.reviewChildrenRunning, answer: 'The boy and the girl are running. They are running.', correct: ['and', 'they'], choices: [['are', 'are'], ['and', 'and'], ['they', 'They']], translation: 'El niño ___ la niña están corriendo. ___ están corriendo.' }),
    complete({ prompt: 'The ___ are studying.', image: assets.reviewBrothersStudying, answer: 'The brothers are studying.', correct: 'brothers', choices: [['sisters', 'sisters'], ['brothers', 'brothers']], translation: 'Los ___ están estudiando.' }),
    complete({ prompt: 'The sisters are ___.', image: assets.reviewSistersPlaying, answer: 'The sisters are playing.', correct: 'playing', choices: [['studying', 'studying'], ['playing', 'playing']], translation: 'Las hermanas están ___.' }),
    complete({ prompt: 'Who ___ he? He is the ___.', image: assets.reviewFatherWorking, answer: 'Who is he? He is the father.', correct: ['is', 'father'], choices: [['are', 'are'], ['is', 'is'], ['father', 'father']], translation: '¿Quién es él? Él es el padre.' }),
    complete({ prompt: 'Who are they? They are the ___. They are ___.', image: assets.reviewParentsTalking, answer: 'Who are they? They are the parents. They are talking.', correct: ['parents', 'talking'], choices: [['grandparents', 'grandparents'], ['parents', 'parents'], ['talking', 'talking']], translation: '¿Quiénes son ellos? Son los padres. Están hablando.' }),
    complete({ prompt: 'They are the ___. They are ___ sleeping.', image: assets.reviewGrandparentsTalking, answer: 'They are the grandparents. They are not sleeping.', correct: ['grandparents', 'not'], choices: [['parents', 'parents'], ['grandparents', 'grandparents'], ['not', 'not']], translation: 'Ellos son los abuelos. No están durmiendo.' }),
  ],
});

const lessons = [
  ['1.2_he_and_she.yaml', lesson12], ['1.3_two_people_they_and_are.yaml', lesson13],
  ['1.4_children_and_siblings.yaml', lesson14], ['1.5_parents_and_grandparents.yaml', lesson15],
  ['1.6_family_actions.yaml', lesson16], ['1.7_is_are_and_not.yaml', lesson17],
  ['1.8_who_is_he_who_are_they.yaml', lesson18], ['1.9_unit_1_spiral_review.yaml', lesson19],
];
for (const [filename, lesson] of lessons) {
  writeFileSync(join(outputDir, filename), `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, lesson.cards.filter((card) => card.stage === stage).length]));
  console.log(`${lesson.sub_lesson_id} ${lesson.sub_lesson_title}: ${lesson.cards.length} cards ${JSON.stringify(counts)}`);
}
