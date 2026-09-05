const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreen = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/LessonScreen.tsx'),
  'utf8',
);
const pronunciationPractice = fs.readFileSync(
  path.resolve(__dirname, '../src/components/PronunciationPractice.tsx'),
  'utf8',
);
const guardrails = fs.readFileSync(
  path.resolve(__dirname, '../../docs/product/project-guardrails.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.resolve(__dirname, '../scripts/verify-interaction-paths.ps1'),
  'utf8',
);
const lesson11 = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../src/generated/lesson-1-people-actions.json'),
  'utf8',
));
const lesson18 = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../src/generated/lesson-8-who.json'),
  'utf8',
));

assert.match(
  lessonScreen,
  /function correctSelectionAudioText[\s\S]*?const authoredAnswer = card\.answer_audio_text\?\.trim\(\)[\s\S]*?if \(authoredAnswer\) return authoredAnswer;[\s\S]*?if \(card\.stage === 'Recognize' \|\| card\.stage === 'Listen'\) return '';[\s\S]*?selectedOption\?\.label\?\.trim\(\)/,
  'Recognize and Listen must use only authored post-answer audio while other stages may use the correct-label fallback.',
);

assert.match(
  lessonScreen,
  /const preloadCardAudio = useCallback\(\(card\?: LessonCard\) => \{[\s\S]*?card\.audio_assets\.map\(async \(asset\) => \{[\s\S]*?cacheCourseAudioAsset\(asset\);[\s\S]*?ensureAudioPreloaded\(lessonAudioAssetSource\(asset\)\)/,
  'Every card-bound answer asset must cache and preload through its persistent asset ID.',
);

assert.match(
  lessonScreen,
  /const purpose = variant === 'answer' \? 'answer' : 'prompt';[\s\S]*?findCourseAudioAsset\(card, purpose, mode, variant, text\)[\s\S]*?playAudioSource\(lessonAudioAssetSource\(asset\), mode, variant\)/,
  'Answer playback must resolve the active card answer asset locally first and never synthesize from text.',
);

assert.match(
  lessonScreen,
  /const playAnswerAfterChime = useCallback\(\(text: string\) => \{[\s\S]*?playAudio\(text, 'prompt', 'answer'\);/,
  'The post-chime answer path must select the persistent answer variant.',
);

assert.match(
  lessonScreen,
  /const answerText = correctSelectionAudioText\(currentCard, optionId\)[\s\S]*?playAnswerAfterChime\(answerText\)/,
  'A correct choice must speak the resolved answer after the success chime.',
);

assert.match(
  lessonScreen,
  /const playSuccessChime = useCallback\(async \(\) => \{[\s\S]*?await setAudioModeAsync\(\{[\s\S]*?allowsRecording: false,[\s\S]*?playsInSilentMode: true,[\s\S]*?\}\);[\s\S]*?await successChimePlayer\.seekTo\(0\);[\s\S]*?successChimePlayer\.play\(\)/,
  'The success chime must establish audible playback mode before seeking or playing on tablets.',
);

assert.match(
  pronunciationPractice,
  /phase !== 'success'[\s\S]*?setAudioModeAsync\(\{[\s\S]*?allowsRecording: false,[\s\S]*?playsInSilentMode: true,[\s\S]*?\}\)[\s\S]*?successChimePlayer\.seekTo\(0\)[\s\S]*?successChimePlayer\.play\(\)/,
  'The pronunciation success chime must leave recording mode before playing on tablets.',
);

assert.match(
  guardrails,
  /When a Recognize statement is spoken before the learner chooses its matching image[\s\S]*?without replaying that same statement/,
  'Non-repeating Recognize confirmation must remain durable mobile product memory.',
);
assert.match(
  guardrails,
  /After a correct choice, play the success cue but do not replay the same prompt/,
  'Non-repeating Listen confirmation must remain durable mobile product memory.',
);

const repeatedStatementCard = lesson11.cards.find((card) => (
  card.stage === 'Recognize'
  && card.prompt === 'He is a man.'
  && card.correct_option_id === 'man-alt'
));
assert.ok(repeatedStatementCard, 'Lesson 1.1 must retain a representative Recognize statement card.');
assert.equal(
  repeatedStatementCard.answer_audio_text,
  null,
  'The representative statement card must not opt in to post-answer speech.',
);

const repeatedListenCard = lesson11.cards.find((card) => (
  card.stage === 'Listen'
  && card.audio_text === 'He is a man.'
  && card.correct_option_id === 'man-base'
));
assert.ok(repeatedListenCard, 'Lesson 1.1 must retain the matching Listen card.');
assert.equal(
  repeatedListenCard.answer_audio_text,
  null,
  'The reported Listen card must not opt in to post-answer speech.',
);

const questionCard = lesson18.cards.find((card) => card.slide_id === 'R1');
const identityCard = lesson18.cards.find((card) => card.slide_id === 'R2');
assert.ok(questionCard && identityCard, 'Recognize must retain separate question and identity cards.');
assert.equal(questionCard.prompt, '', 'The question-form choice must not reveal the answer upfront.');
assert.equal(questionCard.audio_text, null, 'The question must play only after the learner selects it.');
assert.equal(questionCard.answer_audio_text, 'Who is he?', 'Correct selection must speak the visitor question.');
assert.equal(identityCard.audio_text, 'He is the father.', 'The following card must introduce the identity answer.');
assert.equal(identityCard.answer_audio_text, null, 'The identity prompt must not replay after selection.');

assert.match(
  interactionVerifier,
  /node tests\/correct-answer-audio\.test\.cjs/,
  'Preview verification must always run the correct-answer audio guardrail.',
);

console.log('Recognize and Listen prompts do not replay; authored post-answer audio remains available.');
