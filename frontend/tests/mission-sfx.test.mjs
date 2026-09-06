import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const player = fs.readFileSync(path.join(frontendRoot, "components", "LessonPlayer.js"), "utf8");
const kickoff = fs.readFileSync(path.join(frontendRoot, "components", "MissionKickoff.js"), "utf8");
const tileBoard = fs.readFileSync(path.join(frontendRoot, "components", "MissionTileBoard.js"), "utf8");
const sfxHook = fs.readFileSync(path.join(frontendRoot, "lib", "useStaticSfx.js"), "utf8");

const staticPaths = [
  "/sfx/tile-place-v1.mp3",
  "/sfx/page-restored-v1.mp3",
  "/sfx/page-turn-v1.mp3",
  "/sfx/ready-cue-v2.mp3",
  "/sfx/voice-stamp-v1.mp3",
  "/sfx/mission-finale-v1.mp3",
  "/sfx/try-again-v1.mp3",
];

test("mission sound effects resolve only to versioned local assets", () => {
  for (const assetPath of staticPaths) assert.match(sfxHook, new RegExp(assetPath.replaceAll("/", "\\/")));
  assert.doesNotMatch(sfxHook, /https?:\/\/|fetch\(|XMLHttpRequest/);
});

test("the shared player prevents overlapping or overstimulating effects", () => {
  assert.match(sfxHook, /prefers-reduced-motion: reduce/);
  assert.match(sfxHook, /MINIMUM_DEBOUNCE_MS = 80/);
  assert.match(sfxHook, /options\.restart === false/);
  assert.match(sfxHook, /activeAudio\.pause\(\)/);
  assert.match(sfxHook, /activeAudio\.currentTime = 0/);
  assert.match(sfxHook, /if \(!enabled \|\| muted\) stop\(\)/);
  assert.match(sfxHook, /return new Promise\(\(resolve\) =>/);
  assert.match(sfxHook, /timeoutId = window\.setTimeout\(cancel/);
});

test("lesson and mission events receive semantic static cues without lesson-ID routing", () => {
  assert.match(player, /useStaticSfx\(\)/);
  assert.match(player, /await playUiSfx\("readyCue"/);
  assert.match(tileBoard, /onPlaySfx\?\.\("tilePlace"\)/);
  assert.match(player, /playUiSfx\("pageTurn", \{ debounceMs: 180, restart: false/);
  assert.match(player, /"missionFinale"[\s\S]*?: "pageRestored"/);
  assert.match(player, /playUiSfx\("voiceStamp"/);
  assert.match(player, /playUiSfx\("tryAgain"/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
  assert.match(kickoff, /onTutorialComplete\?\.\(\)/);
  assert.match(player, /purpose: "mission-intro"/);
  assert.match(player, /audioAssetId: missionIntroAsset\.id/);
});

test("no synthesized UI-tone generator remains in the lesson player", () => {
  assert.doesNotMatch(player, /useTone|playTone|playMediaTone|createOscillator/);
  assert.doesNotMatch(player, /sampleRate = 22050|frequency2|sawtooth/);
});
