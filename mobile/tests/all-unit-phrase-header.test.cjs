const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const screenSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/LessonScreen.tsx'), 'utf8');
const cardViewSource = fs.readFileSync(path.join(mobileRoot, 'src/components/LessonCardView.tsx'), 'utf8');
const pronunciationSource = fs.readFileSync(path.join(mobileRoot, 'src/components/PronunciationPractice.tsx'), 'utf8');
const course = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'src/generated/a1-course.json'), 'utf8'));
const guardrails = fs.readFileSync(path.join(repositoryRoot, 'docs/product/project-guardrails.md'), 'utf8');
const verifier = fs.readFileSync(path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'), 'utf8');

const units = new Set(course.map((lesson) => lesson.unit_id));
const cards = course.flatMap((lesson) => lesson.cards);
const stages = new Set(cards.map((card) => card.stage));

assert.equal(course.length, 70, 'The shared phrase-box guardrail must cover all 70 A1 lessons.');
assert.equal(units.size, 7, 'The shared phrase-box guardrail must cover all seven A1 units.');
for (const stage of ['Learn', 'Recognize', 'Listen', 'Speak', 'Use']) {
  assert.ok(stages.has(stage), `The shared phrase-box fixture must include ${stage}.`);
}

assert.doesNotMatch(
  screenSource,
  /PhrasePilot|phrasePilot|pilotLessonContext|pilotReplay|isTheyPhrasePilotCard/,
  'The approved header must not retain slide-specific pilot gates or style names.',
);
assert.match(
  screenSource,
  /styles\.lessonStatusPhraseBox[\s\S]*?<View style=\{styles\.lessonContext\}>[\s\S]*?\{lessonLocation\}[\s\S]*?lessonStageLabel\(lesson\.id, currentCard\.stage\)/,
  'Every card must place lesson and active-section context in the illustrated panel.',
);
assert.match(
  screenSource,
  /styles\.contentHeaderPhraseBox[\s\S]*?styles\.promptRowPhraseBox[\s\S]*?styles\.promptTapTargetPhraseBox/,
  'Every card must use the separate shared importance box for its phrase or instruction.',
);
assert.match(
  screenSource,
  /if \(useCompactHeaderInstruction \|\| !visiblePromptAudio\.trim\(\)\) return;[\s\S]*?openSentenceTranslation\(\);/,
  'Authored English content must translate on one tap while visual instructions remain inert.',
);
assert.match(
  screenSource,
  /const phraseReplayAvailable = isPronunciation[\s\S]*?pronunciationReplayAvailable[\s\S]*?Boolean\(phraseReplayText\)/,
  'Every section must derive speaker availability from its real English replay source.',
);
assert.match(
  screenSource,
  /useCompactRecognizeInstruction && result === 'correct'[\s\S]*?currentCard\.correct_option_id[\s\S]*?playAudio\(phraseReplayText, 'prompt', 'answer'\)/,
  'Empty-prompt Recognize replay must remain locked until correct and then play the correct English choice.',
);
assert.match(
  screenSource,
  /<Pressable[\s\S]*?styles\.phraseReplayButton[\s\S]*?styles\.phraseReplayIcon[\s\S]*?<Ionicons color="#fff" name="volume-high" size=\{16\}/,
  'The same edge-mounted speaker control must render in the shared box.',
);
assert.match(
  screenSource,
  /phraseReplayButton:[\s\S]*?backgroundColor: 'transparent'[\s\S]*?height: 44[\s\S]*?right: -8[\s\S]*?width: 44/,
  'The transparent speaker touch target must keep the approved 44 dp size and outer-right position.',
);
const replayTouchStyle = screenSource.match(
  /phraseReplayButton: \{([\s\S]*?)\n  \},\n  phraseReplayIcon:/,
)?.[1] ?? '';
assert.doesNotMatch(
  replayTouchStyle,
  /borderColor|borderWidth|elevation|shadowColor|shadowOffset|shadowOpacity|shadowRadius/,
  'The speaker touch target must never draw a white cutout, border, elevation, or shadow.',
);
assert.match(
  screenSource,
  /phraseReplayIcon:[\s\S]*?height: 28[\s\S]*?right: 0[\s\S]*?width: 28/,
  'The visible teal speaker must keep the approved 28 dp size.',
);
assert.match(
  screenSource,
  /promptTapTargetPhraseBox: \{ paddingHorizontal: 44 \}/,
  'The importance box must reserve equal space on both sides so long phrases remain centered.',
);
assert.match(
  cardViewSource,
  /onHeaderReplayAvailabilityChange=\{onPronunciationReplayAvailabilityChange\}[\s\S]*?headerReplayRequestId=\{pronunciationReplayRequestId\}/,
  'Speak replay must be routed through the pronunciation player.',
);
assert.match(
  pronunciationSource,
  /phase !== 'listening'[\s\S]*?phase !== 'checking'[\s\S]*?onHeaderReplayAvailabilityChange\?\.\(headerReplayAvailable\)[\s\S]*?playModelEvent\(runIdRef\.current\)/,
  'Speak replay must be disabled during microphone/grading phases and reuse model playback safely.',
);
assert.match(
  guardrails,
  /Every mobile A1 card in all seven units uses the same three-part lesson header[\s\S]*?never key it to a lesson, card index, phrase, answer, image, orientation, or device class/,
  'Durable product memory must define a generic course-wide layout rather than a slide exception.',
);
assert.match(
  guardrails,
  /Every section keeps the same edge-mounted speaker[\s\S]*?transparent 44 dp touch target[\s\S]*?28 dp teal icon/,
  'Durable product memory must define one shared speaker contract.',
);
assert.doesNotMatch(
  guardrails,
  /Lesson 1\.3 portrait `They` phrase-card pilot|pilot-specific treatment/,
  'Durable product memory must not retain the old slide-specific guardrail.',
);
assert.match(
  verifier,
  /node tests\/all-unit-phrase-header\.test\.cjs/,
  'Preview verification must run the generic all-unit phrase-box guardrail.',
);

console.log(`Shared phrase-box checks cover ${cards.length} cards across all 70 lessons and seven units.`);
