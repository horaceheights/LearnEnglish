import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedMissionPlacements,
  isChoiceMissionKind,
  isDirectSceneMissionKind,
  isSpeechMissionKind,
  validateMissionPlacements,
} from "../components/celebrationMissionLogic.mjs";

const orderedGame = {
  validation: "ordered",
  targets: [
    { id: "first", accepted_option_ids: ["boy"] },
    { id: "second", accepted_option_ids: ["girl"] },
    { id: "third", accepted_option_ids: ["adults"] },
  ],
};

const unorderedGame = {
  validation: "unordered",
  targets: [
    { id: "left", accepted_option_ids: ["father"] },
    { id: "right", accepted_option_ids: ["mother"] },
  ],
};

test("expected placements preserve authored target and option order", () => {
  assert.deepEqual(expectedMissionPlacements(orderedGame), [
    { optionId: "boy", targetId: "first" },
    { optionId: "girl", targetId: "second" },
    { optionId: "adults", targetId: "third" },
  ]);
});

test("an ordered error preserves the complete correct prefix", () => {
  const result = validateMissionPlacements(orderedGame, [
    { optionId: "boy", targetId: "first" },
    { optionId: "adults", targetId: "third" },
  ]);

  assert.equal(result.complete, false);
  assert.equal(result.incorrectCount, 1);
  assert.deepEqual(result.retainedPlacements, [{ optionId: "boy", targetId: "first" }]);
});

test("an unordered error removes only the wrong connection", () => {
  const result = validateMissionPlacements(unorderedGame, [
    { optionId: "father", targetId: "left" },
    { optionId: "mother", targetId: "left" },
  ]);

  assert.equal(result.complete, false);
  assert.equal(result.incorrectCount, 1);
  assert.deepEqual(result.retainedPlacements, [{ optionId: "father", targetId: "left" }]);
});

test("a repaired unordered connection completes in either placement order", () => {
  const result = validateMissionPlacements(unorderedGame, [
    { optionId: "mother", targetId: "right" },
    { optionId: "father", targetId: "left" },
  ]);

  assert.equal(result.complete, true);
  assert.deepEqual(result.expectedOptionIds, ["father", "mother"]);
});

test("all eight mission kinds route into their intended interaction families", () => {
  assert.equal(isDirectSceneMissionKind("hotspot"), true);
  assert.equal(isDirectSceneMissionKind("action-sequence"), true);
  assert.equal(isDirectSceneMissionKind("relationship-link"), false);
  assert.equal(isChoiceMissionKind("not-correction"), true);
  assert.equal(isChoiceMissionKind("who-dialogue"), true);
  assert.equal(isChoiceMissionKind("label-placement"), false);
  assert.equal(isSpeechMissionKind("speak"), true);
  assert.equal(isSpeechMissionKind("finale"), true);
  assert.equal(isSpeechMissionKind("hotspot"), false);
});
