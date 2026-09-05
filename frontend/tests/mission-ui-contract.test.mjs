import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const player = fs.readFileSync(path.join(frontendRoot, "components", "LessonPlayer.js"), "utf8");
const completion = fs.readFileSync(path.join(frontendRoot, "components", "MissionCompletion.js"), "utf8");
const journey = fs.readFileSync(path.join(frontendRoot, "components", "MissionJourney.js"), "utf8");

test("the web player routes the mission from metadata and replaces the stage shell", () => {
  assert.match(player, /const isMissionExperience = isMissionLesson\(activeLesson\)/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
  assert.match(player, /<MissionJourney cardIndex=\{cardIndex\}/);
  assert.match(player, /<MissionCompletion/);
  assert.doesNotMatch(player, />MISIÓN FAMILIAR</);
});

test("lesson entry starts at the top without hijacking card-by-card scrolling", () => {
  assert.match(
    player,
    /useLayoutEffect\(\(\) => \{[\s\S]*?if \(!started \|\| typeof window === "undefined"\) return;[\s\S]*?window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);[\s\S]*?\}, \[activeLesson\.id, started\]\);/
  );
  assert.doesNotMatch(player, /\}, \[activeLesson\.id, cardIndex, started\]\);/);
});

test("mission construction reflows while preserving drag, tap, and recovery", () => {
  assert.match(player, /const missionTileGridColumns = isMobile[\s\S]*?"repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?"repeat\(auto-fit, minmax\(132px, 1fr\)\)"/);
  assert.equal((player.match(/gridTemplateColumns: missionTileGridColumns/g) || []).length, 2);
  assert.match(player, /draggable=\{isMissionTileCard/);
  assert.match(player, /onDrop=\{\(event\) =>/);
  assert.match(player, /onClick=\{isPronunciationCard \? undefined : \(\) => handleChoice\(option\.id\)\}/);
  assert.match(player, /undoMissionSelection/);
  assert.match(player, /resetMissionSelection/);
});

test("mission tiles and journey stay within narrow viewports", () => {
  assert.match(player, /maxWidth: "620px",[\s\S]*?minWidth: 0,[\s\S]*?width: "100%"/);
  assert.match(player, /maxWidth: "100%", minHeight: 44, minWidth: 0, width: "100%"/);
  assert.match(player, /overflowWrap: isMissionTileCard \? "anywhere" : undefined/);
  assert.match(player, /display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: "100%"/);
  assert.match(journey, /maxWidth: "100%",[\s\S]*?minWidth: 0,[\s\S]*?width: "100%"/);
  assert.match(journey, /gridTemplateColumns: isMobile \? "repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.match(journey, /overflowWrap: "anywhere"/);
});

test("mission completion is an immersive resolution without score copy", () => {
  assert.match(player, /isLockedMissionFinale/);
  assert.match(player, /Retrato bloqueado · Completa la última frase/);
  assert.match(completion, /lesson\.mission\.completion_title/);
  assert.match(completion, /lesson\.mission\.completion_message/);
  assert.match(completion, /finalImageUrl/);
  assert.doesNotMatch(completion, /score|puntaje/i);
});
