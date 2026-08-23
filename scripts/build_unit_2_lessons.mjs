import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const planPath = join(root, 'docs', 'product', 'unit-2-curriculum.json');
const outputDir = join(root, 'backend', 'lessons', 'unit_2');
const plan = JSON.parse(readFileSync(planPath, 'utf8')).unit;
const stageOrder = ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'];

const establishedAssets = {
  boy: 'boy.webp',
  woman: 'woman.webp',
  'boy-running': 'boy_is_running.webp',
  'girl-walking': 'girl_is_walking.webp',
  park: 'place_park.webp',
  school: 'place_school.webp',
  store: 'place_store.webp',
  house: 'place_house.webp',
  street: 'place_street.webp',
  bridge: 'place_bridge.webp',
  bus: 'place_bus.webp',
  car: 'object_car.webp',
  bike: 'object_bike.webp',
};

const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function unit2AssetName(key) {
  return `unit2_${key.replaceAll('-', '_')}.webp`;
}

function assetFor(key, lessonNumber) {
  if (!key || key === 'choice-grid' || key === 'no image; speaker control only') return '';
  if (lessonNumber === '2.10' && key === 'school') return unit2AssetName('mission-school');
  if (lessonNumber === '2.10' && key === 'store') return unit2AssetName('mission-store');
  return establishedAssets[key] ?? unit2AssetName(key);
}

function sceneLabel(key) {
  const numberMatch = key.match(/^n(10|[1-9])$/);
  if (numberMatch) return numberWords[Number(numberMatch[1])];
  return key
    .replace(/^mission-/, '')
    .replace(/^(near|far)-/, '$1 ')
    .replaceAll('-', ' ');
}

function textId(label, index) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `option-${index + 1}`;
}

function imageOption(key, lessonNumber, label = sceneLabel(key), id = key) {
  return { id, image_url: assetFor(key, lessonNumber), label };
}

function imageChoices(keys, lessonNumber) {
  return keys.map((key, index) => imageOption(key, lessonNumber, null, `image-${index + 1}`));
}

function imageCorrectId(keys, answer) {
  const index = keys.indexOf(answer);
  if (index < 0) throw new Error(`Image answer ${JSON.stringify(answer)} is not among its choices.`);
  return `image-${index + 1}`;
}

function textOptions(labels) {
  return labels.map((label, index) => ({ id: textId(label, index), image_url: '', label }));
}

function textCorrectId(labels, answer) {
  const index = labels.indexOf(answer);
  if (index < 0) throw new Error(`Text answer ${JSON.stringify(answer)} is not among its choices.`);
  return textId(answer, index);
}

function completeSentence(prompt, answer) {
  if (!prompt.includes('___')) {
    throw new Error(`Completion card has no blank: ${prompt}`);
  }
  return prompt.replace('___', answer);
}

function buildCard(lessonNumber, stage, row) {
  const [slideId, interaction, prompt, audioPlan, visualKey, choices, answer, , spanish] = row;
  const base = {
    prompt,
    stage,
    correct_option_id: '',
    options: [],
    audio_text: null,
    answer_audio_text: null,
    prompt_image_url: '',
    spanish_translation: spanish,
  };

  if (interaction === 'teach' || interaction === 'repeat') {
    const optionId = visualKey;
    return {
      ...base,
      correct_option_id: optionId,
      options: [imageOption(visualKey, lessonNumber, answer || prompt)],
      audio_text: audioPlan,
    };
  }

  if (/^t2i[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: imageCorrectId(choices, answer),
      options: imageChoices(choices, lessonNumber),
      audio_text: audioPlan,
    };
  }

  if (/^i2t[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: textCorrectId(choices, answer),
      options: textOptions(choices),
      audio_text: audioPlan,
      answer_audio_text: answer,
      prompt_image_url: assetFor(visualKey, lessonNumber),
    };
  }

  if (/^a2i[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: imageCorrectId(choices, answer),
      options: imageChoices(choices, lessonNumber),
      audio_text: audioPlan,
    };
  }

  if (/^a2t[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: textCorrectId(choices, answer),
      options: textOptions(choices),
      audio_text: audioPlan,
    };
  }

  if (/^complete[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: textCorrectId(choices, answer),
      options: textOptions(choices),
      answer_audio_text: completeSentence(prompt, answer),
      prompt_image_url: assetFor(visualKey, lessonNumber),
    };
  }

  if (/^choose[24]$/.test(interaction)) {
    return {
      ...base,
      correct_option_id: textCorrectId(choices, answer),
      options: textOptions(choices),
      audio_text: audioPlan,
      answer_audio_text: answer,
      prompt_image_url: assetFor(visualKey, lessonNumber),
    };
  }

  throw new Error(`${lessonNumber} ${stage} ${slideId} uses unknown interaction ${interaction}.`);
}

function buildLesson(lessonPlan, lessonIndex) {
  const cards = [];
  for (const stage of stageOrder) {
    const rows = lessonPlan.stages[stage];
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`${lessonPlan.id} is missing ${stage} cards.`);
    }
    for (const row of rows) cards.push(buildCard(lessonPlan.id, stage, row));
  }

  const actualStages = [...new Set(cards.map((card) => card.stage))];
  if (JSON.stringify(actualStages) !== JSON.stringify(stageOrder)) {
    throw new Error(`${lessonPlan.id} has invalid stage order: ${actualStages.join(', ')}`);
  }
  if (cards.length < 30 || cards.length > 40) {
    throw new Error(`${lessonPlan.id} must contain 30-40 cards, found ${cards.length}.`);
  }

  const globalLessonNumber = 10 + lessonIndex + 1;
  const lessonSlug = lessonPlan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `lesson-${globalLessonNumber}-${lessonSlug}`,
    title: `${lessonPlan.id} ${lessonPlan.title}`,
    level: 'Beginner A1',
    unit_id: 'unit-2',
    unit_title: 'Unit 2: Places, Objects, Numbers, and Colors',
    lesson_id: 'lesson-2',
    lesson_title: 'Unit 2: Places, Objects, Numbers, and Colors',
    sub_lesson_id: lessonPlan.id,
    sub_lesson_title: lessonPlan.title,
    goal: lessonPlan.goal,
    vocabulary: lessonPlan.new_vocabulary,
    cards,
  };
}

if (plan.unit !== 2 || plan.lessons.length !== 10) {
  throw new Error('The Unit 2 curriculum source must contain exactly ten lessons.');
}

mkdirSync(outputDir, { recursive: true });
for (const [index, lessonPlan] of plan.lessons.entries()) {
  const lesson = buildLesson(lessonPlan, index);
  const filename = `${lesson.sub_lesson_id}_${lesson.sub_lesson_title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}.yaml`;
  writeFileSync(join(outputDir, filename), `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');
  console.log(`${lesson.sub_lesson_id} ${lesson.sub_lesson_title}: ${lesson.cards.length} cards`);
}
