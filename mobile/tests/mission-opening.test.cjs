const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const kickoff = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'MissionKickoff.tsx'), 'utf8');
const journey = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'MissionJourney.tsx'), 'utf8');
const completion = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'MissionCompletion.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'), 'utf8');
const pronunciation = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'PronunciationPractice.tsx'), 'utf8');

assert.match(kickoff, /ESTUDIO EN VIVO/);
assert.match(kickoff, /TOMA 1/);
assert.doesNotMatch(kickoff, /TAKE 1/);
assert.match(kickoff, /presentation\.briefing/);
assert.match(kickoff, /presentation\.chapters\.map/);
assert.match(kickoff, /Esa práctica no cuenta puntos/);
assert.match(kickoff, /No hay forma de fallar/);
assert.match(kickoff, /Enséñame cómo jugar/);
assert.match(kickoff, /Comenzar reto/);
assert.match(kickoff, /tutorialEnabled \? onBeginTutorial : onTutorialComplete/);
assert.match(kickoff, /demoSourceTile[\s\S]*?arrow-down[\s\S]*?demoTarget/);
assert.match(kickoff, /useReducedMotion\(\)/);
assert.match(kickoff, /scrollEnabled=\{!tutorialDragging\}/);
assert.match(kickoff, /height: 48, justifyContent: 'center', width: 48/);
assert.match(kickoff, /missionKickoffTopBarLayout\(width, fontScale\)/);
assert.match(kickoff, /topControlRow/);
assert.match(kickoff, /stackTopBar \? <LiveStudioPill stacked \/> : null/);
assert.match(kickoff, /livePillStacked: \{[^\n]*maxWidth: '100%'/);
assert.match(kickoff, /liveText: \{[^\n]*flexShrink: 1/);
assert.match(kickoff, /AccessibilityInfo\.setAccessibilityFocus\(headingHandle\)/);
assert.match(kickoff, /AccessibilityInfo\.announceForAccessibility\(phaseHeadingLabel\)/);
assert.match(
  kickoff,
  /const previousPhaseRef = useRef<typeof phase \| null>\(null\)/,
  'The initial briefing must receive accessibility focus instead of waiting for the tutorial transition.',
);
assert.match(kickoff, /objectiveText: \{[^\n]*fontSize: 14[^\n]*lineHeight: 19/);
assert.match(kickoff, /assuranceText: \{[^\n]*fontSize: 14[^\n]*lineHeight: 19/);
assert.match(kickoff, /tutorialNote: \{[^\n]*fontSize: 14[^\n]*lineHeight: 19/);

assert.match(screen, /findCourseAudioAsset\([\s\S]*?'mission-intro'[\s\S]*?lesson\.mission\.briefing/);
assert.match(
  screen,
  /missionIntroAutoplayRef\.current = missionIntroAsset\.id;[\s\S]*?playMissionSound\('page-turn'\);[\s\S]*?MISSION_INTRO_SPEECH_DELAY_MS/,
  'The one-time cinematic cue must play before the narrated briefing, with a non-overlapping gap.',
);
assert.match(screen, /missionOpeningPhase !== 'complete'/);
assert.match(screen, /mission_tutorial_mode === 'guided-no-fail'/);
assert.match(screen, /const missionInstruction = missionExperience \? currentCard\?\.instruction_es\?\.trim\(\)/);
assert.match(screen, /const localizedPrompt = useMissionInstruction[\s\S]*?missionInstruction/);
assert.match(screen, /shouldSuppressMissionTilePromptAudio\(currentCard\)/);
assert.match(screen, /const promptAudio = suppressMissionTilePromptAudio[\s\S]*?\? ''/);
assert.match(screen, /completionPromptAsset = promptHasVisualBlank && currentCard && !suppressMissionTilePromptAudio/);
assert.match(screen, /promptHasVisualBlank && !hasDirectPromptAudio/);
assert.match(screen, /!hasDirectPromptAudio && !completionPromptSource && !playablePromptTurnSequence/);
assert.match(screen, /findNodeHandle\(promptTapTargetRef\.current\)/);
assert.match(screen, /AccessibilityInfo\.setAccessibilityFocus\(promptHandle\)/);
assert.match(
  screen,
  /numberOfLines=\{useMissionInstruction \? undefined : 2\}/,
  'Long Spanish mission instructions must wrap to their natural height instead of truncating at two lines.',
);
assert.match(
  screen,
  /needsAccessibleScrolling \|\| isMissionTileCard \|\| \(missionExperience && viewportHeight < 860\)/,
  'Mission construction cards must grow inside the scroll-safe lesson surface.',
);
assert.match(screen, /setMissionOpeningPhase\('tutorial'\)/);
assert.match(screen, /setMissionOpeningPhase\('complete'\)/);
assert.match(screen, /playMissionSound\('tile-place'\)/);
assert.match(screen, /playMissionSound\('page-restored'\)/);
assert.doesNotMatch(kickoff, /registerCard|logCardAttempt|setScore/);

assert.match(journey, /ESCENA/);
assert.match(journey, /videocam/);
assert.match(journey, /Progreso de escenas/);
assert.match(journey, /labelCompact: \{ fontSize: 16, lineHeight: 20 \}/);
assert.match(journey, /titleCompact: \{ fontSize: 20, lineHeight: 24 \}/);
assert.match(journey, /chapterTitleCompact: \{ fontSize: 16, lineHeight: 20 \}/);
assert.match(journey, /objectiveCompact: \{ fontSize: 16, lineHeight: 21 \}/);
assert.match(journey, /activeChapter\?\.objective[\s\S]*?Escena \$\{step\} de \$\{total\}/);
assert.match(completion, /finalImageUrl \?/);
assert.match(completion, /finalImageAccessibilityLabel\?\.trim\(\)/);
assert.match(completion, /<Image[\s\S]*?accessible[\s\S]*?accessibilityRole="image"/);
assert.match(completion, /findNodeHandle\(completionHeadingRef\.current\)/);
assert.match(completion, /AccessibilityInfo\.setAccessibilityFocus\(headingHandle\)/);
assert.match(completion, /AccessibilityInfo\.announceForAccessibility\(completionAnnouncement\)/);
assert.match(completion, /restoredTitle: \{[^\n]*fontSize: 16/);
assert.match(completion, /restoredText: \{[^\n]*fontSize: 14/);
assert.match(screen, /finalImageAccessibilityLabel=\{lesson\.cards\[lesson\.cards\.length - 1\]\?\.visual_description_es\}/);
assert.match(completion, /TOMA APROBADA/);
assert.match(completion, /presentation\.chapters\.map/);
assert.match(completion, /chapter\.objective/);
assert.match(
  fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'LessonCardView.tsx'), 'utf8'),
  /card\.success_outcome_es\?\.trim\(\) \|\| 'Correcto/,
);
assert.match(pronunciation, /passed && successMessage\?\.trim\(\)/);
assert.doesNotMatch(`${kickoff}\n${journey}\n${completion}\n${screen}`, /album|a1_u1_album/i);

console.log('Mission opening and studio-shell checks passed.');
