import assert from "node:assert/strict";
import test from "node:test";

import { isMissionLesson, missionChapterProgress, missionProgressPercent } from "../lib/missionExperience.mjs";

function missionLesson(overrides = {}) {
  return {
    id: "any-versioned-mission",
    experience_type: "mission",
    content_revision: 2,
    mission: {
      label: "MISIÓN FINAL",
      title: "¡Todos a la celebración!",
      briefing: "Encuentra a todos y reúne a la familia.",
      kickoff_image_url: "/lesson-assets/reunion-kickoff.webp",
      objectives: ["Encuentra personas", "Sigue sus acciones", "Reúne a la familia"],
      completion_title: "¡Misión cumplida!",
      completion_message: "Toda la familia llegó.",
      chapters: [
        { id: "find", title: "Encuentra", objective: "Encuentra a las personas." },
        { id: "welcome", title: "Reúne", objective: "Reúne a la familia." },
      ],
    },
    cards: [
      { mission_chapter_id: "find" },
      { mission_chapter_id: "find" },
      { mission_chapter_id: "welcome" },
      { mission_chapter_id: "welcome" },
    ],
    ...overrides,
  };
}

test("mission routing validates metadata instead of a lesson ID", () => {
  assert.equal(isMissionLesson(missionLesson()), true);
  assert.equal(isMissionLesson({ id: "lesson-10-family-mission", cards: [] }), false);
  assert.equal(isMissionLesson(missionLesson({ content_revision: undefined })), false);
  assert.equal(
    isMissionLesson(missionLesson({ cards: [{ mission_chapter_id: "unknown" }] })),
    false,
  );
  assert.equal(
    isMissionLesson(missionLesson({
      cards: [
        { mission_chapter_id: "find" },
        { mission_chapter_id: "welcome" },
        { mission_chapter_id: "find" },
      ],
    })),
    false,
  );
});

test("chapter progress follows the authored mission sequence", () => {
  assert.deepEqual(
    missionChapterProgress(missionLesson(), 2).map((chapter) => ({
      completed: chapter.completedCardCount,
      isActive: chapter.isActive,
      isComplete: chapter.isComplete,
      isUnlocked: chapter.isUnlocked,
      range: [chapter.startIndex, chapter.endIndex],
    })),
    [
      { completed: 2, isActive: false, isComplete: true, isUnlocked: true, range: [0, 1] },
      { completed: 0, isActive: true, isComplete: false, isUnlocked: true, range: [2, 3] },
    ],
  );
});

test("the mission meter counts settled beats, not the beat in hand", () => {
  const lesson = { cards: new Array(22) };

  // Nothing is behind the learner on the opening beat.
  assert.equal(missionProgressPercent(lesson, 0, false), 0);
  assert.equal(missionProgressPercent(lesson, 0, true), 5);

  // Reading the card index alone leaves the closing beat short of full, which is
  // the one moment the mission is supposed to look finished.
  assert.equal(missionProgressPercent(lesson, 21, false), 95);
  assert.equal(missionProgressPercent(lesson, 21, true), 100);
});

test("the mission meter stays inside its bounds", () => {
  const lesson = { cards: new Array(4) };

  assert.equal(missionProgressPercent(lesson, -3, false), 0);
  assert.equal(missionProgressPercent(lesson, 9, true), 100);
  assert.equal(missionProgressPercent({ cards: [] }, 0, true), 0);
  assert.equal(missionProgressPercent(undefined, 2, true), 0);
});
