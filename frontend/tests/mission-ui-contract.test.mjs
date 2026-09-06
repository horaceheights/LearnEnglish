import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isMissionTileInteraction } from "../lib/missionExperience.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const player = fs.readFileSync(path.join(frontendRoot, "components", "LessonPlayer.js"), "utf8");
const completion = fs.readFileSync(path.join(frontendRoot, "components", "MissionCompletion.js"), "utf8");
const journey = fs.readFileSync(path.join(frontendRoot, "components", "MissionJourney.js"), "utf8");
const kickoff = fs.readFileSync(path.join(frontendRoot, "components", "MissionKickoff.js"), "utf8");
const tileBoard = fs.readFileSync(path.join(frontendRoot, "components", "MissionTileBoard.js"), "utf8");
const globals = fs.readFileSync(path.join(frontendRoot, "app", "globals.css"), "utf8");
const missionLesson = JSON.parse(fs.readFileSync(
  path.resolve(frontendRoot, "..", "backend", "lessons", "unit_1", "1.10_family_scene_mission.yaml"),
  "utf8",
));

function relativeLuminance(hexColor) {
  const channels = hexColor.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test("the web player routes the mission from metadata and replaces the stage shell", () => {
  assert.match(player, /const isMissionExperience = isMissionLesson\(activeLesson\)/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
  assert.match(player, /<MissionJourney[\s\S]*?cardIndex=\{cardIndex\}/);
  assert.match(player, /<MissionKickoff/);
  assert.match(player, /!missionKickoffComplete/);
  assert.match(player, /<MissionCompletion/);
  assert.doesNotMatch(player, />MISIÓN FAMILIAR</);
  assert.match(player, /"lesson-10-family-mission": \{[\s\S]*?image: "a1_u1_studio_01_clapperboard\.webp"/);
});

test("lesson entry starts at the top without hijacking card-by-card scrolling", () => {
  assert.match(
    player,
    /useLayoutEffect\(\(\) => \{[\s\S]*?if \(!started \|\| typeof window === "undefined"\) return;[\s\S]*?window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);[\s\S]*?\}, \[activeLesson\.id, started\]\);/
  );
  assert.doesNotMatch(player, /\}, \[activeLesson\.id, cardIndex, started\]\);/);
});

test("mission screen changes reset scroll and transfer focus to the new heading", () => {
  assert.match(player, /const missionGameplayHeadingRef = useRef\(null\)/);
  assert.match(player, /const missionCompletionHeadingRef = useRef\(null\)/);
  assert.match(
    player,
    /const heading = isComplete[\s\S]*?missionCompletionHeadingRef\.current[\s\S]*?missionGameplayHeadingRef\.current;[\s\S]*?window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);[\s\S]*?heading\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(player, /\[isComplete, isMissionExperience, missionKickoffComplete, started\]/);
  assert.match(journey, /<h1[\s\S]*?ref=\{headingRef\}[\s\S]*?tabIndex=\{-1\}/);
  assert.match(completion, /<h1[\s\S]*?ref=\{headingRef\}[\s\S]*?tabIndex=\{-1\}/);
  assert.match(player, /headingRef=\{missionGameplayHeadingRef\}/);
  assert.match(player, /headingRef=\{missionCompletionHeadingRef\}/);
});

test("mission construction supports explicit, editable drag and tap recovery", () => {
  assert.match(player, /<MissionTileBoard/);
  assert.match(tileBoard, /data-mission-drop-index=\{index\}/);
  assert.match(tileBoard, /data-mission-bank-drop/);
  assert.match(tileBoard, /onPointerDown=/);
  assert.match(tileBoard, /mission-board__drag-preview/);
  assert.match(tileBoard, /clampMissionDragPreview/);
  assert.match(tileBoard, /window\.addEventListener\("orientationchange", cancelActivePointerDrag\)/);
  assert.match(tileBoard, /releasePointerCapture/);
  assert.match(tileBoard, /onPointerCancel=\{cancelPointerDrag\}/);
  assert.match(tileBoard, /onDragStart=/);
  assert.match(tileBoard, /Comprobar/);
  assert.match(tileBoard, /Deshacer/);
  assert.match(tileBoard, /Reiniciar/);
  assert.match(tileBoard, /Las fichas siguen en su lugar/);
  assert.match(tileBoard, /missionCorrectionHint\(card, placements\)/);
  assert.match(tileBoard, /useEffect\(\(\) => \{[\s\S]*?setPlacements\(emptyBoard\(slotCount\)\)[\s\S]*?\}, \[card, slotCount\]\);/);
  assert.doesNotMatch(tileBoard, /if \(lastResult === "wrong"\) setPlacements/);
});

test("mission tiles and journey stay within narrow viewports", () => {
  assert.match(globals, /\.mission-board \{[\s\S]*?max-width: 720px;[\s\S]*?min-width: 0;[\s\S]*?width: 100%/);
  assert.match(globals, /grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 10\.5rem\), 1fr\)\)/);
  assert.match(globals, /min-height: 48px/);
  assert.match(globals, /\.mission-board__drag-preview \{[\s\S]*?position: fixed;/);
  assert.match(globals, /\.mission-board__drag-preview \{[\s\S]*?pointer-events: none;/);
  assert.match(globals, /\.mission-board__slot \{[\s\S]*?overflow-wrap: normal;[\s\S]*?word-break: normal;/);
  assert.match(globals, /\.mission-board__tile \{[\s\S]*?overflow-wrap: normal;[\s\S]*?word-break: normal;/);
  assert.match(globals, /\.mission-board__slot \{[\s\S]*?font-size: clamp\(1rem,/);
  assert.match(globals, /\.mission-board__tile \{[\s\S]*?font-size: clamp\(1rem,/);
  assert.doesNotMatch(globals, /\.mission-board__(?:slot|tile) \{[^}]*overflow-wrap: anywhere;/);
  assert.match(globals, /@media \(min-width: 641px\) \{[\s\S]*?\.mission-board__slot,[\s\S]*?\.mission-board__tile,[\s\S]*?\.mission-board__drag-preview \{[\s\S]*?font-size: max\(1\.375rem, 22px\);/);
  assert.match(globals, /@media \(max-width: 520px\) \{[\s\S]*?\.mission-board__controls \{[\s\S]*?minmax\(min\(100%, 8rem\), 1fr\)/);
  assert.match(globals, /@media \(max-width: 360px\) \{[\s\S]*?\.mission-board__slots,[\s\S]*?\.mission-board__slots--targets,[\s\S]*?\.mission-board__bank-grid,[\s\S]*?\.mission-board__controls \{[\s\S]*?grid-template-columns: 1fr;/);
  assert.match(journey, /maxWidth: "100%",[\s\S]*?minWidth: 0,[\s\S]*?width: "100%"/);
  assert.match(journey, /gridTemplateColumns: isMobile \? "repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.doesNotMatch(journey, /overflowWrap: "anywhere"/);
  assert.match(globals, /min-height: 100dvh/);
  assert.match(globals, /\.mission-gameplay-page,[\s\S]*?\.mission-completion-page \{[\s\S]*?safe-area-inset-top[\s\S]*?safe-area-inset-bottom/);
  assert.match(globals, /prefers-reduced-motion: reduce/);
});

test("non-tile mission controls expose the authored Spanish instruction", () => {
  const silentInstructionCard = missionLesson.cards.find((card) => (
    !isMissionTileInteraction(card.interaction_type) && !card.audio_text?.trim()
  ));
  assert.ok(silentInstructionCard?.instruction_es?.trim(), "fixture needs an authored silent instruction");
  assert.match(player, /const missionInstructionText = currentCard\?\.instruction_es\?\.trim\(\)/);
  assert.match(player, /\? `\$\{missionInstructionText\} Escuchar pista en inglés\.`[\s\S]*?: missionInstructionText/);
  assert.match(player, /disabled=\{!cardPromptText\.trim\(\) \|\| lastResult === "correct"\}[\s\S]{0,80}?lang="es"/);
  assert.match(player, /\{missionInstructionText\}/);
});

test("mission success copy meets normal-text contrast", () => {
  const outcomeRule = globals.match(/\.mission-board__outcome \{([\s\S]*?)\}/)?.[1] || "";
  const background = outcomeRule.match(/background:\s*(#[0-9a-f]{6})/i)?.[1];
  const foreground = outcomeRule.match(/(?:^|\n)\s*color:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(background && foreground, "success outcome needs explicit, testable colors");
  assert.ok(
    contrastRatio(background, foreground) >= 4.5,
    `success outcome contrast must be at least 4.5:1, got ${contrastRatio(background, foreground).toFixed(2)}:1`,
  );
});

test("mission imagery uses authored visual descriptions and safe viewport shells", () => {
  assert.equal(missionLesson.cards.length, 22);
  assert.equal(
    missionLesson.cards.every((card) => card.visual_description_es?.trim()),
    true,
    "every mission beat needs authored spatial accessibility evidence",
  );
  assert.match(player, /alt=\{isMissionExperience \? currentCard\.visual_description_es : currentCard\.prompt \|\| ""\}/);
  assert.match(completion, /alt=\{finalCard\?\.visual_description_es\}/);
  assert.match(player, /className="mission-completion-page"/);
  assert.match(player, /className=\{isMissionExperience \? "mission-gameplay-page" : undefined\}/);
  assert.doesNotMatch(player, /isMissionExperience \? `Escena visual del reto/);
});

test("authored audio remains reachable on mission tile beats", () => {
  for (const slideId of ["M11", "M19"]) {
    const card = missionLesson.cards.find((item) => item.slide_id === slideId);
    assert.ok(card?.audio_text?.trim(), `${slideId} must retain authored prompt audio`);
    assert.match(card.interaction_type, /^mission-/);
  }
  assert.match(player, /isMissionTileCard && !currentCard\?\.audio_text\?\.trim\(\)/);
  assert.match(player, /currentCard\.audio_text\?\.trim\(\) \? \([\s\S]*?className="mission-tile-prompt-replay"/);
  assert.match(player, /className="mission-tile-prompt-replay"[\s\S]{0,160}?disabled=\{lastResult === "correct"\}/);
  assert.match(player, /spokenPromptKeyRef\.current = promptKey/);
  assert.match(globals, /\.mission-tile-prompt-replay \{[\s\S]*?min-height: 48px;/);
  assert.match(globals, /\.mission-tile-prompt-replay:disabled \{[\s\S]*?cursor: default;[\s\S]*?opacity: 0\.62;/);
});

test("mission answer playback always settles the gated Continue state", () => {
  const replayableAnswerCard = missionLesson.cards.find((card) => (
    card.interaction_type === "mission-sentence"
    && card.audio_text?.trim()
    && card.answer_audio_text?.trim()
  ));
  assert.ok(replayableAnswerCard, "fixture needs a tile beat with prompt and answer audio");
  assert.match(player, /const speechCancellationRef = useRef\(null\)/);
  assert.match(player, /cancelActiveSpeech\(\);[\s\S]*?clearSpeechTimers\(\);/);
  assert.match(player, /onCancel: missionConstruction \? \(\) => finishMissionAnswer\("cancelled"\) : undefined/);
  assert.match(player, /onEnd: missionConstruction \? \(\) => finishMissionAnswer\("ended"\) : undefined/);
  assert.match(player, /missionAnswerWatchdogDelay\(answerSpeechMs\)/);
  assert.match(player, /invalidateMissionAnswerGate\(\);[\s\S]{0,80}?stopSpeech\(\);/);
});

test("target boards retain distractors beyond the number of spatial targets", () => {
  for (const slideId of ["M04", "M20"]) {
    const card = missionLesson.cards.find((item) => item.slide_id === slideId);
    assert.ok(card.mission_targets.length > 0, `${slideId} needs explicit spatial targets`);
    assert.ok(card.options.length > card.mission_targets.length, `${slideId} needs visible distractors`);
    assert.deepEqual(
      card.mission_targets.map((target) => target.correct_option_id),
      card.correct_option_ids,
    );
  }
  assert.match(tileBoard, /const slotCount = targets\.length \|\| correctIds\.length/);
  assert.match(tileBoard, /\{card\.options\.map\(\(option\) =>/);
});

test("three-part visual boards preserve their authored horizontal geometry", () => {
  for (const slideId of ["M19", "M20"]) {
    const card = missionLesson.cards.find((item) => item.slide_id === slideId);
    assert.equal(card.mission_targets.length, 3);
    assert.match(card.visual_description_es, /Tres tomas de izquierda a derecha/i);
  }
  for (const count of [2, 4]) {
    const card = missionLesson.cards.find((item) => item.mission_targets?.length === count);
    assert.ok(card, `fixture needs a ${count}-target board`);
  }
  assert.match(tileBoard, /mission-board__slots--targets-\$\{targets\.length\}/);
  assert.match(globals, /\.mission-board__slots--targets-3 \{[\s\S]*?minmax\(min\(100%, 10\.5rem\), 1fr\)/);
  assert.match(globals, /@media \(max-width: 620px\) \{[\s\S]*?\.mission-board__slots--targets-3 \{[\s\S]*?grid-template-columns: 1fr;/);
});

test("revised mission loop types route by interaction contract, not scene IDs", () => {
  const expectedTileTypes = new Set([
    "mission-finale",
    "mission-match",
    "mission-sentence",
    "mission-truth-stamp",
    "mission-unlock",
  ]);
  const authoredTypes = new Set(missionLesson.cards.map((card) => card.interaction_type));
  for (const interactionType of authoredTypes) {
    assert.equal(
      isMissionTileInteraction(interactionType),
      expectedTileTypes.has(interactionType),
      `${interactionType} must use its generic rendering loop`,
    );
  }
  assert.match(player, /const isMissionTileCard = isMissionTileInteraction\(currentCard\?\.interaction_type\)/);
  assert.doesNotMatch(`${player}\n${tileBoard}`, /slide_id|M19|M20/);
});

test("the studio kickoff explains the goal before any scored card", () => {
  assert.match(kickoff, /import \{ useEffect, useRef, useState \} from "react"/);
  assert.match(kickoff, /const kickoffHeadingRef = useRef\(null\)/);
  assert.match(
    kickoff,
    /useEffect\(\(\) => \{[\s\S]*?kickoffHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)[\s\S]*?\}, \[\]\);/,
  );
  assert.match(kickoff, /<h1[^>]*ref=\{kickoffHeadingRef\}[^>]*tabIndex=\{-1\}/);
  assert.match(kickoff, /Tu trabajo en el set/);
  assert.match(kickoff, /Esta práctica no cuenta puntos/);
  assert.match(kickoff, /data-mission-demo-target/);
  assert.match(kickoff, /data-mission-demo-target[\s\S]{0,160}onClick=\{finishDemo\}/);
  assert.match(kickoff, /data-mission-demo-target[\s\S]{0,120}disabled=\{demoPlaced\}/);
  assert.match(kickoff, /Comenzar reto/);
  assert.match(player, /isMissionExperience && !missionKickoffComplete/);
  assert.ok(
    player.indexOf("if (started && isMissionExperience && !missionKickoffComplete)")
      < player.indexOf("if ((isComplete || !currentCard) && isMissionExperience)"),
  );
  assert.match(player, /\|\| \(isMissionExperience && !missionKickoffComplete\)/);
  assert.match(player, /lastResult !== "correct" \|\| \(isMissionExperience && isMissionTileCard\)/);
  assert.match(player, /missionIntroAsset/);
  assert.match(player, /family: \["fa", "mi", "ly"\]/);
  assert.doesNotMatch(kickoff, /logCardAttempt|setScore|speechSynthesis/);
  assert.doesNotMatch(`${player}\n${kickoff}\n${journey}\n${completion}`, /álbum|album|restaurad/i);
  assert.match(
    globals,
    /@media \(max-width: 30rem\) \{[\s\S]*?\.mission-kickoff__topbar \{[\s\S]*?grid-template-columns: 48px minmax\(0, 1fr\);[\s\S]*?\.mission-kickoff__slate \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?\.mission-kickoff__demo \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
  );
});

test("mission completion is an immersive resolution without score copy", () => {
  assert.match(player, /isLockedMissionFinale/);
  assert.match(player, /Escena final bloqueada · Completa la última frase/);
  assert.match(completion, /lesson\.mission\.completion_title/);
  assert.match(completion, /lesson\.mission\.completion_message/);
  assert.match(completion, /finalImageUrl/);
  assert.match(completion, /lesson\.mission\.chapters\.map/);
  assert.match(completion, /Estreno listo/);
  assert.doesNotMatch(completion, /score|puntaje/i);
});
