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

const approvedStudioStills = {
  a1_u1_studio_01_clapperboard: 'a1_u1_studio_01_clapperboard.webp',
  a1_u1_studio_02_people_casting: 'a1_u1_studio_02_people_casting.webp',
  a1_u1_studio_03_pronoun_marks: 'a1_u1_studio_03_pronoun_marks.webp',
  a1_u1_studio_04_young_cast: 'a1_u1_studio_04_young_cast.webp',
  a1_u1_studio_05_adult_cast: 'a1_u1_studio_05_adult_cast.webp',
  a1_u1_studio_06_parent_roles: 'a1_u1_studio_06_parent_roles.webp',
  a1_u1_studio_07_generation_roles: 'a1_u1_studio_07_generation_roles.webp',
  a1_u1_studio_08_title_card: 'a1_u1_studio_08_title_card.webp',
  a1_u1_studio_09_who_father: 'a1_u1_studio_09_who_father.webp',
  a1_u1_studio_10_who_mother: 'a1_u1_studio_10_who_mother.webp',
  a1_u1_studio_11_who_parents: 'a1_u1_studio_11_who_parents.webp',
  a1_u1_studio_12_who_children: 'a1_u1_studio_12_who_children.webp',
  a1_u1_studio_13_who_grandparents: 'a1_u1_studio_13_who_grandparents.webp',
  a1_u1_studio_14_eating_drinking: 'a1_u1_studio_14_eating_drinking.webp',
  a1_u1_studio_15_reading_writing: 'a1_u1_studio_15_reading_writing.webp',
  a1_u1_studio_16_running_sitting: 'a1_u1_studio_16_running_sitting.webp',
  a1_u1_studio_17_swimming_sleeping: 'a1_u1_studio_17_swimming_sleeping.webp',
  a1_u1_studio_18_playing_studying: 'a1_u1_studio_18_playing_studying.webp',
  a1_u1_studio_19_work_cook_talk: 'a1_u1_studio_19_work_cook_talk.webp',
  a1_u1_studio_20_not_continuity: 'a1_u1_studio_20_not_continuity.webp',
  a1_u1_studio_21_final_question: 'a1_u1_studio_21_final_question.webp',
  a1_u1_studio_22_premiere: 'a1_u1_studio_22_premiere.webp',
};

const studioVisualDescriptionsEs = {
  a1_u1_studio_01_clapperboard: 'Un estudio de cine iluminado, con una claqueta negra abierta y vacía en el centro; no hay letras ni marcas en su superficie.',
  a1_u1_studio_02_people_casting: 'Cuatro retratos en cuadrícula: arriba izquierda, un niño; arriba derecha, una niña; abajo izquierda, un hombre; abajo derecha, una mujer.',
  a1_u1_studio_03_pronoun_marks: 'Cuatro personas de pie en una fila, de izquierda a derecha: un niño, un hombre, una mujer y una niña.',
  a1_u1_studio_04_young_cast: 'Cuadrícula de cuatro tomas: arriba izquierda, un bebé; arriba derecha, dos bebés; abajo izquierda, un niño y una niña; abajo derecha, dos niños y dos niñas.',
  a1_u1_studio_05_adult_cast: 'Imagen dividida en dos: a la izquierda hay un hombre adulto solo; a la derecha hay cuatro adultos juntos, dos jóvenes y dos mayores.',
  a1_u1_studio_06_parent_roles: 'Tres tomas familiares: arriba izquierda, un hombre interactúa como padre con un niño; arriba derecha, una mujer interactúa como madre con una niña; abajo, el hombre y la mujer aparecen con los niños como sus padres.',
  a1_u1_studio_07_generation_roles: 'Cuadrícula de cuatro tomas: arriba izquierda, un hombre mayor; arriba derecha, una mujer mayor; abajo izquierda, ambos mayores juntos; abajo derecha, cinco niños, incluido un bebé.',
  a1_u1_studio_08_title_card: 'En un set de cine, un abuelo y una abuela están sentados junto a cinco nietos: dos niños, dos niñas y un bebé; una cámara aparece al frente.',
  a1_u1_studio_09_who_father: 'Un hombre adulto aparece solo, mira a la cámara y sostiene una tarjeta en blanco con ambas manos.',
  a1_u1_studio_10_who_mother: 'Una mujer adulta aparece sola, de pie sobre una marca del piso frente a una cámara de cine.',
  a1_u1_studio_11_who_parents: 'Un hombre a la izquierda y una mujer a la derecha posan juntos sobre una marca rectangular en el set.',
  a1_u1_studio_12_who_children: 'Cuatro niños posan frente a un micrófono: dos niños a la izquierda y dos niñas a la derecha.',
  a1_u1_studio_13_who_grandparents: 'Una pareja de adultos mayores posa en el set: el hombre está a la izquierda y la mujer a la derecha.',
  a1_u1_studio_14_eating_drinking: 'Imagen dividida en dos tomas: a la izquierda, un hombre come con el tenedor junto a la boca; a la derecha, bebe de un vaso inclinado con el borde tocando sus labios.',
  a1_u1_studio_15_reading_writing: 'Un niño sentado a una mesa mira un libro ilustrado abierto y sostiene un lápiz sobre una hoja en blanco.',
  a1_u1_studio_16_running_sitting: 'Toma dividida con tres personas: a la izquierda, el hermano corre; en el centro, la hermana corre; a la derecha, la madre está sentada en un sillón.',
  a1_u1_studio_17_swimming_sleeping: 'Imagen dividida en dos: a la izquierda, dos niñas nadan en una piscina; a la derecha, un hombre mayor duerme en un sillón.',
  a1_u1_studio_18_playing_studying: 'Imagen dividida en dos: a la izquierda, cuatro niños juegan con tarjetas; a la derecha, una niña estudia y escribe en un cuaderno.',
  a1_u1_studio_19_work_cook_talk: 'Tres tomas de izquierda a derecha: un hombre y una mujer trabajan con una computadora y un cuaderno; una mujer mayor cocina; dos niños hablan en un sofá.',
  a1_u1_studio_20_not_continuity: 'Tres tomas de izquierda a derecha: un hombre corre por un sendero; una mujer mayor cocina en una sartén; dos niñas nadan en una piscina.',
  a1_u1_studio_21_final_question: 'Nueve familiares se reúnen alrededor de un micrófono en el set: dos abuelos, dos adultos, un bebé, dos niños y dos niñas.',
  a1_u1_studio_22_premiere: 'La misma familia de nueve integrantes celebra bajo luces de estreno y confeti; varios aplauden o levantan los brazos.',
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

const missionTarget = (id, label, correctOptionId) => ({
  id,
  label,
  correct_option_id: correctOptionId,
});

function missionFields({ instruction, successOutcome, visualKey, tutorialMode = null, targets = [] }) {
  const visualDescription = studioVisualDescriptionsEs[visualKey];
  if (!visualDescription) throw new Error(`Missing Spanish visual description for ${visualKey}`);
  const fields = {
    instruction_es: instruction,
    success_outcome_es: successOutcome,
    mission_visual_key: visualKey,
    visual_description_es: visualDescription,
  };
  if (tutorialMode) fields.mission_tutorial_mode = tutorialMode;
  if (targets.length) fields.mission_targets = targets;
  return fields;
}

function missionConstruction({
  stage,
  visualKey,
  prompt,
  answer,
  correct,
  choices,
  translation,
  instruction,
  successOutcome,
  audio = null,
  interaction = 'mission-sentence',
  tutorialMode = null,
}) {
  return {
    ...baseCard({
      prompt,
      stage,
      correct: correct[0],
      correctIds: correct,
      options: choices.map(([id, label]) => textOption(id, label)),
      audio,
      answer,
      promptImage: approvedStudioStills[visualKey] || '',
      interaction,
    }),
    ...missionFields({ instruction, successOutcome, visualKey, tutorialMode }),
    translation,
  };
}

function missionMatch({
  stage,
  visualKey,
  answer,
  choices,
  targets,
  translation,
  instruction,
  successOutcome,
  audio = null,
  interaction = 'mission-match',
}) {
  return {
    ...baseCard({
      prompt: '',
      stage,
      correct: targets[0].correct_option_id,
      correctIds: targets.map((target) => target.correct_option_id),
      options: choices.map(([id, label]) => textOption(id, label)),
      audio,
      answer,
      promptImage: approvedStudioStills[visualKey] || '',
      interaction,
    }),
    ...missionFields({ instruction, successOutcome, visualKey, targets }),
    translation,
  };
}

function missionChoice({
  interaction = 'mission-clue',
  stage = 'Recognize',
  prompt = '',
  visualKey,
  answer,
  choices,
  translation,
  instruction,
  successOutcome,
  audio = null,
}) {
  return {
    ...baseCard({
      prompt,
      stage,
      correct: 'correct',
      options: choices.map(([id, label]) => textOption(id, label)),
      audio,
      answer,
      promptImage: approvedStudioStills[visualKey] || '',
      interaction,
    }),
    ...missionFields({ instruction, successOutcome, visualKey }),
    translation,
  };
}

function missionSpeaking({ visualKey, prompt, translation, instruction, successOutcome }) {
  const promptImage = approvedStudioStills[visualKey] || '';
  return {
    ...baseCard({
      prompt,
      stage: 'Speak',
      correct: 'answer',
      options: [imageOption('answer', promptImage, prompt)],
      audio: prompt,
      answer: null,
      promptImage,
      interaction: 'mission-speak',
    }),
    ...missionFields({ instruction, successOutcome, visualKey }),
    translation,
  };
}

const missionBlueprint = [
  {
    chapter: 'casting-call',
    phase: 'the director names the production and opens the live Unit 1 set',
    card: missionConstruction({
      stage: 'Use', visualKey: 'a1_u1_studio_01_clapperboard',
      prompt: '___-___-___', answer: 'family', correct: ['fa', 'mi', 'ly'],
      choices: [['mi', 'MI'], ['ly', 'LY'], ['fa', 'FA']],
      translation: 'Familia.',
      instruction: 'Forma FAMILY con sus sílabas, de izquierda a derecha.',
      successOutcome: 'La claqueta muestra FAMILY y el set se abre.',
      interaction: 'mission-unlock', tutorialMode: 'guided-no-fail',
    }),
  },
  {
    chapter: 'casting-call',
    phase: 'the director casts the four foundational people into explicit positions',
    card: missionMatch({
      stage: 'Learn', visualKey: 'a1_u1_studio_02_people_casting',
      answer: 'A boy. A girl. A man. A woman.',
      choices: [['woman', 'A woman.'], ['boy', 'A boy.'], ['man', 'A man.'], ['girl', 'A girl.']],
      targets: [
        missionTarget('top-left', 'Arriba izquierda', 'boy'),
        missionTarget('top-right', 'Arriba derecha', 'girl'),
        missionTarget('bottom-left', 'Abajo izquierda', 'man'),
        missionTarget('bottom-right', 'Abajo derecha', 'woman'),
      ],
      translation: 'Un niño. Una niña. Un hombre. Una mujer.',
      instruction: 'Coloca cada frase en la marca de casting correcta.',
      successOutcome: 'Los cuatro primeros papeles quedan asignados.',
    }),
  },
  {
    chapter: 'casting-call',
    phase: 'the director approves the one call sheet that follows the visible cast from left to right',
    card: missionChoice({
      stage: 'Recognize', visualKey: 'a1_u1_studio_03_pronoun_marks',
      answer: 'He is a boy. He is a man. She is a woman. She is a girl.',
      choices: [
        ['correct', 'He is a boy. He is a man. She is a woman. She is a girl.'],
        ['wrong-pronouns', 'She is a boy. He is a man. She is a woman. He is a girl.'],
        ['wrong-roles', 'He is a boy. He is a woman. She is a man. She is a girl.'],
      ],
      translation: 'Él es un niño. Él es un hombre. Ella es una mujer. Ella es una niña.',
      instruction: 'Mira a las cuatro personas de izquierda a derecha y elige el guion que las describe en ese orden.',
      successOutcome: 'El director aprueba el guion de pronombres para las cuatro marcas.',
    }),
  },
  {
    chapter: 'casting-call',
    phase: 'the director fills the younger-cast board without a hidden list order',
    card: missionMatch({
      stage: 'Recognize', visualKey: 'a1_u1_studio_04_young_cast',
      answer: 'The baby is a child. The babies are children. The brother and the sister are children. The brothers and the sisters are children.',
      choices: [
        ['siblings-many', 'The brothers and the sisters are children.'],
        ['baby-adult-wrong', 'The baby is an adult.'],
        ['baby-one', 'The baby is a child.'],
        ['siblings-two', 'The brother and the sister are children.'],
        ['babies-adults-wrong', 'The babies are adults.'],
        ['babies-many', 'The babies are children.'],
      ],
      targets: [
        missionTarget('baby-one-shot', 'Arriba izquierda', 'baby-one'),
        missionTarget('babies-shot', 'Arriba derecha', 'babies-many'),
        missionTarget('sibling-pair-shot', 'Abajo izquierda', 'siblings-two'),
        missionTarget('siblings-group-shot', 'Abajo derecha', 'siblings-many'),
      ],
      translation: 'El bebé es un niño. Los bebés son niños. El hermano y la hermana son niños. Los hermanos y las hermanas son niños.',
      instruction: 'Relaciona cada toma con la oración completa que explica quiénes también son niños.',
      successOutcome: 'El tablero confirma que bebés, hermanos y hermanas también son niños.',
    }),
  },
  {
    chapter: 'casting-call',
    phase: 'the director approves the article-and-number call from the left take to the right take',
    card: missionChoice({
      interaction: 'mission-truth-stamp', stage: 'Use', visualKey: 'a1_u1_studio_05_adult_cast',
      answer: 'An adult. Adults.',
      choices: [
        ['correct', 'An adult. Adults.'],
        ['wrong-article', 'A adult. Adults.'],
        ['wrong-group', 'An adult. Children.'],
      ],
      translation: 'Un adulto. Adultos.',
      instruction: 'Lee la toma izquierda y después la derecha; elige el llamado que usa el artículo y el número correctos.',
      successOutcome: 'El llamado distingue a un adulto del grupo y completa el casting básico.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director assigns the two parent roles and their pair against visibly younger alternatives',
    card: missionMatch({
      stage: 'Recognize', visualKey: 'a1_u1_studio_06_parent_roles',
      answer: 'He is the father. She is the mother. They are the parents.',
      choices: [
        ['parents', 'They are the parents.'], ['grandfather', 'He is the grandfather.'],
        ['girl', 'She is a girl.'], ['mother', 'She is the mother.'],
        ['grandparents', 'They are the grandparents.'], ['father', 'He is the father.'],
        ['boy', 'He is a boy.'], ['grandmother', 'She is the grandmother.'],
      ],
      targets: [
        missionTarget('father-role', 'Arriba izquierda', 'father'),
        missionTarget('mother-role', 'Arriba derecha', 'mother'),
        missionTarget('parents-role', 'Abajo · pareja', 'parents'),
      ],
      translation: 'Él es el padre. Ella es la madre. Ellos son los padres.',
      instruction: 'Asigna una línea a cada toma: hombre arriba izquierda, mujer arriba derecha y pareja abajo.',
      successOutcome: 'El padre, la madre y los padres quedan confirmados para cámara.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director assigns older-generation and grandchildren roles directly',
    card: missionMatch({
      stage: 'Recognize', visualKey: 'a1_u1_studio_07_generation_roles',
      answer: 'He is the grandfather. She is the grandmother. They are the grandparents. They are the grandchildren.',
      choices: [
        ['grandchildren', 'They are the grandchildren.'], ['boy', 'He is a boy.'],
        ['grandmother', 'She is the grandmother.'], ['brothers', 'They are the brothers.'],
        ['grandparents', 'They are the grandparents.'], ['girl', 'She is a girl.'],
        ['grandfather', 'He is the grandfather.'], ['sisters', 'They are the sisters.'],
      ],
      targets: [
        missionTarget('grandfather-role', 'Arriba izquierda', 'grandfather'),
        missionTarget('grandmother-role', 'Arriba derecha', 'grandmother'),
        missionTarget('grandparents-role', 'Abajo izquierda', 'grandparents'),
        missionTarget('grandchildren-role', 'Abajo derecha', 'grandchildren'),
      ],
      translation: 'Él es el abuelo. Ella es la abuela. Ellos son los abuelos. Ellos son los nietos.',
      instruction: 'Coloca cada línea en el papel familiar correspondiente.',
      successOutcome: 'Las dos generaciones ocupan sus marcas correctas.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director builds the relationship sentence used on the title card',
    card: missionConstruction({
      stage: 'Use', visualKey: 'a1_u1_studio_08_title_card',
      prompt: '___ ___ ___ ___ ___.', answer: 'The grandparents and the grandchildren are family.',
      correct: ['grandparents', 'and', 'grandchildren', 'are', 'family'],
      choices: [['family', 'family'], ['grandchildren', 'the grandchildren'], ['are', 'are'], ['grandparents', 'The grandparents'], ['and', 'and']],
      translation: 'Los abuelos y los nietos son familia.',
      instruction: 'Ordena las palabras para completar la tarjeta de la película.',
      successOutcome: 'La tarjeta confirma la relación y abre las pruebas de continuidad.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director constructs the singular masculine question and contrasts is with are',
    card: missionConstruction({
      stage: 'Use', visualKey: 'a1_u1_studio_09_who_father',
      prompt: '___ ___ ___?', answer: 'Who is he?', correct: ['who', 'is', 'he'],
      choices: [['are', 'are'], ['he', 'he'], ['who', 'Who'], ['is', 'is']],
      translation: '¿Quién es él?',
      instruction: 'Construye la pregunta para el hombre señalado. Decide entre IS y ARE.',
      successOutcome: 'La pregunta queda grabada y el padre está listo para su toma.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director identifies the exact feminine question from its spoken form',
    card: missionChoice({
      interaction: 'mission-listen', stage: 'Listen', visualKey: 'a1_u1_studio_10_who_mother',
      answer: 'She is the mother.', audio: 'Who is she?',
      choices: [['correct', 'Who is she?'], ['wrong-he', 'Who is he?'], ['wrong-they', 'Who are they?']],
      translation: '¿Quién es ella? Ella es la madre.',
      instruction: 'Escucha y elige exactamente la pregunta que oyes para la mujer señalada.',
      successOutcome: 'La pregunta correcta hace que ella responda: “She is the mother.”',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director constructs the plural answer for the parent pair',
    card: missionConstruction({
      stage: 'Use', visualKey: 'a1_u1_studio_11_who_parents',
      prompt: '___ ___ ___ ___.', answer: 'They are the parents.',
      correct: ['they', 'are', 'the', 'parents'],
      choices: [['parents', 'parents'], ['they', 'They'], ['the', 'the'], ['are', 'are']],
      translation: 'Ellos son los padres.', audio: 'Who are they?',
      instruction: 'Escucha la pregunta y ordena la respuesta de los dos actores.',
      successOutcome: 'La pareja queda confirmada como los padres.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director records the children identity line for the continuity board',
    card: missionSpeaking({
      visualKey: 'a1_u1_studio_12_who_children', prompt: 'Who are they? They are the children.',
      translation: '¿Quiénes son ellos? Ellos son los niños.',
      instruction: 'Escucha el modelo y graba la pregunta con su respuesta.',
      successOutcome: 'Tu voz coloca el sello de los niños en el tablero.',
    }),
  },
  {
    chapter: 'build-the-cast',
    phase: 'the director resolves the last family-role continuity clue',
    card: missionChoice({
      visualKey: 'a1_u1_studio_13_who_grandparents', prompt: 'Who are they?',
      answer: 'They are the grandparents.', audio: 'Who are they?',
      choices: [['correct', 'They are the grandparents.'], ['wrong-children', 'They are the children.'], ['wrong-babies', 'They are the babies.']],
      translation: '¿Quiénes son ellos? Ellos son los abuelos.',
      instruction: 'Mira a la pareja señalada y elige el papel que ya recibió en el casting.',
      successOutcome: 'La continuidad de todo el elenco queda confirmada.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director labels two simultaneously visible actions by their spatial props',
    card: missionMatch({
      stage: 'Use', visualKey: 'a1_u1_studio_14_eating_drinking',
      answer: 'The man is eating and drinking.',
      choices: [['drinking', 'The man is drinking.'], ['eating', 'The man is eating.']],
      targets: [
        missionTarget('fork-action', 'Toma izquierda', 'eating'),
        missionTarget('glass-action', 'Toma derecha', 'drinking'),
      ],
      translation: 'El hombre está comiendo y bebiendo.',
      instruction: 'Observa los lados izquierdo y derecho de la imagen y relaciona cada oración con la acción visible en ese lado.',
      successOutcome: 'Las dos acciones de las tomas quedan identificadas sin un orden oculto.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director interprets a spoken two-action cue instead of copying a sentence',
    card: missionChoice({
      interaction: 'mission-listen', stage: 'Listen', visualKey: 'a1_u1_studio_15_reading_writing',
      answer: null, audio: 'The boy is reading and writing.',
      choices: [
        ['correct', 'The boy is reading and writing.'],
        ['wrong-reading', 'The boy is reading and sleeping.'],
        ['wrong-writing', 'The boy is eating and writing.'],
      ],
      translation: 'El niño está leyendo y escribiendo.',
      instruction: 'Escucha la indicación y marca la descripción que coincide con la toma.',
      successOutcome: 'La pista de audio y las acciones del niño quedan sincronizadas.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director assigns a distinct action caption to each cast member',
    card: missionMatch({
      stage: 'Use', visualKey: 'a1_u1_studio_16_running_sitting',
      answer: 'The brother is running. The sister is running. The mother is sitting.',
      choices: [
        ['brother-running', 'The brother is running.'],
        ['brother-sitting', 'The brother is sitting.'],
        ['sister-running', 'The sister is running.'],
        ['sister-sitting', 'The sister is sitting.'],
        ['mother-sitting', 'The mother is sitting.'],
        ['mother-running', 'The mother is running.'],
      ],
      targets: [
        missionTarget('person-left', 'Persona izquierda', 'brother-running'),
        missionTarget('person-center', 'Persona del centro', 'sister-running'),
        missionTarget('person-right', 'Persona derecha', 'mother-sitting'),
      ],
      translation: 'El hermano está corriendo. La hermana está corriendo. La madre está sentada.',
      instruction: 'Observa a cada persona y coloca debajo la oración que describe exactamente su acción.',
      successOutcome: 'Cada integrante del elenco queda identificado con su propia acción visible.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director follows a spoken two-shot cue in its stated order',
    card: missionChoice({
      interaction: 'mission-listen', stage: 'Listen', visualKey: 'a1_u1_studio_17_swimming_sleeping',
      audio: 'The sisters are swimming. The grandfather is sleeping.', answer: null,
      choices: [
        ['correct', 'The sisters are swimming. The grandfather is sleeping.'],
        ['wrong-swapped', 'The sisters are sleeping. The grandfather is swimming.'],
        ['wrong-actions', 'The sisters are sitting. The grandfather is running.'],
      ],
      translation: 'Las hermanas están nadando. El abuelo está durmiendo.',
      instruction: 'Escucha y elige la descripción que sigue las tomas de izquierda a derecha.',
      successOutcome: 'Las dos tomas quedan montadas en el orden anunciado.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director stamps the only true two-shot continuity caption',
    card: missionChoice({
      stage: 'Recognize', visualKey: 'a1_u1_studio_18_playing_studying',
      answer: 'The children are playing. The sister is studying.',
      choices: [
        ['correct', 'The children are playing. The sister is studying.'],
        ['wrong-swapped', 'The children are studying. The sister is playing.'],
        ['wrong-actions', 'The children are sleeping. The sister is running.'],
      ],
      translation: 'Los niños están jugando. La hermana está estudiando.',
      instruction: 'Marca la única descripción verdadera de las dos tomas.',
      successOutcome: 'El sello de continuidad corrige la descripción intercambiada.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director places three spoken action captions on local shot targets',
    card: missionMatch({
      stage: 'Listen', visualKey: 'a1_u1_studio_19_work_cook_talk',
      answer: null,
      audio: 'The parents are working. The grandmother is cooking. The brothers are talking.',
      choices: [
        ['grandmother-cooking', 'The grandmother is cooking.'],
        ['brothers-cooking', 'The brothers are cooking.'],
        ['parents-working', 'The parents are working.'],
        ['grandmother-working', 'The grandmother is working.'],
        ['brothers-talking', 'The brothers are talking.'],
        ['parents-talking', 'The parents are talking.'],
      ],
      targets: [
        missionTarget('shot-1', 'Toma 1', 'parents-working'),
        missionTarget('shot-2', 'Toma 2', 'grandmother-cooking'),
        missionTarget('shot-3', 'Toma 3', 'brothers-talking'),
      ],
      translation: 'Los padres están trabajando. La abuela está cocinando. Los hermanos están hablando.',
      instruction: 'Escucha y coloca cada oración en la toma correspondiente.',
      successOutcome: 'Trabajo, cocina y conversación quedan sincronizados con su escena.',
    }),
  },
  {
    chapter: 'shoot-and-edit',
    phase: 'the director repairs three local negative-to-positive continuity notes',
    card: missionMatch({
      stage: 'Use', visualKey: 'a1_u1_studio_20_not_continuity', interaction: 'mission-truth-stamp',
      answer: 'He is not sitting. He is running. She is not sleeping. She is cooking. They are not sitting. They are swimming.',
      choices: [
        ['sisters-fix', 'They are not sitting. They are swimming.'],
        ['father-wrong', 'He is sitting. He is not running.'],
        ['father-fix', 'He is not sitting. He is running.'],
        ['sisters-wrong', 'They are sitting. They are not swimming.'],
        ['grandmother-fix', 'She is not sleeping. She is cooking.'],
        ['grandmother-wrong', 'She is sleeping. She is not cooking.'],
      ],
      targets: [
        missionTarget('father-shot', 'Toma 1', 'father-fix'),
        missionTarget('grandmother-shot', 'Toma 2', 'grandmother-fix'),
        missionTarget('sisters-shot', 'Toma 3', 'sisters-fix'),
      ],
      translation: 'Él no está sentado; está corriendo. Ella no está durmiendo; está cocinando. Ellas no están sentadas; están nadando.',
      instruction: 'Observa cada toma y coloca la nota que describe correctamente lo que no ocurre y lo que sí ocurre.',
      successOutcome: 'Las tres notas falsas quedan reemplazadas por continuidad verdadera.',
    }),
  },
  {
    chapter: 'record-and-premiere',
    phase: 'the director records the final live question that cues the full cast',
    card: missionSpeaking({
      visualKey: 'a1_u1_studio_21_final_question', prompt: 'Who are they?',
      translation: '¿Quiénes son ellos?',
      instruction: 'Escucha el modelo y graba la pregunta que dará entrada al elenco.',
      successOutcome: 'Tu pregunta queda grabada y las luces del estreno se encienden.',
    }),
  },
  {
    chapter: 'record-and-premiere',
    phase: 'the director assembles the answer and premieres the completed Unit 1 production',
    card: missionConstruction({
      stage: 'Use', visualKey: 'a1_u1_studio_22_premiere',
      prompt: '___ ___ ___ ___.', answer: 'They are a family.', correct: ['they', 'are', 'a', 'family'],
      choices: [['family', 'family'], ['they', 'They'], ['a', 'a'], ['are', 'are']],
      translation: 'Ellos son una familia.',
      instruction: 'Responde la pregunta para iniciar el estreno.',
      successOutcome: '“They are a family.” completa la toma y revela tu insignia de dominio de la Unidad 1.',
      interaction: 'mission-finale',
    }),
  },
];

const lesson110Cards = missionBlueprint.map(({ chapter, phase, card }, index) => ({
  slide_id: `M${String(index + 1).padStart(2, '0')}`,
  ...card,
  mission_chapter_id: chapter,
  spanish_translation: card.translation || '',
  pedagogy_note: `Mission beat ${String(index + 1).padStart(2, '0')}/22: ${phase}; the completed interaction produces visible evidence for the live Unit 1 studio challenge.`,
}));

if (lesson110Cards.length !== 22) throw new Error(`1.10 must contain 22 mission beats, found ${lesson110Cards.length}`);
const missionChapterOrder = ['casting-call', 'build-the-cast', 'shoot-and-edit', 'record-and-premiere'];
if (JSON.stringify([...new Set(lesson110Cards.map((card) => card.mission_chapter_id))]) !== JSON.stringify(missionChapterOrder)) {
  throw new Error('1.10 mission chapters must follow the reviewed studio story order');
}
if (lesson110Cards.some((card, index) => card.slide_id !== `M${String(index + 1).padStart(2, '0')}`)) {
  throw new Error('1.10 mission slide IDs must remain M01 through M22');
}
if (lesson110Cards.some((card) => !card.instruction_es?.trim() || !card.success_outcome_es?.trim())) {
  throw new Error('Every 1.10 mission beat requires a direct Spanish instruction and a visible success outcome');
}
const missionVisualKeys = lesson110Cards.map((card) => card.mission_visual_key);
if (
  missionVisualKeys.some((key) => !key.startsWith('a1_u1_studio_'))
  || new Set(missionVisualKeys).size !== 22
) {
  throw new Error('1.10 requires one unique a1_u1_studio visual key for every mission beat');
}
for (const card of lesson110Cards) {
  const expectedStill = approvedStudioStills[card.mission_visual_key];
  const expectedUrl = expectedStill ? media(expectedStill) : '';
  const hasOptionImage = card.options.some((option) => option.image_url);
  const hasExactSpeakingModelImage = (
    card.interaction_type === 'mission-speak'
    && card.options.length === 1
    && card.options[0].id === card.correct_option_id
    && card.options[0].image_url === expectedUrl
  );
  if (
    card.prompt_image_url !== expectedUrl
    || (card.interaction_type === 'mission-speak' ? !hasExactSpeakingModelImage : hasOptionImage)
  ) {
    throw new Error(`Studio media binding drifted for ${card.slide_id}`);
  }
}

const unitOneLearnedVocabulary = [
  'a', 'boy', 'girl', 'man', 'woman', 'he', 'she', 'is', 'the', 'eating', 'drinking', 'reading', 'writing',
  'and', 'they', 'are', 'running', 'sitting', 'swimming', 'sleeping', 'family', 'baby', 'babies', 'child',
  'children', 'brother', 'brothers', 'sister', 'sisters', 'an', 'adult', 'adults', 'father', 'mother', 'parents',
  'grandfather', 'grandmother', 'grandparents', 'grandchildren', 'playing', 'studying', 'working', 'cooking', 'talking',
  'not', 'who',
];
const missionGoldText = lesson110Cards.filter(
  (card) => card.mission_tutorial_mode !== 'guided-no-fail',
).map((card) => {
  const correctIds = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  const correctLabels = correctIds.map((id) => card.options.find((option) => option.id === id)?.label || '');
  return [card.prompt, card.audio_text, card.answer_audio_text, ...correctLabels].filter(Boolean).join(' ');
}).join(' ').toLowerCase();
const missingMissionVocabulary = unitOneLearnedVocabulary.filter((word) => !new RegExp(`\\b${word}\\b`, 'i').test(missionGoldText));
if (missingMissionVocabulary.length) {
  throw new Error(`1.10 assessed gold paths outside M01 omit learned Unit 1 vocabulary: ${missingMissionVocabulary.join(', ')}`);
}

const lesson110 = {
  id: 'lesson-10-family-mission', title: '1.10 People in Action Mission', level: 'Beginner A1',
  unit_id: 'unit-1', unit_title: 'Unit 1: People, Family, and Actions',
  unit_outcome: 'Understand and produce simple sentences about people, family members, and actions.',
  lesson_id: 'lesson-1', lesson_title: 'Unit 1: People, Family, and Actions',
  sub_lesson_id: '1.10', sub_lesson_title: 'People in Action Mission',
  experience_type: 'mission', content_revision: 3,
  mission: {
    label: 'MISIÓN FINAL · UNIDAD 1',
    title: 'Misión: Personas en acción',
    briefing: '¡Misión final! Dirige Personas en acción. Forma el elenco, confirma las relaciones, identifica las acciones, corrige con NOT y graba la pregunta final. Demuestra todo lo aprendido en la Unidad 1.',
    completion_title: '¡Estreno completado!',
    completion_message: 'Demostraste personas, familia, acciones, preguntas y continuidad. Ya tienes la insignia de dirección de la Unidad 1.',
    chapters: [
      { id: 'casting-call', title: 'Llamado a casting', objective: 'Abre el set y asigna personas, pronombres y cantidades.' },
      { id: 'build-the-cast', title: 'Arma el elenco', objective: 'Confirma relaciones y resuelve las pistas con Who.' },
      { id: 'shoot-and-edit', title: 'Graba y edita', objective: 'Dirige acciones y corrige la continuidad con NOT.' },
      { id: 'record-and-premiere', title: 'Última toma y estreno', objective: 'Graba la pregunta final y da la entrada al elenco.' },
    ],
  },
  goal: 'Direct a live Unit 1 studio challenge by casting people and family roles, interpreting actions, repairing continuity, and completing the final spoken cue.',
  vocabulary: [], review_vocabulary: unitOneLearnedVocabulary,
  grammar_function: 'Apply every Unit 1 article, singular/plural, identity, pronoun, action, negative, and who-question pattern inside one continuous studio challenge.',
  prerequisite: 'Lessons 1.1-1.9 completed.',
  speaking_outcome: 'Ask and answer who people are while directing the final live take.',
  purposeful_review_slides: ['M01', 'M04', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M20', 'M21', 'M22'],
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
