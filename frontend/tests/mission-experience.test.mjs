import assert from "node:assert/strict";
import test from "node:test";

import { isMissionLesson, missionChapterProgress } from "../lib/missionExperience.mjs";

function missionLesson(overrides = {}) {
  return {
    id: "any-versioned-mission",
    experience_type: "mission",
    content_revision: 2,
    mission: {
      label: "MISIÓN FINAL",
      title: "El álbum familiar",
      briefing: "Restaura cada página.",
      completion_title: "¡Álbum restaurado!",
      completion_message: "La historia está completa.",
      chapters: [
        { id: "open", title: "Abre", objective: "Abre el álbum." },
        { id: "restore", title: "Restaura", objective: "Restaura la historia." },
      ],
    },
    cards: [
      { mission_chapter_id: "open" },
      { mission_chapter_id: "open" },
      { mission_chapter_id: "restore" },
      { mission_chapter_id: "restore" },
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
        { mission_chapter_id: "open" },
        { mission_chapter_id: "restore" },
        { mission_chapter_id: "open" },
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
