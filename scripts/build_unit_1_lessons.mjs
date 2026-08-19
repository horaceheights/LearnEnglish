import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = join(root, 'backend', 'lessons', 'unit_1');
const stages = ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'];

const image = (id, imageUrl, label) => ({ id, image_url: imageUrl, label });
const text = (id, label) => ({ id, image_url: '', label });

function card({ prompt, stage, correct, options, audio = null, answer = null, promptImage = '' }) {
  return {
    prompt,
    stage,
    correct_option_id: correct,
    options,
    audio_text: audio,
    answer_audio_text: answer,
    prompt_image_url: promptImage,
  };
}

const learn = (prompt, id, imageUrl, label = prompt) => card({
  prompt,
  stage: 'Learn',
  correct: id,
  options: [image(id, imageUrl, label)],
  audio: prompt,
});

const recognize = (prompt, correct, options) => card({
  prompt,
  stage: 'Recognize',
  correct,
  options,
  audio: prompt,
  answer: '',
});

const describe = (imageUrl, answer, correct, labels) => card({
  prompt: '',
  stage: 'Recognize',
  correct,
  options: labels.map(([id, label]) => text(id, label)),
  audio: null,
  answer,
  promptImage: imageUrl,
});

const identityQuestion = (imageUrl, question, correct, labels) => {
  const options = labels.map(([id, label]) => text(id, label));
  const correctOption = options.find((option) => option.id === correct);
  if (!correctOption) throw new Error(`Missing identity answer for ${correct}`);
  return card({
    prompt: question,
    stage: 'Recognize',
    correct,
    options,
    audio: question,
    answer: correctOption.label,
    promptImage: imageUrl,
  });
};

const listen = (audio, correct, options) => card({
  prompt: 'Listen and choose.',
  stage: 'Listen',
  correct,
  options,
  audio,
  answer: '',
});

const speak = (prompt, id, imageUrl) => card({
  prompt,
  stage: 'Speak',
  correct: id,
  options: [image(id, imageUrl, prompt)],
  audio: prompt,
});

const use = (prompt, promptImage, answer, correct, labels) => card({
  prompt,
  stage: 'Use',
  correct,
  options: labels.map(([id, label]) => text(id, label)),
  audio: null,
  answer,
  promptImage,
});

function lesson({ id, number, title, goal, vocabulary, cards }) {
  const actualStages = [...new Set(cards.map((item) => item.stage))];
  if (JSON.stringify(actualStages) !== JSON.stringify(stages)) {
    throw new Error(`${id} has invalid stage order: ${actualStages.join(', ')}`);
  }
  if (cards.length < 30 || cards.length > 40) {
    throw new Error(`${id} must contain 30-40 cards, found ${cards.length}`);
  }
  return {
    id,
    title: `${number} ${title}`,
    level: 'Beginner A1',
    unit_id: 'unit-1',
    unit_title: 'Unit 1: People, Family, and Actions',
    lesson_id: 'lesson-1',
    lesson_title: 'Unit 1: People, Family, and Actions',
    sub_lesson_id: number,
    sub_lesson_title: title,
    goal,
    vocabulary,
    cards,
  };
}

const assets = {
  boy: 'boy.webp',
  girl: 'girl.webp',
  man: 'man.webp',
  woman: 'woman.webp',
  boyEating: 'boy_is_eating.webp',
  boyReading: 'boy_is_reading.webp',
  boyRunning: 'boy_is_running.webp',
  boySwimming: 'boy_is_swimming.webp',
  boyWriting: 'boy_is_writing.webp',
  girlDrinking: 'girl_is_drinking.webp',
  girlReading: 'girl_is_reading.webp',
  girlSleeping: 'girl_is_sleeping.webp',
  girlWalking: 'girl_is_walking.webp',
  girlWriting: 'girl_is_writing.webp',
  womanReading: 'woman_is_reading.webp',
  pair: 'they_boy_girl.webp',
  pairEating: 'they_boy_girl_are_eating.webp',
  pairReading: 'they_boy_girl_are_reading.webp',
  pairRunning: 'they_boy_girl_are_running.webp',
  pairWriting: 'they_boy_girl_are_writing.webp',
  family: 'family_all_members.webp',
  baby: 'family_baby.webp',
  babies: 'family_babies.webp',
  babySleeping: 'family_baby_sleeping.webp',
  children: 'family_children.webp',
  childrenPlaying: 'family_children_playing.webp',
  childrenStudying: 'family_children_studying.webp',
  brother: 'boy.webp',
  brothers: 'family_brothers.webp',
  brotherStudying: 'family_brother_studying.webp',
  sister: 'girl.webp',
  sisters: 'family_sisters.webp',
  adults: 'family_adults.webp',
  adultsPlaying: 'family_adults_playing.webp',
  father: 'family_father.webp',
  fatherWorking: 'family_father_working.webp',
  mother: 'family_mother.webp',
  motherCooking: 'family_mother_cooking.webp',
  parents: 'family_parents.webp',
  parentsTalking: 'family_parents_talking.webp',
  grandfather: 'family_grandfather.webp',
  grandmother: 'family_grandmother.webp',
  grandparents: 'family_grandparents.webp',
  grandparentsSitting: 'family_grandparents_sitting.webp',
  grandparentsTalking: 'family_grandparents_talking.webp',
};

const twoPeople = lesson({
  id: 'lesson-3-two-people',
  number: '1.3',
  title: 'Two People: They and Are',
  goal: 'Connect two familiar people with and, replace them with they, and use are for two people.',
  vocabulary: ['and', 'they', 'are', 'swimming', 'sleeping'],
  cards: [
    learn('And', 'pair', assets.pair, 'The boy and the girl'),
    learn('They', 'pair', assets.pair, 'They'),
    learn('Are', 'pair-running', assets.pairRunning, 'They are running.'),
    learn('Swimming', 'boy-swimming', assets.boySwimming),
    learn('Sleeping', 'girl-sleeping', assets.girlSleeping),
    learn('The boy and the girl', 'pair-people', assets.pair),
    learn('The boy and the girl are running.', 'pair-running-sentence', assets.pairRunning),
    learn('They are reading.', 'pair-reading', assets.pairReading),
    learn('They are writing.', 'pair-writing', assets.pairWriting),

    recognize('The boy and the girl', 'pair', [image('pair', assets.pair, 'The boy and the girl'), image('boy', assets.boy, 'The boy')]),
    recognize('They', 'pair', [image('girl', assets.girl, 'She'), image('pair', assets.pair, 'They')]),
    recognize('They are running.', 'pair-running', [image('pair-running', assets.pairRunning, 'They are running.'), image('pair-reading', assets.pairReading, 'They are reading.')]),
    recognize('They are reading.', 'pair-reading', [image('pair-writing', assets.pairWriting, 'They are writing.'), image('pair-reading', assets.pairReading, 'They are reading.')]),
    recognize('He is swimming.', 'boy-swimming', [image('boy-swimming', assets.boySwimming, 'He is swimming.'), image('girl-sleeping', assets.girlSleeping, 'She is sleeping.'), image('boy-eating', assets.boyEating, 'He is eating.'), image('girl-writing', assets.girlWriting, 'She is writing.')]),
    recognize('She is sleeping.', 'girl-sleeping', [image('girl-reading', assets.girlReading, 'She is reading.'), image('boy-swimming', assets.boySwimming, 'He is swimming.'), image('girl-sleeping', assets.girlSleeping, 'She is sleeping.'), image('boy-writing', assets.boyWriting, 'He is writing.')]),
    recognize('They are eating.', 'pair-eating', [image('pair-reading', assets.pairReading, 'They are reading.'), image('pair-eating', assets.pairEating, 'They are eating.'), image('pair-running', assets.pairRunning, 'They are running.'), image('pair-writing', assets.pairWriting, 'They are writing.')]),
    recognize('They are writing.', 'pair-writing', [image('pair-writing', assets.pairWriting, 'They are writing.'), image('pair-eating', assets.pairEating, 'They are eating.'), image('pair-reading', assets.pairReading, 'They are reading.'), image('pair-running', assets.pairRunning, 'They are running.')]),
    describe(assets.pairRunning, 'They are running.', 'running', [['reading', 'They are reading.'], ['running', 'They are running.']]),
    describe(assets.girlSleeping, 'She is sleeping.', 'sleeping', [['swimming', 'He is swimming.'], ['sleeping', 'She is sleeping.']]),

    listen('They are running.', 'pair-running', [image('pair-running', assets.pairRunning, ''), image('pair-reading', assets.pairReading, '')]),
    listen('They are writing.', 'pair-writing', [image('pair-eating', assets.pairEating, ''), image('pair-writing', assets.pairWriting, '')]),
    listen('He is swimming.', 'boy-swimming', [image('girl-sleeping', assets.girlSleeping, ''), image('boy-swimming', assets.boySwimming, '')]),
    listen('She is sleeping.', 'girl-sleeping', [image('girl-sleeping', assets.girlSleeping, ''), image('boy-eating', assets.boyEating, '')]),
    listen('The boy and the girl are reading.', 'pair-reading', [image('pair-running', assets.pairRunning, ''), image('pair-writing', assets.pairWriting, ''), image('pair-reading', assets.pairReading, ''), image('pair-eating', assets.pairEating, '')]),
    listen('They are eating.', 'pair-eating', [image('pair-eating', assets.pairEating, ''), image('pair-reading', assets.pairReading, ''), image('pair-writing', assets.pairWriting, ''), image('pair-running', assets.pairRunning, '')]),

    speak('And', 'pair', assets.pair),
    speak('They are running.', 'pair-running', assets.pairRunning),
    speak('He is swimming.', 'boy-swimming', assets.boySwimming),
    speak('She is sleeping.', 'girl-sleeping', assets.girlSleeping),
    speak('They are reading.', 'pair-reading', assets.pairReading),
    speak('The boy and the girl are writing.', 'pair-writing', assets.pairWriting),

    use('The boy ___ the girl are running.', assets.pairRunning, 'The boy and the girl are running.', 'and', [['and', 'and'], ['is', 'is']]),
    use('The boy and the girl ___ running.', assets.pairRunning, 'The boy and the girl are running.', 'are', [['is', 'is'], ['are', 'are']]),
    use('___ are reading.', assets.pairReading, 'They are reading.', 'they', [['he', 'He'], ['they', 'They']]),
    use('He is ___.', assets.boySwimming, 'He is swimming.', 'swimming', [['sleeping', 'sleeping'], ['swimming', 'swimming']]),
    use('She is ___.', assets.girlSleeping, 'She is sleeping.', 'sleeping', [['sleeping', 'sleeping'], ['reading', 'reading']]),
    use('They ___ writing.', assets.pairWriting, 'They are writing.', 'are', [['are', 'are'], ['is', 'is']]),
  ],
});

const childrenSiblings = lesson({
  id: 'lesson-4-children-siblings',
  number: '1.4',
  title: 'Children and Siblings',
  goal: 'Recognize young family members and distinguish singular and plural family words.',
  vocabulary: ['family', 'baby', 'babies', 'child', 'children', 'brother', 'brothers', 'sister', 'sisters'],
  cards: [
    learn('A family', 'family', assets.family),
    learn('A baby', 'baby', assets.baby),
    learn('Babies', 'babies', assets.babies),
    learn('A child', 'child', assets.boy),
    learn('Children', 'children', assets.children),
    learn('A brother', 'brother', assets.brother),
    learn('Brothers', 'brothers', assets.brothers),
    learn('A sister', 'sister', assets.sister),
    learn('Sisters', 'sisters', assets.sisters),

    recognize('A baby', 'baby', [image('baby', assets.baby, 'A baby'), image('babies', assets.babies, 'Babies')]),
    recognize('Babies', 'babies', [image('child', assets.boy, 'A child'), image('babies', assets.babies, 'Babies')]),
    recognize('A child', 'child', [image('child', assets.boy, 'A child'), image('children', assets.children, 'Children')]),
    recognize('Children', 'children', [image('children', assets.children, 'Children'), image('baby', assets.baby, 'A baby')]),
    recognize('A brother', 'brother', [image('sister', assets.sister, 'A sister'), image('brother', assets.brother, 'A brother'), image('babies', assets.babies, 'Babies'), image('children', assets.children, 'Children')]),
    recognize('Sisters', 'sisters', [image('brothers', assets.brothers, 'Brothers'), image('sisters', assets.sisters, 'Sisters'), image('baby', assets.baby, 'A baby'), image('brother', assets.brother, 'A brother')]),
    recognize('Brothers', 'brothers', [image('sisters', assets.sisters, 'Sisters'), image('brother', assets.brother, 'A brother'), image('babies', assets.babies, 'Babies'), image('brothers', assets.brothers, 'Brothers')]),
    describe(assets.family, 'They are a family.', 'family', [['family', 'They are a family.'], ['babies', 'They are babies.']]),
    describe(assets.sisters, 'They are sisters.', 'sisters', [['brothers', 'They are brothers.'], ['sisters', 'They are sisters.']]),

    listen('A baby', 'baby', [image('baby', assets.baby, ''), image('babies', assets.babies, '')]),
    listen('Children', 'children', [image('children', assets.children, ''), image('adults', assets.adults, '')]),
    listen('They are brothers.', 'brothers', [image('sisters', assets.sisters, ''), image('brothers', assets.brothers, '')]),
    listen('They are sisters.', 'sisters', [image('sisters', assets.sisters, ''), image('brothers', assets.brothers, '')]),
    listen('They are a family.', 'family', [image('family', assets.family, ''), image('baby', assets.baby, ''), image('boy', assets.boy, ''), image('woman', assets.woman, '')]),
    listen('The boy is a child.', 'child', [image('baby', assets.baby, ''), image('sister', assets.sister, ''), image('child', assets.boy, ''), image('family', assets.family, '')]),

    speak('A baby', 'baby', assets.baby),
    speak('Babies', 'babies', assets.babies),
    speak('The boy is a child.', 'child', assets.boy),
    speak('They are children.', 'children', assets.children),
    speak('They are brothers.', 'brothers', assets.brothers),
    speak('They are sisters.', 'sisters', assets.sisters),

    use('A ___.', assets.baby, 'A baby.', 'baby', [['baby', 'baby'], ['babies', 'babies']]),
    use('___.', assets.babies, 'Babies.', 'babies', [['baby', 'Baby'], ['babies', 'Babies']]),
    use('The boy is a ___.', assets.boy, 'The boy is a child.', 'child', [['child', 'child'], ['children', 'children']]),
    use('They are ___.', assets.children, 'They are children.', 'children', [['children', 'children'], ['child', 'child']]),
    use('They are ___.', assets.brothers, 'They are brothers.', 'brothers', [['sisters', 'sisters'], ['brothers', 'brothers']]),
    use('They are ___.', assets.sisters, 'They are sisters.', 'sisters', [['brothers', 'brothers'], ['sisters', 'sisters']]),
  ],
});

const parentsGrandparents = lesson({
  id: 'lesson-5-parents-grandparents',
  number: '1.5',
  title: 'Parents and Grandparents',
  goal: 'Recognize adult family members and connect each family word to one person or a group.',
  vocabulary: ['adult', 'adults', 'father', 'mother', 'parents', 'grandfather', 'grandmother', 'grandparents'],
  cards: [
    learn('An adult', 'father-adult', assets.father),
    learn('Adults', 'adults', assets.adults),
    learn('The father', 'father', assets.father),
    learn('The mother', 'mother', assets.mother),
    learn('The parents', 'parents', assets.parents),
    learn('The grandfather', 'grandfather', assets.grandfather),
    learn('The grandmother', 'grandmother', assets.grandmother),
    learn('The grandparents', 'grandparents', assets.grandparents),
    learn('They are the parents.', 'parents-sentence', assets.parents),
    learn('They are the grandparents.', 'grandparents-sentence', assets.grandparents),

    recognize('An adult', 'father', [image('father', assets.father, 'An adult'), image('child', assets.boy, 'A child')]),
    recognize('Adults', 'adults', [image('children', assets.children, 'Children'), image('adults', assets.adults, 'Adults')]),
    recognize('The father', 'father', [image('father', assets.father, 'The father'), image('mother', assets.mother, 'The mother')]),
    recognize('The mother', 'mother', [image('grandmother', assets.grandmother, 'The grandmother'), image('mother', assets.mother, 'The mother')]),
    recognize('The parents', 'parents', [image('parents', assets.parents, 'The parents'), image('grandparents', assets.grandparents, 'The grandparents'), image('father', assets.father, 'The father'), image('mother', assets.mother, 'The mother')]),
    recognize('The grandfather', 'grandfather', [image('father', assets.father, 'The father'), image('grandmother', assets.grandmother, 'The grandmother'), image('grandfather', assets.grandfather, 'The grandfather'), image('mother', assets.mother, 'The mother')]),
    describe(assets.grandparents, 'They are the grandparents.', 'grandparents', [['parents', 'They are the parents.'], ['grandparents', 'They are the grandparents.']]),
    describe(assets.parents, 'They are the parents.', 'parents', [['parents', 'They are the parents.'], ['grandparents', 'They are the grandparents.']]),

    listen('The father', 'father', [image('father', assets.father, ''), image('mother', assets.mother, '')]),
    listen('The grandmother', 'grandmother', [image('grandfather', assets.grandfather, ''), image('grandmother', assets.grandmother, '')]),
    listen('They are the parents.', 'parents', [image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('They are the grandparents.', 'grandparents', [image('grandparents', assets.grandparents, ''), image('parents', assets.parents, '')]),
    listen('He is the grandfather.', 'grandfather', [image('father', assets.father, ''), image('grandfather', assets.grandfather, ''), image('mother', assets.mother, ''), image('grandmother', assets.grandmother, '')]),
    listen('She is the mother.', 'mother', [image('grandmother', assets.grandmother, ''), image('father', assets.father, ''), image('mother', assets.mother, ''), image('grandfather', assets.grandfather, '')]),

    speak('An adult', 'father', assets.father),
    speak('They are adults.', 'adults', assets.adults),
    speak('He is the father.', 'father', assets.father),
    speak('She is the mother.', 'mother', assets.mother),
    speak('They are the parents.', 'parents', assets.parents),
    speak('They are the grandparents.', 'grandparents', assets.grandparents),

    use('He is the ___.', assets.father, 'He is the father.', 'father', [['father', 'father'], ['grandfather', 'grandfather']]),
    use('She is the ___.', assets.mother, 'She is the mother.', 'mother', [['grandmother', 'grandmother'], ['mother', 'mother']]),
    use('They are the ___.', assets.parents, 'They are the parents.', 'parents', [['parents', 'parents'], ['grandparents', 'grandparents']]),
    use('He is the ___.', assets.grandfather, 'He is the grandfather.', 'grandfather', [['father', 'father'], ['grandfather', 'grandfather']]),
    use('She is the ___.', assets.grandmother, 'She is the grandmother.', 'grandmother', [['mother', 'mother'], ['grandmother', 'grandmother']]),
    use('They are the ___.', assets.grandparents, 'They are the grandparents.', 'grandparents', [['grandparents', 'grandparents'], ['parents', 'parents']]),
  ],
});

const familyActions = lesson({
  id: 'lesson-6-family-actions',
  number: '1.6',
  title: 'Family Actions',
  goal: 'Describe familiar family members playing, studying, working, cooking, and talking.',
  vocabulary: ['playing', 'studying', 'working', 'cooking', 'talking'],
  cards: [
    learn('Playing', 'children-playing', assets.childrenPlaying),
    learn('Studying', 'brother-studying', assets.brotherStudying),
    learn('Working', 'father-working', assets.fatherWorking),
    learn('Cooking', 'mother-cooking', assets.motherCooking),
    learn('Talking', 'parents-talking', assets.parentsTalking),
    learn('The children are playing.', 'children-playing-sentence', assets.childrenPlaying),
    learn('A brother is studying.', 'brother-studying-sentence', assets.brotherStudying),
    learn('The father is working.', 'father-working-sentence', assets.fatherWorking),
    learn('The mother is cooking.', 'mother-cooking-sentence', assets.motherCooking),
    learn('The parents are talking.', 'parents-talking-sentence', assets.parentsTalking),

    recognize('The children are playing.', 'children-playing', [image('children-playing', assets.childrenPlaying, 'The children are playing.'), image('children-studying', assets.childrenStudying, 'The children are studying.')]),
    recognize('A brother is studying.', 'brother-studying', [image('brother-studying', assets.brotherStudying, 'A brother is studying.'), image('father-working', assets.fatherWorking, 'The father is working.')]),
    recognize('The father is working.', 'father-working', [image('mother-cooking', assets.motherCooking, 'The mother is cooking.'), image('father-working', assets.fatherWorking, 'The father is working.')]),
    recognize('The parents are talking.', 'parents-talking', [image('parents-talking', assets.parentsTalking, 'The parents are talking.'), image('grandparents-sitting', assets.grandparentsSitting, 'The grandparents are sitting.')]),
    recognize('The mother is cooking.', 'mother-cooking', [image('mother-cooking', assets.motherCooking, 'The mother is cooking.'), image('father-working', assets.fatherWorking, 'The father is working.'), image('children-playing', assets.childrenPlaying, 'The children are playing.'), image('parents-talking', assets.parentsTalking, 'The parents are talking.')]),
    recognize('The children are studying.', 'children-studying', [image('parents-talking', assets.parentsTalking, 'The parents are talking.'), image('children-studying', assets.childrenStudying, 'The children are studying.'), image('children-playing', assets.childrenPlaying, 'The children are playing.'), image('mother-cooking', assets.motherCooking, 'The mother is cooking.')]),
    describe(assets.fatherWorking, 'The father is working.', 'working', [['working', 'The father is working.'], ['cooking', 'The father is cooking.']]),
    describe(assets.parentsTalking, 'The parents are talking.', 'talking', [['playing', 'The parents are playing.'], ['talking', 'The parents are talking.']]),

    listen('The children are playing.', 'children-playing', [image('children-playing', assets.childrenPlaying, ''), image('children-studying', assets.childrenStudying, '')]),
    listen('A brother is studying.', 'brother-studying', [image('brother-studying', assets.brotherStudying, ''), image('father-working', assets.fatherWorking, '')]),
    listen('The father is working.', 'father-working', [image('mother-cooking', assets.motherCooking, ''), image('father-working', assets.fatherWorking, '')]),
    listen('The mother is cooking.', 'mother-cooking', [image('mother-cooking', assets.motherCooking, ''), image('parents-talking', assets.parentsTalking, '')]),
    listen('The parents are talking.', 'parents-talking', [image('father-working', assets.fatherWorking, ''), image('children-playing', assets.childrenPlaying, ''), image('parents-talking', assets.parentsTalking, ''), image('mother-cooking', assets.motherCooking, '')]),
    listen('The grandparents are talking.', 'grandparents-talking', [image('grandparents-sitting', assets.grandparentsSitting, ''), image('parents-talking', assets.parentsTalking, ''), image('grandparents-talking', assets.grandparentsTalking, ''), image('children-studying', assets.childrenStudying, '')]),

    speak('Playing', 'children-playing', assets.childrenPlaying),
    speak('Studying', 'brother-studying', assets.brotherStudying),
    speak('The father is working.', 'father-working', assets.fatherWorking),
    speak('The mother is cooking.', 'mother-cooking', assets.motherCooking),
    speak('The parents are talking.', 'parents-talking', assets.parentsTalking),
    speak('The children are playing.', 'children-playing-sentence', assets.childrenPlaying),

    use('The children are ___.', assets.childrenPlaying, 'The children are playing.', 'playing', [['playing', 'playing'], ['studying', 'studying']]),
    use('A brother is ___.', assets.brotherStudying, 'A brother is studying.', 'studying', [['working', 'working'], ['studying', 'studying']]),
    use('The father is ___.', assets.fatherWorking, 'The father is working.', 'working', [['working', 'working'], ['cooking', 'cooking']]),
    use('The mother is ___.', assets.motherCooking, 'The mother is cooking.', 'cooking', [['talking', 'talking'], ['cooking', 'cooking']]),
    use('The parents are ___.', assets.parentsTalking, 'The parents are talking.', 'talking', [['talking', 'talking'], ['playing', 'playing']]),
    use('The children ___ studying.', assets.childrenStudying, 'The children are studying.', 'are', [['is', 'is'], ['are', 'are']]),
  ],
});

const isAreNot = lesson({
  id: 'lesson-7-is-are-not',
  number: '1.7',
  title: 'Is, Are, and Not',
  goal: 'Use is and are with one or more people and understand clear negative sentences with not.',
  vocabulary: ['not'],
  cards: [
    learn('He is working.', 'father-working', assets.fatherWorking),
    learn('They are playing.', 'children-playing', assets.childrenPlaying),
    learn('He is not cooking.', 'father-not-cooking', assets.fatherWorking),
    learn('She is not reading.', 'girl-not-reading', assets.girlWriting),
    learn('They are not sitting.', 'pair-not-sitting', assets.pairRunning),
    learn('The children are not studying.', 'children-not-studying', assets.childrenPlaying),

    recognize('He is not cooking.', 'father-working', [image('father-working', assets.fatherWorking, 'He is not cooking.'), image('mother-cooking', assets.motherCooking, 'She is cooking.')]),
    recognize('She is not reading.', 'girl-writing', [image('woman-reading', assets.womanReading, 'She is reading.'), image('girl-writing', assets.girlWriting, 'She is not reading.')]),
    recognize('They are not sitting.', 'pair-running', [image('grandparents-sitting', assets.grandparentsSitting, 'They are sitting.'), image('pair-running', assets.pairRunning, 'They are not sitting.')]),
    recognize('The children are not studying.', 'children-playing', [image('children-studying', assets.childrenStudying, 'The children are studying.'), image('children-playing', assets.childrenPlaying, 'The children are not studying.')]),
    describe(assets.fatherWorking, 'He is working.', 'is', [['is', 'He is working.'], ['are', 'He are working.']]),
    describe(assets.childrenPlaying, 'They are playing.', 'are', [['is', 'They is playing.'], ['are', 'They are playing.']]),
    describe(assets.girlWriting, 'She is not reading.', 'not-reading', [['reading', 'She is reading.'], ['not-reading', 'She is not reading.']]),
    describe(assets.grandparentsTalking, 'They are not sleeping.', 'not-sleeping', [['sleeping', 'They are sleeping.'], ['not-sleeping', 'They are not sleeping.']]),

    listen('He is not cooking.', 'father-working', [image('father-working', assets.fatherWorking, ''), image('mother-cooking', assets.motherCooking, '')]),
    listen('They are not studying.', 'children-playing', [image('children-studying', assets.childrenStudying, ''), image('children-playing', assets.childrenPlaying, '')]),
    listen('She is cooking.', 'mother-cooking', [image('girl-writing', assets.girlWriting, ''), image('mother-cooking', assets.motherCooking, '')]),
    listen('They are talking.', 'parents-talking', [image('parents-talking', assets.parentsTalking, ''), image('grandparents-sitting', assets.grandparentsSitting, '')]),
    listen('She is not drinking.', 'girl-writing', [image('girl-drinking', assets.girlDrinking, ''), image('girl-writing', assets.girlWriting, '')]),
    listen('They are not sitting.', 'pair-running', [image('grandparents-sitting', assets.grandparentsSitting, ''), image('pair-running', assets.pairRunning, '')]),

    speak('He is working.', 'father-working', assets.fatherWorking),
    speak('They are playing.', 'children-playing', assets.childrenPlaying),
    speak('He is not cooking.', 'father-not-cooking', assets.fatherWorking),
    speak('She is not reading.', 'girl-not-reading', assets.girlWriting),
    speak('They are not sitting.', 'pair-not-sitting', assets.pairRunning),
    speak('The children are not studying.', 'children-not-studying', assets.childrenPlaying),

    use('He ___ working.', assets.fatherWorking, 'He is working.', 'is', [['is', 'is'], ['are', 'are']]),
    use('They ___ playing.', assets.childrenPlaying, 'They are playing.', 'are', [['are', 'are'], ['is', 'is']]),
    use('She is ___ working.', assets.motherCooking, 'She is not working.', 'not', [['not', 'not'], ['are', 'are']]),
    use('They are ___ sitting.', assets.pairRunning, 'They are not sitting.', 'not', [['is', 'is'], ['not', 'not']]),
    use('The father ___ cooking.', assets.fatherWorking, 'The father is not cooking.', 'not', [['not', 'is not'], ['are', 'are']]),
    use('The children ___ studying.', assets.childrenStudying, 'The children are studying.', 'are', [['is', 'is'], ['are', 'are']]),
    use('The baby ___ sleeping.', assets.babySleeping, 'The baby is sleeping.', 'is', [['are', 'are'], ['is', 'is']]),
    use('The parents ___ talking.', assets.parentsTalking, 'The parents are talking.', 'are', [['are', 'are'], ['is', 'is']]),
  ],
});

const whoLesson = lesson({
  id: 'lesson-8-who',
  number: '1.8',
  title: 'Who Is He? Who Are They?',
  goal: 'Ask and answer simple identity questions about one person and groups of family members.',
  vocabulary: ['who'],
  cards: [
    learn('Who is he?', 'father', assets.father, 'He is the father.'),
    learn('He is the father.', 'father-answer', assets.father),
    learn('Who is she?', 'mother', assets.mother, 'She is the mother.'),
    learn('She is the mother.', 'mother-answer', assets.mother),
    learn('Who are they?', 'parents', assets.parents, 'They are the parents.'),
    learn('They are the parents.', 'parents-answer', assets.parents),

    recognize('Who is he? He is the father.', 'father', [image('father', assets.father, 'He is the father.'), image('grandfather', assets.grandfather, 'He is the grandfather.')]),
    recognize('Who is she? She is the mother.', 'mother', [image('grandmother', assets.grandmother, 'She is the grandmother.'), image('mother', assets.mother, 'She is the mother.')]),
    recognize('Who are they? They are the parents.', 'parents', [image('parents', assets.parents, 'They are the parents.'), image('grandparents', assets.grandparents, 'They are the grandparents.')]),
    recognize('Who are they? They are the children.', 'children', [image('adults', assets.adults, 'They are adults.'), image('children', assets.children, 'They are children.')]),
    identityQuestion(assets.father, 'Who is he?', 'father', [['father', 'He is the father.'], ['grandfather', 'He is the grandfather.']]),
    identityQuestion(assets.grandmother, 'Who is she?', 'grandmother', [['mother', 'She is the mother.'], ['grandmother', 'She is the grandmother.']]),
    identityQuestion(assets.parents, 'Who are they?', 'parents', [['parents', 'They are the parents.'], ['grandparents', 'They are the grandparents.']]),
    identityQuestion(assets.sisters, 'Who are they?', 'sisters', [['brothers', 'They are the brothers.'], ['sisters', 'They are the sisters.']]),

    listen('Who is he? He is the grandfather.', 'grandfather', [image('father', assets.father, ''), image('grandfather', assets.grandfather, '')]),
    listen('Who is she? She is the mother.', 'mother', [image('mother', assets.mother, ''), image('grandmother', assets.grandmother, '')]),
    listen('Who are they? They are the parents.', 'parents', [image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('Who are they? They are the children.', 'children', [image('adults', assets.adults, ''), image('children', assets.children, '')]),
    listen('Who are they? They are the brothers.', 'brothers', [image('brothers', assets.brothers, ''), image('sisters', assets.sisters, ''), image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('Who is she? She is the sister.', 'girl', [image('mother', assets.mother, ''), image('girl', assets.girl, ''), image('grandmother', assets.grandmother, ''), image('boy', assets.boy, '')]),

    speak('Who is he?', 'father', assets.father),
    speak('He is the father.', 'father-answer', assets.father),
    speak('Who is she?', 'mother', assets.mother),
    speak('She is the mother.', 'mother-answer', assets.mother),
    speak('Who are they?', 'parents', assets.parents),
    speak('They are the parents.', 'parents-answer', assets.parents),

    use('Who ___ he?', assets.father, 'Who is he?', 'is', [['is', 'is'], ['are', 'are']]),
    use('He is the ___.', assets.father, 'He is the father.', 'father', [['father', 'father'], ['grandfather', 'grandfather']]),
    use('Who ___ she?', assets.grandmother, 'Who is she?', 'is', [['are', 'are'], ['is', 'is']]),
    use('She is the ___.', assets.grandmother, 'She is the grandmother.', 'grandmother', [['mother', 'mother'], ['grandmother', 'grandmother']]),
    use('Who ___ they?', assets.parents, 'Who are they?', 'are', [['is', 'is'], ['are', 'are']]),
    use('They are the ___.', assets.parents, 'They are the parents.', 'parents', [['grandparents', 'grandparents'], ['parents', 'parents']]),
  ],
});

const reviewLesson = lesson({
  id: 'lesson-9-unit-review',
  number: '1.9',
  title: 'Unit 1 Spiral Review',
  goal: 'Retrieve Unit 1 people, family, actions, pronouns, questions, and sentence patterns without new vocabulary.',
  vocabulary: [],
  cards: [
    learn('People', 'family', assets.family, 'A family'),
    learn('Actions', 'children-playing', assets.childrenPlaying, 'The children are playing.'),
    learn('He, she, and they', 'family-pronouns', assets.family),
    learn('Is, are, and not', 'parents-talking', assets.parentsTalking),

    recognize('She is writing.', 'girl-writing', [image('girl-writing', assets.girlWriting, 'She is writing.'), image('boy-reading', assets.boyReading, 'He is reading.')]),
    recognize('They are running.', 'pair-running', [image('pair-reading', assets.pairReading, 'They are reading.'), image('pair-running', assets.pairRunning, 'They are running.')]),
    recognize('The mother is cooking.', 'mother-cooking', [image('mother-cooking', assets.motherCooking, 'The mother is cooking.'), image('father-working', assets.fatherWorking, 'The father is working.')]),
    recognize('The grandparents are talking.', 'grandparents-talking', [image('grandparents-sitting', assets.grandparentsSitting, 'The grandparents are sitting.'), image('grandparents-talking', assets.grandparentsTalking, 'The grandparents are talking.')]),
    describe(assets.children, 'They are children.', 'children', [['children', 'They are children.'], ['adults', 'They are adults.']]),
    describe(assets.parents, 'They are the parents.', 'parents', [['grandparents', 'They are the grandparents.'], ['parents', 'They are the parents.']]),
    describe(assets.fatherWorking, 'The father is working.', 'working', [['working', 'The father is working.'], ['cooking', 'The father is cooking.']]),
    describe(assets.girlWriting, 'She is not reading.', 'not-reading', [['reading', 'She is reading.'], ['not-reading', 'She is not reading.']]),

    listen('He is swimming.', 'boy-swimming', [image('boy-swimming', assets.boySwimming, ''), image('girl-sleeping', assets.girlSleeping, '')]),
    listen('They are sisters.', 'sisters', [image('brothers', assets.brothers, ''), image('sisters', assets.sisters, '')]),
    listen('The father is working.', 'father-working', [image('father-working', assets.fatherWorking, ''), image('mother-cooking', assets.motherCooking, '')]),
    listen('Who are they? They are the grandparents.', 'grandparents', [image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('They are not studying.', 'children-playing', [image('children-studying', assets.childrenStudying, ''), image('children-playing', assets.childrenPlaying, '')]),
    listen('The baby is sleeping.', 'baby-sleeping', [image('baby', assets.baby, ''), image('baby-sleeping', assets.babySleeping, ''), image('babies', assets.babies, ''), image('children', assets.children, '')]),

    speak('The boy is running.', 'boy-running', assets.boyRunning),
    speak('She is writing.', 'girl-writing', assets.girlWriting),
    speak('They are reading.', 'pair-reading', assets.pairReading),
    speak('The children are playing.', 'children-playing', assets.childrenPlaying),
    speak('The mother is cooking.', 'mother-cooking', assets.motherCooking),
    speak('Who are they? They are the parents.', 'parents', assets.parents),

    use('The girl ___ walking.', assets.girlWalking, 'The girl is walking.', 'is', [['is', 'is'], ['are', 'are']]),
    use('They ___ reading.', assets.pairReading, 'They are reading.', 'are', [['are', 'are'], ['is', 'is']]),
    use('He is ___.', assets.boySwimming, 'He is swimming.', 'swimming', [['sleeping', 'sleeping'], ['swimming', 'swimming']]),
    use('They are ___.', assets.sisters, 'They are sisters.', 'sisters', [['brothers', 'brothers'], ['sisters', 'sisters']]),
    use('The mother is ___.', assets.motherCooking, 'The mother is cooking.', 'cooking', [['working', 'working'], ['cooking', 'cooking']]),
    use('They are ___ sitting.', assets.pairRunning, 'They are not sitting.', 'not', [['not', 'not'], ['is', 'is']]),
    use('Who ___ they?', assets.grandparents, 'Who are they?', 'are', [['is', 'is'], ['are', 'are']]),
    use('They are the ___.', assets.grandparents, 'They are the grandparents.', 'grandparents', [['parents', 'parents'], ['grandparents', 'grandparents']]),
  ],
});

const missionLesson = lesson({
  id: 'lesson-10-family-mission',
  number: '1.10',
  title: 'Family Scene Mission',
  goal: 'Complete a final family mission by identifying people, understanding actions, speaking, and building answers.',
  vocabulary: [],
  cards: [
    learn('Meet the family.', 'family', assets.family, 'They are a family.'),
    learn('Find the children.', 'children', assets.children, 'They are the children.'),
    learn('Find the parents.', 'parents', assets.parents, 'They are the parents.'),
    learn('Find the grandparents.', 'grandparents', assets.grandparents, 'They are the grandparents.'),

    describe(assets.family, 'They are a family.', 'family', [['family', 'They are a family.'], ['children', 'They are children.']]),
    describe(assets.children, 'Who are they? They are the children.', 'children', [['children', 'They are the children.'], ['parents', 'They are the parents.']]),
    describe(assets.parents, 'Who are they? They are the parents.', 'parents', [['parents', 'They are the parents.'], ['grandparents', 'They are the grandparents.']]),
    describe(assets.grandparents, 'Who are they? They are the grandparents.', 'grandparents', [['parents', 'They are the parents.'], ['grandparents', 'They are the grandparents.']]),
    recognize('The children are playing.', 'children-playing', [image('children-playing', assets.childrenPlaying, 'The children are playing.'), image('children-studying', assets.childrenStudying, 'The children are studying.')]),
    recognize('The father is working.', 'father-working', [image('mother-cooking', assets.motherCooking, 'The mother is cooking.'), image('father-working', assets.fatherWorking, 'The father is working.')]),
    recognize('The mother is cooking.', 'mother-cooking', [image('father-working', assets.fatherWorking, 'The father is working.'), image('mother-cooking', assets.motherCooking, 'The mother is cooking.')]),
    recognize('The grandparents are talking.', 'grandparents-talking', [image('grandparents-talking', assets.grandparentsTalking, 'The grandparents are talking.'), image('grandparents-sitting', assets.grandparentsSitting, 'The grandparents are sitting.')]),

    listen('Who are they? They are the parents.', 'parents', [image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('The children are studying.', 'children-studying', [image('children-playing', assets.childrenPlaying, ''), image('children-studying', assets.childrenStudying, '')]),
    listen('The mother is cooking.', 'mother-cooking', [image('mother-cooking', assets.motherCooking, ''), image('father-working', assets.fatherWorking, '')]),
    listen('The father is not cooking.', 'father-working', [image('mother-cooking', assets.motherCooking, ''), image('father-working', assets.fatherWorking, '')]),
    listen('They are the sisters.', 'sisters', [image('brothers', assets.brothers, ''), image('sisters', assets.sisters, ''), image('parents', assets.parents, ''), image('grandparents', assets.grandparents, '')]),
    listen('The grandparents are talking.', 'grandparents-talking', [image('grandparents-sitting', assets.grandparentsSitting, ''), image('grandparents-talking', assets.grandparentsTalking, '')]),

    speak('They are a family.', 'family', assets.family),
    speak('Who are they? They are the children.', 'children', assets.children),
    speak('The children are playing.', 'children-playing', assets.childrenPlaying),
    speak('The father is working.', 'father-working', assets.fatherWorking),
    speak('The mother is cooking.', 'mother-cooking', assets.motherCooking),
    speak('The grandparents are talking.', 'grandparents-talking', assets.grandparentsTalking),

    use('They are a ___.', assets.family, 'They are a family.', 'family', [['family', 'family'], ['children', 'children']]),
    use('Who ___ they?', assets.children, 'Who are they?', 'are', [['is', 'is'], ['are', 'are']]),
    use('They are the ___.', assets.parents, 'They are the parents.', 'parents', [['parents', 'parents'], ['grandparents', 'grandparents']]),
    use('The children are ___.', assets.childrenPlaying, 'The children are playing.', 'playing', [['studying', 'studying'], ['playing', 'playing']]),
    use('The father is ___.', assets.fatherWorking, 'The father is working.', 'working', [['working', 'working'], ['cooking', 'cooking']]),
    use('The mother is ___.', assets.motherCooking, 'The mother is cooking.', 'cooking', [['talking', 'talking'], ['cooking', 'cooking']]),
    use('The grandparents ___ talking.', assets.grandparentsTalking, 'The grandparents are talking.', 'are', [['are', 'are'], ['is', 'is']]),
    use('They are ___ sleeping.', assets.grandparentsTalking, 'They are not sleeping.', 'not', [['is', 'is'], ['not', 'not']]),
  ],
});

const lessons = [
  twoPeople,
  childrenSiblings,
  parentsGrandparents,
  familyActions,
  isAreNot,
  whoLesson,
  reviewLesson,
  missionLesson,
];

const obsoleteFiles = [
  '1.3_family_members.yaml',
  '1.4_family_members_continued.yaml',
  '1.5_places_around_me.yaml',
];

for (const obsolete of obsoleteFiles) {
  const path = join(outputDir, obsolete);
  try {
    unlinkSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

for (const item of lessons) {
  const filename = `${item.sub_lesson_id}_${item.sub_lesson_title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}.yaml`;
  writeFileSync(join(outputDir, filename), `${JSON.stringify(item, null, 2)}\n`, 'utf8');
  console.log(`${item.sub_lesson_id} ${item.sub_lesson_title}: ${item.cards.length} cards`);
}
