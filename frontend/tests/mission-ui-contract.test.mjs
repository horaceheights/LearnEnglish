import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const readComponent = (name) => fs.readFileSync(path.join(frontendRoot, "components", name), "utf8");
const player = readComponent("LessonPlayer.js");
const mission = readComponent("CelebrationMission.js");
const completion = readComponent("MissionCompletion.js");

test("lesson metadata routes every mission beat into one continuous adventure", () => {
  assert.match(player, /const isMissionExperience = isMissionLesson\(activeLesson\)/);
  assert.match(player, /activeLesson\.cards\.every\(\(card\) => Boolean\(card\?\.mission_game\)\)/);
  assert.match(player, /if \(isMissionGameExperience\) \{[\s\S]*?<CelebrationMission/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
});

test("the kickoff narrates the objective and remains locked until its audio ends", () => {
  assert.match(player, /purpose: "mission-intro"/);
  assert.match(player, /speakText\(activeLesson\.mission\.briefing,[\s\S]*?lang: "es-MX"/);
  assert.match(player, /playUiSfx\("missionStart"/);
  assert.match(mission, /disabled=\{!introReady\}/);
  assert.match(mission, /Listo\. Escucha en inglés y toca la respuesta/);
});

test("active challenges are English-audio driven and never read Spanish answers", () => {
  assert.match(player, /cardAudioTurnSequence\(currentCard, "prompt"\)\?\.\[missionOrder\[cueIndex\] \?\? cueIndex\]/);
  assert.match(player, /playCourseTurnSequence\(\[cueTurn\], \{ onEnd \}\)/);
  assert.match(player, /playMissionEnglishClue\(cueIndex, unlock\)/);
  assert.doesNotMatch(player, /speakText\(currentCard\.mission_game\.instruction_es/);
  assert.match(mission, /onReplayEnglish\(cueIndex\)/);
  assert.match(mission, /disabled=\{locked \|\| solved\}/);
});

test("the game uses large scope-aware tap targets with immediate validation and no worksheet controls", () => {
  assert.match(mission, /className={`target-dot/);
  assert.match(mission, /game\.targets\.map/);
  assert.match(mission, /onComplete\(game\.cues\.map/);
  assert.match(mission, /onReplayEnglish\(nextCue\)/);
  assert.match(mission, /Tus aciertos siguen guardados/);
  assert.match(mission, /height:clamp\(44px,17cqw,58px\)/);
  assert.match(mission, /width:clamp\(66px,24cqw,132px\)/);
  assert.match(mission, /className={`target-dot \$\{collective/);
  assert.doesNotMatch(mission, /draggable|onDragStart|onDrop|Comprobar|Deshacer|Reiniciar/);
});

test("the mission consumes the viewport without lesson scrolling or answer banks", () => {
  assert.match(mission, /height:calc\(100svh - 40px\)/);
  assert.match(mission, /overflow:hidden/);
  assert.match(mission, /\.scene-slot \{[^\n]*flex:1/);
  assert.match(mission, /\.scene \{ aspect-ratio:3\/2/);
  assert.match(mission, /@container \(min-aspect-ratio:3\/2\)/);
  assert.match(mission, /@media \(max-height:600px\) and \(orientation:landscape\)/);
  assert.match(mission, /\.mission-game \{ display:grid/);
  assert.match(mission, /\.mission-shell \{ gap:6px; height:calc\(100svh - 16px\); min-height:0; padding:8px; \}/);
  assert.match(mission, /\.scene \{ aspect-ratio:3\/2;[^\n]*box-sizing:border-box/);
  assert.doesNotMatch(mission, /overflow-y:scroll|overflowY: "auto"/);
  assert.doesNotMatch(mission, /option-bank|answer-bank/);
});

test("four voice gates stay inside the adventure and use real pronunciation state", () => {
  assert.match(mission, /game\.kind === "voice-gate"/);
  assert.match(mission, /<VoiceGateHeader/);
  assert.match(mission, /<VoiceGateConsole/);
  assert.match(mission, /ABRE LA CELEBRACIÓN/);
  assert.match(mission, /Array\.from\(\{ length: total \}/);
  assert.match(mission, /voice-scene-open/);
  assert.match(mission, /speech\.result \? <strong>\{card\.prompt\}/);
  assert.match(mission, /Math\.min\(slotSize\.width - 8, \(slotSize\.height - 8\) \* 1\.5\)/);
  assert.match(mission, /\.mission-voice-game \.scene-slot \{ min-height:0; flex:1; \}/);
  assert.match(mission, /speech\.recording \|\| speech\.scoring/);
  assert.match(mission, /onPrepareSpeech/);
  assert.doesNotMatch(mission, /Tu turno/);
  assert.match(player, /if \(currentCard\.mission_game\.kind === "voice-gate"\) setMissionSpeechReady\(true\)/);
});

test("recall questions switch shots without revealing or playing the grading answer", () => {
  assert.match(mission, /isVoiceGate && speech\.asking[\s\S]*?card\.audio_turns\?\.\[0\]\?\.image_url/);
  assert.match(player, /missionRecall && \(turnSequence\?\.length !== 1/);
  assert.match(player, /turnSequence\[0\]\.turn\.text !== currentCard\.mission_game\.cue_audio_text/);
  assert.match(player, /if \(missionRecall && !isRetry && !missionInstructionReady\) return/);
  assert.match(player, /if \(missionRecall && !isRetry\) \{[\s\S]*?modelOptions\.onEnd\(\)/);
  assert.match(player, /window\.setTimeout\(missionRecall \? \(\) =>/);
  assert.doesNotMatch(mission, /Toca para escuchar otra vez/);
});

test("completion keeps the celebration story and contains no rejected album framing", () => {
  const surface = [player, mission, completion].join("\n");
  assert.doesNotMatch(surface, /album|álbum|retrato restaurado|fotos restauradas|página restaurada/i);
  assert.match(completion, /Los cinco actos de la misión están completos/);
});
