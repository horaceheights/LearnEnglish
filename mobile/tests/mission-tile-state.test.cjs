const assert = require('node:assert/strict');
const path = require('node:path');

const {
  insertMissionTile,
  isGuidedNoFailMissionCard,
  isMissionTileInteraction,
  missionTileBoardCanCheck,
  missionTileBoardIsCorrect,
  missionKickoffTopBarLayout,
  missionTileSlotWidthForCard,
  missionTargetImageMaxHeightForCard,
  moveMissionTile,
  moveMissionTileForCard,
  orderedMissionCorrectIds,
  placeMissionTileForCard,
  removeMissionTile,
  removeMissionTileForCard,
  sanitizeMissionTileSlots,
  shouldSuppressMissionTilePromptAudio,
} = require(process.argv[2]);
const mission = require(path.resolve(__dirname, '../src/generated/lesson-10-family-mission.json'));

function card(overrides = {}) {
  return {
    interaction_type: 'mission-sentence',
    prompt: '',
    stage: 'Use',
    correct_option_id: 'a',
    correct_option_ids: ['a', 'b', 'c'],
    options: ['a', 'b', 'c', 'd'].map((id) => ({ id, image_url: '', label: id.toUpperCase() })),
    audio_text: null,
    answer_audio_text: null,
    prompt_image_url: '',
    audio_assets: [],
    ...overrides,
  };
}

assert.deepEqual(insertMissionTile([null, null, null], 'b', 0, 'sequence'), ['b', null, null]);
assert.deepEqual(insertMissionTile(['b', 'c', null], 'a', 1, 'sequence'), ['b', 'a', 'c']);
assert.deepEqual(moveMissionTile(['a', 'b', 'c'], 2, 0, 'sequence'), ['c', 'a', 'b']);
assert.deepEqual(removeMissionTile(['a', 'b', 'c'], 1, 'sequence'), ['a', 'c', null]);

assert.deepEqual(insertMissionTile(['a', null, 'c'], 'b', 1, 'targets'), ['a', 'b', 'c']);
assert.deepEqual(moveMissionTile(['a', 'b', 'c'], 0, 2, 'targets'), ['c', 'b', 'a']);
assert.deepEqual(removeMissionTile(['a', 'b', 'c'], 1, 'targets'), ['a', null, 'c']);
assert.deepEqual(insertMissionTile(['a', 'b', null], 'd', 0, 'targets'), ['d', 'b', null]);

const targetCard = card({
  interaction_type: 'mission-match',
  mission_targets: [
    { id: 'left', label: 'Foto izquierda', correct_option_id: 'b' },
    { id: 'middle', label: 'Foto central', correct_option_id: 'a' },
    { id: 'right', label: 'Foto derecha', correct_option_id: 'c' },
  ],
});
assert.deepEqual(orderedMissionCorrectIds(targetCard), ['b', 'a', 'c']);
assert.equal(missionTileBoardIsCorrect(targetCard, ['b', 'a', 'c']), true);
assert.equal(missionTileBoardIsCorrect(targetCard, ['a', 'b', 'c']), false);
assert.deepEqual(
  sanitizeMissionTileSlots(['b', 'missing', 'b'], targetCard),
  ['b', null, null],
  'Resume hydration must reject missing and duplicate option IDs without shifting target positions.',
);

['mission-unlock', 'mission-match', 'mission-sentence', 'mission-truth-stamp', 'mission-finale']
  .forEach((interaction) => assert.equal(isMissionTileInteraction(interaction), true));
assert.equal(isMissionTileInteraction('image-choice'), false);

assert.equal(missionKickoffTopBarLayout(320, 1), 'stacked');
assert.equal(missionKickoffTopBarLayout(360, 1), 'stacked');
assert.equal(missionKickoffTopBarLayout(390, 1), 'inline');
assert.equal(missionKickoffTopBarLayout(390, 1.16), 'stacked');

const guidedCard = card({
  interaction_type: 'mission-unlock',
  mission_tutorial_mode: 'guided-no-fail',
});
assert.equal(isGuidedNoFailMissionCard(guidedCard), true);
assert.deepEqual(
  placeMissionTileForCard(guidedCard, [null, null, null], 'b', 0),
  [null, null, null],
  'A wrong guided tile must be a neutral no-op.',
);
assert.deepEqual(
  placeMissionTileForCard(guidedCard, [null, null, null], 'a', 1),
  [null, null, null],
  'A guided tile cannot skip the next sequential slot.',
);
const guidedFirst = placeMissionTileForCard(guidedCard, [null, null, null], 'a', 0);
const guidedSecond = placeMissionTileForCard(guidedCard, guidedFirst, 'b', 1);
const guidedComplete = placeMissionTileForCard(guidedCard, guidedSecond, 'c', 2);
assert.deepEqual(guidedFirst, ['a', null, null]);
assert.deepEqual(guidedComplete, ['a', 'b', 'c']);
assert.equal(missionTileBoardCanCheck(guidedCard, guidedComplete), true);
assert.equal(missionTileBoardCanCheck(guidedCard, ['a', 'c', 'b']), false);
assert.equal(
  missionTileBoardCanCheck(card(), ['c', 'b', 'a']),
  true,
  'A normal challenge board remains checkable when full so it can teach through feedback.',
);
assert.deepEqual(
  moveMissionTileForCard(guidedCard, guidedComplete, 0, 2),
  guidedComplete,
  'Reordering a guided correct construction must be neutral.',
);
assert.deepEqual(
  removeMissionTileForCard(guidedCard, guidedComplete, 0),
  guidedComplete,
  'Only the last guided tile can be removed, preserving the correct prefix.',
);
assert.deepEqual(removeMissionTileForCard(guidedCard, guidedComplete, 2), ['a', 'b', null]);
assert.deepEqual(
  sanitizeMissionTileSlots(['a', 'c', 'b'], guidedCard),
  ['a', null, null],
  'A resumed guided board must retain only its correct prefix.',
);

const shortSequence = card({
  correct_option_ids: ['who', 'is', 'he'],
  options: ['who', 'is', 'he'].map((id) => ({ id, image_url: '', label: id.toUpperCase() })),
});
assert.equal(missionTileSlotWidthForCard(shortSequence, 390, 1), '31%');
assert.equal(missionTileSlotWidthForCard(shortSequence, 412, 1.15), '31%');
assert.equal(missionTileSlotWidthForCard(shortSequence, 360, 1), '100%');
assert.equal(missionTileSlotWidthForCard(shortSequence, 390, 1.16), '100%');

for (const slideId of ['M01', 'M09']) {
  const missionCard = mission.cards.find((candidate) => candidate.slide_id === slideId);
  assert.ok(missionCard, `${slideId} must remain in the embedded mission.`);
  assert.equal(
    missionTileSlotWidthForCard(missionCard, 390, 1),
    '31%',
    `${slideId} must show its three short ordered chunks on one representative phone row.`,
  );
}

for (const slideId of ['M08', 'M09', 'M22']) {
  const missionCard = mission.cards.find((candidate) => candidate.slide_id === slideId);
  assert.ok(missionCard, `${slideId} must remain in the embedded mission.`);
  assert.equal(
    shouldSuppressMissionTilePromptAudio(missionCard),
    true,
    `${slideId} must not expose a silent completion-prompt as a broken pre-answer audio control.`,
  );
}
const authoredQuestionCard = mission.cards.find((candidate) => candidate.slide_id === 'M11');
assert.ok(authoredQuestionCard, 'M11 must remain in the embedded mission.');
assert.equal(
  authoredQuestionCard.audio_text,
  'Who are they?',
  'M11 must keep the authored spoken question rather than inheriting its completed answer.',
);
assert.equal(
  shouldSuppressMissionTilePromptAudio(authoredQuestionCard),
  false,
  'M11 must preserve its authored “Who are they?” prompt before construction.',
);

const compactMissionCard = mission.cards.find((candidate) => candidate.slide_id === 'M01');
assert.equal(
  missionTargetImageMaxHeightForCard(compactMissionCard, 390, 800, 1, false),
  null,
  'A single-scene sequence keeps the compact mission-image treatment.',
);
for (const slideId of ['M04', 'M16', 'M19', 'M20']) {
  const missionCard = mission.cards.find((candidate) => candidate.slide_id === slideId);
  assert.ok(missionCard, `${slideId} must remain in the embedded mission.`);
  const imageHeight = missionTargetImageMaxHeightForCard(missionCard, 390, 800, 1, false);
  assert.ok(imageHeight > 200, `${slideId} must materially exceed the old 150dp image cap.`);
  const derivedFrameWidth = ((imageHeight - 24) * (3 / 2)) + 24;
  assert.ok(
    derivedFrameWidth <= 342,
    `${slideId} must keep its 3:2 frame inside the 390dp portrait viewport.`,
  );
}
const multiPanelMissionCard = mission.cards.find((candidate) => candidate.slide_id === 'M04');
const normalMultiPanelHeight = missionTargetImageMaxHeightForCard(
  multiPanelMissionCard,
  390,
  800,
  1,
  false,
);
assert.ok(
  missionTargetImageMaxHeightForCard(multiPanelMissionCard, 844, 390, 1, false) > 200,
  'A multi-panel still remains legible in phone landscape without exceeding its height budget.',
);
assert.ok(
  missionTargetImageMaxHeightForCard(multiPanelMissionCard, 720, 1024, 1, false) > 400,
  'A multi-panel still should use materially more tablet width.',
);
assert.ok(
  missionTargetImageMaxHeightForCard(multiPanelMissionCard, 390, 800, 1.3, false) < normalMultiPanelHeight,
  'Enlarged text reserves more of the scroll entry viewport for controls.',
);
assert.ok(
  missionTargetImageMaxHeightForCard(multiPanelMissionCard, 390, 800, 1, true) < normalMultiPanelHeight,
  'Opening help makes room without changing the image aspect ratio.',
);

const longThreeTileSequence = card({
  correct_option_ids: ['subject', 'verb', 'object'],
  options: [
    { id: 'subject', image_url: '', label: 'The grandfather' },
    { id: 'verb', image_url: '', label: 'is talking to' },
    { id: 'object', image_url: '', label: 'the grandchildren' },
  ],
});
assert.equal(missionTileSlotWidthForCard(longThreeTileSequence, 390, 1), '47%');
assert.equal(missionTileSlotWidthForCard(longThreeTileSequence, 720, 1), '47%');
assert.equal(
  missionTileSlotWidthForCard(targetCard, 390, 1),
  '47%',
  'Three local targets must keep the readable two-column mapping layout.',
);
assert.equal(
  missionTileSlotWidthForCard(targetCard, 719, 1),
  '47%',
  'Three local targets must not enter the tablet row before the reviewed width threshold.',
);
assert.equal(
  missionTileSlotWidthForCard(targetCard, 720, 1),
  '31%',
  'Three local targets must align in one row with a three-panel image when tablet width permits it.',
);
for (const slideId of ['M06', 'M16', 'M19', 'M20']) {
  const missionCard = mission.cards.find((candidate) => candidate.slide_id === slideId);
  assert.equal(
    missionTileSlotWidthForCard(missionCard, 720, 1),
    '31%',
    `${slideId} must align its three local targets in one tablet row.`,
  );
}

const fiveTileSequence = card({ correct_option_ids: ['a', 'b', 'c', 'd', 'e'] });
assert.equal(missionTileSlotWidthForCard(fiveTileSequence, 720, 1), '31%');

console.log('Mission tile state checks passed.');
