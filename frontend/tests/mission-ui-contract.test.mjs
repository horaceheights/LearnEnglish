import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const readComponent = (name) => fs.readFileSync(path.join(frontendRoot, "components", name), "utf8");
const player = readComponent("LessonPlayer.js");
const adventure = readComponent("CelebrationMission.js");
const completion = readComponent("MissionCompletion.js");
const journey = readComponent("MissionJourney.js");

test("mission_game metadata routes Lesson 1.10 into its dedicated adventure surface", () => {
  assert.match(player, /const isMissionExperience = isMissionLesson\(activeLesson\)/);
  assert.match(player, /activeLesson\.cards\.every\(\(card\) => Boolean\(card\?\.mission_game\)\)/);
  assert.match(player, /if \(isMissionGameExperience\) \{[\s\S]*?<CelebrationMission/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
  assert.match(player, /showFinalImage=\{!isMissionGameExperience\}/);
});

test("the mission begins with audible Spanish onboarding before interaction unlocks", () => {
  assert.match(player, /cardAudioAsset\(activeLesson\.cards\[0\], \{ purpose: "mission-intro" \}\)/);
  assert.match(player, /speakText\(activeLesson\.mission\.briefing,[\s\S]*?lang: "es-MX"/);
  assert.match(player, /playUiSfx\("readyCue", \{ debounceMs: 240, restart: true/);
  assert.match(adventure, /Escucha la misión…/);
  assert.match(adventure, /disabled=\{!introReady\}/);
  assert.match(adventure, /Comenzar misión/);
  assert.match(adventure, /tutorial_mode === "guided-no-fail"/);
  assert.match(adventure, /className="mission-guide-hand"/);
});

test("every beat speaks its exact Spanish action and keeps controls locked until ready", () => {
  assert.match(player, /currentCard\.mission_game\.instruction_es/);
  assert.match(player, /purpose: "mission-instruction"/);
  assert.match(player, /setMissionInstructionReady\(false\)/);
  assert.match(player, /const unlock = \(\) => setMissionInstructionReady\(true\)/);
  assert.match(adventure, /interactionReady \? "Tu acción ahora" : "Escucha primero"/);
  assert.match(adventure, /pointerEvents: interactionReady \? "auto" : "none"/);
});

test("mission mechanics dispatch from mission_game.kind instead of one repeated tile board", () => {
  assert.match(adventure, /isDirectSceneMissionKind\(game\.kind\)/);
  assert.match(adventure, /isChoiceMissionKind\(game\.kind\)/);
  assert.match(adventure, /isSpeechMissionKind\(game\.kind\)/);
  assert.match(adventure, /game\.kind === "speak"/);
  assert.match(adventure, /game\.kind === "finale"/);
  assert.match(adventure, /game\.kind === "not-correction"/);
});

test("construction supports drag, tap, native keyboard controls, removal, undo, reset, and check", () => {
  assert.match(adventure, /draggable=\{!choiceGame && interactionReady/);
  assert.match(adventure, /onDragStart=\{\(event\) =>/);
  assert.match(adventure, /onDrop=\{\(event\) =>/);
  assert.match(adventure, /Primero toca una señal\. Después toca su destino\./);
  assert.match(adventure, /aria-label=\{`\$\{target\.label_es\}/);
  assert.match(adventure, /aria-label=\{`Retirar \$\{optionsById/);
  assert.match(adventure, /onClick=\{undo\}/);
  assert.match(adventure, /onClick=\{reset\}/);
  assert.match(adventure, /onClick=\{check\}/);
});

test("wrong checks repair only bad placements without restarting the beat", () => {
  assert.match(adventure, /setPlacements\(result\.retainedPlacements\)/);
  assert.match(adventure, /Retiramos solo lo que no correspondía\. Tus aciertos siguen en su lugar\./);
  assert.match(player, /const recordMissionMisstep =/);
  const misstepBody = player.slice(
    player.indexOf("const recordMissionMisstep ="),
    player.indexOf("const undoMissionSelection =")
  );
  assert.doesNotMatch(misstepBody, /setLastResult\("wrong"\)/);
});

test("normalized hotspots and responsive controls stay inside the available screen", () => {
  assert.match(adventure, /left: `\$\{target\.rect\.x \* 100\}%`/);
  assert.match(adventure, /top: `\$\{target\.rect\.y \* 100\}%`/);
  assert.match(adventure, /height: `\$\{target\.rect\.height \* 100\}%`/);
  assert.match(adventure, /width: `\$\{target\.rect\.width \* 100\}%`/);
  assert.match(adventure, /maxWidth: isMobile \? "min\(100%, calc\(43svh \* 1\.5\)\)" : 900/);
  assert.match(adventure, /overflowX: isMobile \? "auto" : "visible"/);
  assert.match(adventure, /minHeight: 44/);
  assert.match(journey, /gridTemplateColumns: isMobile \? "repeat\(2, minmax\(0, 1fr\)\)"/);
});

test("the celebration adventure and resolution contain no rejected album chrome", () => {
  const missionSurface = [player, adventure, completion, journey].join("\n");
  assert.doesNotMatch(missionSurface, /album|álbum|retrato restaurado|fotos restauradas|página restaurada/i);
  assert.match(completion, /Los cinco actos de la misión están completos/);
  assert.match(completion, /lesson\.mission\.completion_title/);
  assert.match(completion, /lesson\.mission\.objectives/);
  assert.doesNotMatch(completion, /score|puntaje/i);
});

test("lesson entry starts at the top without hijacking card-by-card scrolling", () => {
  assert.match(
    player,
    /useLayoutEffect\(\(\) => \{[\s\S]*?if \(!started \|\| typeof window === "undefined"\) return;[\s\S]*?window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);[\s\S]*?\}, \[activeLesson\.id, started\]\);/
  );
  assert.doesNotMatch(player, /\}, \[activeLesson\.id, cardIndex, started\]\);/);
});
