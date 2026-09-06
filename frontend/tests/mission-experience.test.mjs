import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMissionDragPreview,
  isMissionLesson,
  isMissionTileInteraction,
  missionAnswerWatchdogDelay,
  missionChapterProgress,
  missionCorrectionHint,
  missionCorrectOptionIds,
  missionTargetsForCard,
} from "../lib/missionExperience.mjs";

test("mission answer watchdog leaves normal playback a generous completion window", () => {
  assert.equal(missionAnswerWatchdogDelay(0), 8000);
  assert.equal(missionAnswerWatchdogDelay(5000), 8000);
  assert.equal(missionAnswerWatchdogDelay(12000), 15000);
  assert.equal(missionAnswerWatchdogDelay(Number.NaN), 8000);
  assert.equal(missionAnswerWatchdogDelay(120000), 60000);
});

test("mission correction identifies the first wrong position and exact contrast", () => {
  const targetCard = {
    options: [
      { id: "boy", label: "A boy." },
      { id: "girl", label: "A girl." },
    ],
    mission_targets: [
      { id: "left", label: "Foto izquierda", correct_option_id: "boy" },
      { id: "right", label: "Foto derecha", correct_option_id: "girl" },
    ],
  };
  assert.equal(
    missionCorrectionHint(targetCard, ["girl", "boy"]),
    "Revisa Foto izquierda: cambia «A girl.» por «A boy.»."
  );

  const sentenceCard = {
    options: [
      { id: "he", label: "He" },
      { id: "is", label: "is" },
      { id: "reading", label: "reading." },
    ],
    correct_option_ids: ["he", "is", "reading"],
  };
  assert.equal(
    missionCorrectionHint(sentenceCard, ["he", "reading", "is"]),
    "Revisa el espacio 2: cambia «reading.» por «is»."
  );
});

test("touch drag previews stay inside the usable viewport", () => {
  const base = {
    grabOffsetX: 30,
    grabOffsetY: 20,
    tileWidth: 120,
    tileHeight: 54,
    viewportLeft: 0,
    viewportTop: 0,
    viewportWidth: 320,
    viewportHeight: 700,
    padding: 8,
  };

  assert.deepEqual(
    clampMissionDragPreview({ ...base, clientX: -40, clientY: -30 }),
    { height: 54, left: 8, top: 8, width: 120 },
  );
  assert.deepEqual(
    clampMissionDragPreview({ ...base, clientX: 400, clientY: 800 }),
    { height: 54, left: 192, top: 638, width: 120 },
  );
  assert.deepEqual(
    clampMissionDragPreview({
      ...base,
      clientX: 30,
      clientY: 20,
      tileHeight: 900,
      tileWidth: 500,
    }),
    { height: 684, left: 8, top: 8, width: 304 },
  );
});

function missionLesson(overrides = {}) {
  return {
    id: "any-versioned-mission",
    experience_type: "mission",
    content_revision: 2,
    mission: {
      label: "MISIÓN FINAL",
      title: "Personas en acción",
      briefing: "Dirige las escenas del reto.",
      completion_title: "¡Reto completado!",
      completion_message: "La producción está lista.",
      chapters: [
        { id: "open", title: "Casting", objective: "Identifica a las personas." },
        { id: "restore", title: "Rodaje", objective: "Construye las escenas." },
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

test("mission tile and target contracts preserve authored spatial order", () => {
  const card = {
    interaction_type: "mission-match",
    options: [
      { id: "boy", label: "A boy" },
      { id: "girl", label: "A girl" },
      { id: "adult", label: "An adult" },
    ],
    correct_option_ids: ["boy", "girl"],
    mission_targets: [
      { id: "portrait-1", label: "Foto 1", correct_option_id: "boy" },
      { id: "portrait-2", label: "Foto 2", correct_option_id: "girl" },
    ],
  };

  assert.deepEqual(missionTargetsForCard(card).map((target) => target.id), ["portrait-1", "portrait-2"]);
  assert.deepEqual(missionCorrectOptionIds(card), ["boy", "girl"]);
  assert.equal(card.options.length > card.mission_targets.length, true);
  assert.equal(isMissionTileInteraction("mission-unlock"), true);
  assert.equal(isMissionTileInteraction("mission-truth-stamp"), true);
  assert.deepEqual(missionTargetsForCard({ ...card, mission_targets: [card.mission_targets[0], card.mission_targets[0]] }), []);
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
