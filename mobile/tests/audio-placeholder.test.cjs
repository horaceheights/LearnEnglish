const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '../src/config.ts');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const frontendLessonPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const generatedRoot = path.resolve(__dirname, '../src/generated');
const configSource = fs.readFileSync(configPath, 'utf8');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const frontendLessonPlayerSource = fs.readFileSync(frontendLessonPlayerPath, 'utf8');
const compiledConfigPath = process.argv[2];

assert.match(
  configSource,
  /throw new Error\('Completion placeholders are visual only and cannot be sent to course audio\.'\)/,
  'The ordinary course-audio URL boundary must reject every completion placeholder.',
);

assert.match(
  configSource,
  /\/api\/audio\/course-completion\.mp3[?]\$\{query\.toString\(\)\}/,
  'Completion prompts must use the dedicated masked-audio endpoint.',
);

assert.match(
  lessonScreenSource,
  /const hasCompletionBlank = hasVisualAudioPlaceholder\(card\.prompt\)[\s\S]*?completionPromptAudioSource\(/,
  'Completion prompts must preload the dedicated masked-audio source.',
);

assert.match(
  lessonScreenSource,
  /if \(!text\.trim\(\) \|\| hasVisualAudioPlaceholder\(text\)\) return;/,
  'The ordinary playback boundary must still refuse raw completion prompts.',
);

assert.match(
  lessonScreenSource,
  /if \(completionPromptSource\) \{[\s\S]*?playAudioSource\(completionPromptSource, 'prompt', 'completion-prompt'\);/,
  'Completion prompt autoplay and replay must use the physically masked source.',
);

assert.match(
  lessonScreenSource,
  /const authoredPromptHasVisualBlank = hasVisualAudioPlaceholder\(currentCard\?\.prompt \?\? ''\);[\s\S]*?authoredPromptHasVisualBlank && !currentCard\?\.audio_text\?\.trim\(\)[\s\S]*?\? currentCard\?\.prompt \?\? ''/,
  'Completion cards with blank audio_text must use the authored visual prompt for autoplay and replay.',
);

assert.match(
  frontendLessonPlayerSource,
  /playAudioUrl\(url, sequenceId\)[\s\S]*?\.catch\(\(error\) => \{[\s\S]*?if \(speechSequenceRef\.current === sequenceId\) \{\s*useFallback\(\);/,
  'Completion endpoint failures must use the placeholder-aware silent fallback, never raw browser TTS.',
);

assert.match(
  frontendLessonPlayerSource,
  /if \(isCompletionPrompt && options\.wordByWord\) \{\s*return useFallback\(\);/,
  'Completion prompts must fail silent before any word-by-word or browser synthesis path.',
);

assert.match(
  frontendLessonPlayerSource,
  /authoredCardPromptHasVisualBlank && !currentCard\.audio_text\?\.trim\(\)[\s\S]*?\? currentCard\.prompt/,
  'Web completion autoplay and replay must fall back to card.prompt when legacy audio_text is blank.',
);

assert.match(
  frontendLessonPlayerSource,
  /\(!isRecognitionLesson && !cardPromptHasVisualBlank\)[\s\S]*?\|\| isPronunciationCard/,
  'Web autoplay must bypass the existing unit-1 gate only for completion cards.',
);

let completionCardCount = 0;
let emptyAudioTextCompletionCardCount = 0;
const completionBlankPositions = { beginning: 0, middle: 0, ending: 0 };
for (const filename of fs.readdirSync(generatedRoot)) {
  if (!filename.endsWith('.json')) continue;
  const payload = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  const lessons = Array.isArray(payload) ? payload : [payload];
  for (const lesson of lessons) for (const card of lesson.cards) {
    const promptAudio = card.audio_text ?? card.prompt ?? '';
    const visualPrompt = card.prompt ?? '';
    if (!/_{2,}|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i.test(visualPrompt)
      && !/_{2,}|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i.test(promptAudio)) continue;
    completionCardCount += 1;
    if (!String(card.audio_text || '').trim()) emptyAudioTextCompletionCardCount += 1;
    const placeholderMatch = visualPrompt.match(
      /_{2,}|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i,
    );
    assert.ok(placeholderMatch, `${filename} must keep the visual blank in card.prompt.`);
    const blankStart = placeholderMatch.index;
    const blankEnd = blankStart + placeholderMatch[0].length;
    if (!visualPrompt.slice(0, blankStart).trim()) {
      completionBlankPositions.beginning += 1;
    } else if (!visualPrompt.slice(blankEnd).replace(/[.,!?;:]/g, '').trim()) {
      completionBlankPositions.ending += 1;
    } else {
      completionBlankPositions.middle += 1;
    }
    assert.ok(
      card.answer_audio_text?.trim(),
      `${filename} has a visual blank without completed answer audio.`,
    );
    assert.doesNotMatch(
      card.answer_audio_text,
      /_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i,
      `${filename} sends a placeholder in completed answer audio.`,
    );
    const correctOption = card.options.find((option) => option.id === card.correct_option_id);
    assert.ok(
      correctOption?.label?.trim(),
      `${filename} cannot build complete answer audio without a labeled correct option.`,
    );
    const completedPrompt = visualPrompt.replace(
      /_{2,}|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i,
      correctOption.label,
    );
    assert.equal(
      card.answer_audio_text,
      completedPrompt,
      `${filename} must preserve the exact full-sentence context used to mask the answer span.`,
    );
  }
}
assert.ok(completionCardCount > 0, 'Generated lessons must exercise completion-audio guardrails.');
assert.ok(emptyAudioTextCompletionCardCount > 0, 'Completion coverage must include legacy blank audio_text cards.');
for (const [position, count] of Object.entries(completionBlankPositions)) {
  assert.ok(count > 0, `Completion coverage must include a ${position} visual blank.`);
}

if (compiledConfigPath) {
  const { completionPromptAudioUrl, courseAudioUrl } = require(path.resolve(compiledConfigPath));
  assert.throws(
    () => courseAudioUrl('It is a ___.'),
    /Completion placeholders are visual only/,
    'Literal underscores must be rejected before the remote audio URL is built.',
  );
  assert.throws(
    () => courseAudioUrl('It is a ...'),
    /Completion placeholders are visual only/,
    'Ellipsis placeholders must be rejected before the remote audio URL is built.',
  );
  assert.doesNotThrow(
    () => courseAudioUrl('It is a park.'),
    'Completed answers without placeholders must remain valid remote audio requests.',
  );

  for (const [visualPrompt, fullText, blankText] of [
    ['___ are reading.', 'They are reading.', 'They'],
    ['Who ___ they?', 'Who are they?', 'are'],
    ['They are a ___.', 'They are a family.', 'family'],
  ]) {
    const url = new URL(completionPromptAudioUrl(
      visualPrompt,
      fullText,
      blankText,
      'prompt',
      'completion-prompt',
      'elevenlabs-premium',
      'female-teacher',
    ));
    assert.equal(url.pathname, '/api/audio/course-completion.mp3');
    assert.equal(url.searchParams.get('visual_prompt'), visualPrompt);
    assert.equal(url.searchParams.get('full_text'), fullText);
    assert.equal(url.searchParams.get('blank_text'), blankText);
    assert.equal(url.searchParams.get('provider'), 'elevenlabs-premium');
  }

  assert.throws(
    () => completionPromptAudioUrl('They are a ___.', 'They are the parents.', 'family'),
    /must match the full completed sentence exactly/,
    'A mismatched full sentence must fail silent before playback.',
  );
  assert.throws(
    () => completionPromptAudioUrl('They ___ a ___.', 'They are a family.', 'are'),
    /requires exactly one visual placeholder/,
    'Multiple placeholders must never reach the masked-audio endpoint.',
  );
}

console.log(`Verified ${completionCardCount} masked visual-blank cards with full completed-prompt context.`);
