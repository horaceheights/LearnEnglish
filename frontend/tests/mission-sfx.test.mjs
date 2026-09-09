import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");
const player = fs.readFileSync(path.join(frontendRoot, "components", "LessonPlayer.js"), "utf8");
const sfxHook = fs.readFileSync(path.join(frontendRoot, "lib", "useStaticSfx.js"), "utf8");

const staticPaths = [
  "/sfx/mission-start-v2.mp3",
  "/sfx/person-found-v2.mp3",
  "/sfx/chapter-arrival-v2.mp3",
  "/sfx/speaking-turn-v3.mp3",
  "/sfx/voice-confirm-v2.mp3",
  "/sfx/mission-finale-v2.mp3",
  "/sfx/gentle-miss-v2.mp3",
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
  assert.match(player, /playUiSfx\("missionStart"/);
  assert.match(player, /playUiSfx\("tilePlace"/);
  assert.match(player, /playUiSfx\("pageTurn", \{ volume: 0\.45/);
  assert.match(player, /onFinish: stopUiSfx/);
  assert.match(player, /"missionFinale"[\s\S]*?: "pageRestored"/);
  assert.match(player, /playUiSfx\("voiceStamp"/);
  assert.match(player, /playUiSfx\("tryAgain"/);
  assert.doesNotMatch(player, /activeLesson\.id === "lesson-10-family-mission"/);
});

test("no synthesized UI-tone generator remains in the lesson player", () => {
  assert.doesNotMatch(player, /useTone|playTone|playMediaTone|createOscillator/);
  assert.doesNotMatch(player, /sampleRate = 22050|frequency2|sawtooth/);
});
