import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// The web lesson header shares the app's Spanish section names and instructions
// (mobile/src/lessonInstructions.ts) instead of printing English stage names.
const player = fs.readFileSync(new URL("../components/LessonPlayer.js", import.meta.url), "utf8");

test("the web lesson header uses the shared Spanish section names and instructions", () => {
  assert.match(player, /from "\.\.\/\.\.\/mobile\/src\/lessonInstructions";/);
  assert.match(player, /\{lessonStageLabel\(activeLesson\.id, currentCard\.stage\)\}/);
  assert.doesNotMatch(player, /\{currentCard\.stage\}\s*<\/div>/, "the raw English stage name must not render");
  assert.doesNotMatch(player, /"Speak" : "Pronunciation/, "the Speak header uses the Spanish instruction");
  assert.match(player, /\? pronunciationInstruction\(\)\s*: usesCompactListenInstruction\(currentCard\.stage/);
  assert.match(player, /\? listeningChoiceInstruction\(currentCard\.options\)/);
  assert.match(player, /lessonHeaderPromptText\(activeLesson\.id, currentCard\.stage, "", currentCard\.options\)/);
});
