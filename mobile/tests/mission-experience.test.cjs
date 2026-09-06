const assert = require('node:assert/strict');
const path = require('node:path');

const {
  isMissionLesson,
  lessonNavigationGroups,
  missionChapterProgress,
} = require(process.argv[2]);

function missionLesson(overrides = {}) {
  return {
    id: 'lesson-mission',
    title: 'Family mission',
    level: 'A1',
    goal: 'Complete the family mission.',
    vocabulary: [],
    experience_type: 'mission',
    content_revision: 2,
    mission: {
      label: 'Final mission',
      title: 'Find the family',
      briefing: 'Follow the clues.',
      completion_title: 'Mission complete',
      completion_message: 'You found the family.',
      chapters: [
        { id: 'arrival', title: 'Arrival', objective: 'Meet the family.' },
        { id: 'clues', title: 'Clues', objective: 'Identify each person.' },
        { id: 'message', title: 'Message', objective: 'Build the message.' },
      ],
    },
    cards: [
      { mission_chapter_id: 'arrival' },
      { mission_chapter_id: 'arrival' },
      { mission_chapter_id: 'clues' },
      { mission_chapter_id: 'message' },
      { mission_chapter_id: 'message' },
    ],
    ...overrides,
  };
}

const lesson = missionLesson();
assert.equal(isMissionLesson(lesson), true, 'Mission routing must use experience_type metadata.');
assert.equal(
  isMissionLesson(missionLesson({ content_revision: undefined })),
  false,
  'A versioned mission shell must not accept missing revision metadata.',
);
assert.equal(
  isMissionLesson({ ...lesson, experience_type: undefined, mission: undefined }),
  false,
  'Standard lessons must not enter the mission shell.',
);
assert.equal(
  isMissionLesson(missionLesson({ mission: { ...lesson.mission, chapters: [] } })),
  false,
  'A mission with no declared chapters must fail closed.',
);
assert.equal(
  isMissionLesson(missionLesson({
    cards: [{ mission_chapter_id: 'not-declared' }],
  })),
  false,
  'A mission card assigned to an unknown chapter must fail closed.',
);
assert.equal(
  isMissionLesson(missionLesson({
    cards: [
      { mission_chapter_id: 'arrival' },
      { mission_chapter_id: 'clues' },
      { mission_chapter_id: 'arrival' },
      { mission_chapter_id: 'message' },
    ],
  })),
  false,
  'Mission chapter runs must follow declared order without returning to an earlier chapter.',
);

const progress = missionChapterProgress(lesson, 2, new Set([0, 1]), 2);
assert.deepEqual(
  progress.map((chapter) => ({
    id: chapter.id,
    range: [chapter.startIndex, chapter.endIndex],
    count: chapter.cardCount,
    completed: chapter.completedCardCount,
    active: chapter.isActive,
    complete: chapter.isComplete,
    unlocked: chapter.isUnlocked,
  })),
  [
    {
      id: 'arrival', range: [0, 1], count: 2, completed: 2,
      active: false, complete: true, unlocked: true,
    },
    {
      id: 'clues', range: [2, 2], count: 1, completed: 0,
      active: true, complete: false, unlocked: true,
    },
    {
      id: 'message', range: [3, 4], count: 2, completed: 0,
      active: false, complete: false, unlocked: false,
    },
  ],
  'Chapter progress must derive ordered ranges and state from data, not a lesson ID.',
);

assert.deepEqual(
  missionChapterProgress({ ...lesson, experience_type: undefined, mission: undefined }, 0, new Set()),
  [],
  'Standard lessons must keep the standard journey path.',
);

assert.deepEqual(
  lessonNavigationGroups(lesson),
  [
    {
      cardIndexes: [0, 1], description: 'Meet the family.', id: 'arrival',
      kind: 'chapter', label: 'Arrival',
    },
    {
      cardIndexes: [2], description: 'Identify each person.', id: 'clues',
      kind: 'chapter', label: 'Clues',
    },
    {
      cardIndexes: [3, 4], description: 'Build the message.', id: 'message',
      kind: 'chapter', label: 'Message',
    },
  ],
  'Mission navigation must follow declared chapter order and group cards by chapter metadata.',
);

assert.deepEqual(
  lessonNavigationGroups({
    id: 'standard',
    title: 'Standard lesson',
    level: 'A1',
    goal: 'Practice.',
    vocabulary: [],
    cards: [
      { stage: 'Learn' },
      { stage: 'Recognize' },
      { stage: 'Learn' },
    ],
  }),
  [
    { cardIndexes: [0, 2], id: 'Learn', kind: 'stage', label: 'Learn' },
    { cardIndexes: [1], id: 'Recognize', kind: 'stage', label: 'Recognize' },
  ],
  'Standard QA navigation must retain its existing stage grouping and first-seen order.',
);

const course = require(path.resolve(__dirname, '../src/generated/a1-course.json'));
const unitOneMission = course.find((candidate) => candidate.sub_lesson_id === '1.10');
assert.ok(unitOneMission, 'The embedded Unit 1 mission must be available to mobile QA.');
assert.deepEqual(
  lessonNavigationGroups(unitOneMission).map((group) => ({
    cardIndexes: group.cardIndexes,
    label: group.label,
  })),
  [
    { cardIndexes: [0, 1, 2, 3, 4], label: 'Llamado a casting' },
    { cardIndexes: [5, 6, 7, 8, 9, 10, 11, 12], label: 'Arma el elenco' },
    { cardIndexes: [13, 14, 15, 16, 17, 18, 19], label: 'Graba y edita' },
    { cardIndexes: [20, 21], label: 'Última toma y estreno' },
  ],
  'Engine QA must expose all four live-studio challenge chapters in story order with global card indexes.',
);

console.log('Mission experience helper checks passed.');
