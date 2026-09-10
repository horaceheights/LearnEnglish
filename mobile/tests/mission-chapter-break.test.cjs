const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');
const breakSource = fs.readFileSync(
  path.join(mobileRoot, 'src', 'missionChapterBreak.ts'),
  'utf8',
).replace(/\r\n/g, '\n');
const breakComponent = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'MissionChapterBreak.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');
const mission = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-10-family-mission.json'),
  'utf8',
));

// missionChapterBreakForAdvance is plain TypeScript over the lesson shape, so the
// rule it encodes is restated here against the shipped mission rather than
// imported. If the two ever disagree the mission is the one that is right.
function chapterBreakForAdvance(lesson, fromIndex, toIndex) {
  if (toIndex !== fromIndex + 1) return null;
  const doneCard = lesson.cards[fromIndex];
  const nextCard = lesson.cards[toIndex];
  if (!doneCard || !nextCard) return null;
  if (doneCard.mission_chapter_id === nextCard.mission_chapter_id) return null;
  const chapters = lesson.mission.chapters;
  const doneIndex = chapters.findIndex((chapter) => chapter.id === doneCard.mission_chapter_id);
  const nextIndex = chapters.findIndex((chapter) => chapter.id === nextCard.mission_chapter_id);
  if (doneIndex < 0 || nextIndex < 0 || nextIndex <= doneIndex) return null;
  return { actNumber: doneIndex + 1, doneTitle: chapters[doneIndex].title };
}

test('the mission closes an act at every authored chapter boundary', () => {
  const boundaries = [];
  for (let index = 0; index < mission.cards.length - 1; index += 1) {
    const closing = chapterBreakForAdvance(mission, index, index + 1);
    if (closing) boundaries.push({ after: mission.cards[index].slide_id, ...closing });
  }

  assert.equal(
    boundaries.length,
    mission.mission.chapters.length - 1,
    'Every act but the last must close on the beat before the next act begins.',
  );
  assert.deepEqual(
    boundaries.map((entry) => entry.actNumber),
    boundaries.map((_, index) => index + 1),
    'Acts must close in order.',
  );
  for (const entry of boundaries) {
    assert.ok(entry.doneTitle.length > 0, `${entry.after} closed an act with no title.`);
  }
});

test('navigation that is not forward progress stays quiet', () => {
  // Resuming a saved run, or jumping through a picker, lands mid-mission without
  // having just finished anything.
  assert.equal(chapterBreakForAdvance(mission, 0, 5), null, 'A jump is not an act ending.');
  assert.equal(chapterBreakForAdvance(mission, 5, 4), null, 'Going back is not progress.');
  assert.equal(
    chapterBreakForAdvance(mission, mission.cards.length - 1, mission.cards.length),
    null,
    'There is no act after the final beat.',
  );

  const firstChapterId = mission.cards[0].mission_chapter_id;
  const withinAct = mission.cards.findIndex((card, index) => (
    index > 0 && card.mission_chapter_id === firstChapterId
  ));
  assert.ok(withinAct > 0, 'Expected the opening act to span more than one beat.');
  assert.equal(
    chapterBreakForAdvance(mission, withinAct - 1, withinAct),
    null,
    'Beats inside one act must not close it.',
  );
});

test('the act moment closes itself and never traps the learner', () => {
  const visible = breakComponent.match(/const VISIBLE_MS = (\d+);/u);
  assert.ok(visible, 'The moment must time out on its own; the mission runs continuously.');
  // Two short lines and an objective, read without hurrying. It flashed past at
  // half this and the act was gone before it registered.
  assert.ok(
    Number(visible[1]) >= 4000,
    `The act card is only up for ${visible[1]}ms, which is not long enough to read it.`,
  );

  assert.match(
    breakComponent,
    /countdownRun\.start\(\(\{ finished \}\) => \{[\s\S]*?onDoneRef\.current\(\)/u,
    'The countdown bar must be what ends the moment, so the two cannot disagree.',
  );
  assert.match(
    breakComponent,
    /duration: VISIBLE_MS/u,
    'The bar must run for exactly as long as the moment lasts.',
  );
  assert.doesNotMatch(
    breakComponent,
    /setTimeout\(/u,
    'A second timer beside the bar could finish at a different moment than the bar shows.',
  );

  assert.match(breakComponent, /accessibilityRole="button"/u);
  assert.match(breakComponent, /onPress=\{onDone\}/u, 'Tapping must move on early.');
  assert.match(breakComponent, /useReducedMotion\(\)/u);
});

test('the countdown bar fills across the whole moment', () => {
  assert.match(
    breakComponent,
    /outputRange: \['0%', '100%'\]/u,
    'The bar must fill from empty to full so it reads as time running out.',
  );
  assert.match(
    breakComponent,
    /easing: Easing\.linear/u,
    'A linear fill is what makes the bar a truthful clock.',
  );
  assert.match(breakComponent, /countdownTrack/u);
  assert.match(breakComponent, /countdownFill/u);
});

test('the clue waits for the act moment to pass', () => {
  const cueEffect = lessonScreen.slice(
    lessonScreen.indexOf('const timer = setTimeout(() => playMissionCueAt(0), 180);') - 900,
    lessonScreen.indexOf('const timer = setTimeout(() => playMissionCueAt(0), 180);'),
  );
  assert.match(
    cueEffect,
    /\|\| missionChapterBreak/u,
    'A clue that starts under the act card is a clue nobody hears.',
  );
});

test('a fresh run never opens on a stale act card', () => {
  assert.match(lessonScreen, /setMissionChapterBreak\(null\);\n\s*missionChapterBreakFromRef\.current = null;/u);
  assert.match(
    lessonScreen,
    /missionChapterBreak && !isPageTurning \? \(/u,
    'The moment must wait for the page to finish turning.',
  );
  assert.match(
    breakSource,
    /if \(toIndex !== fromIndex \+ 1\) return null;/u,
    'Only a step onto the next beat may close an act.',
  );
});
