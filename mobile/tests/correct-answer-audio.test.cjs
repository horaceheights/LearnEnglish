const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreen = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/LessonScreen.tsx'),
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
  /const answerText = correctSelectionAudioText\(card\)[\s\S]*?ensureAudioPreloaded\(courseAudioSource\([\s\S]*?answerText/,
  'The correct-answer fallback must preload with the rest of the active card audio.',
);

assert.match(
  lessonScreen,
  /const answerText = correctSelectionAudioText\(currentCard, optionId\)[\s\S]*?playAnswerAfterChime\(answerText\)/,
  'A correct choice must speak the resolved answer after the success chime.',
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
  && card.prompt === 'The man is sitting.'
  && card.correct_option_id === 'man-sitting'
));
assert.ok(repeatedStatementCard, 'Lesson 1.1 must retain the reported Recognize statement card.');
assert.equal(
  repeatedStatementCard.answer_audio_text,
  '',
  'The reported statement card must not opt in to post-answer speech.',
);

const repeatedListenCard = lesson11.cards.find((card) => (
  card.stage === 'Listen'
  && card.audio_text === 'The man is sitting.'
  && card.correct_option_id === 'man-sitting'
));
assert.ok(repeatedListenCard, 'Lesson 1.1 must retain the matching Listen card.');
assert.equal(
  repeatedListenCard.answer_audio_text,
  null,
  'The reported Listen card must not opt in to post-answer speech.',
);

const identityAnswerCard = lesson18.cards.find((card) => (
  card.stage === 'Recognize'
  && card.prompt === 'Who is he?'
  && card.answer_audio_text
));
assert.ok(identityAnswerCard, 'Recognize question cards must retain authored answer audio.');
assert.notEqual(
  identityAnswerCard.answer_audio_text,
  identityAnswerCard.audio_text,
  'Authored question-to-answer audio must add information instead of repeating the prompt.',
);

assert.match(
  interactionVerifier,
  /node tests\/correct-answer-audio\.test\.cjs/,
  'Preview verification must always run the correct-answer audio guardrail.',
);

console.log('Recognize and Listen prompts do not replay; authored post-answer audio remains available.');
