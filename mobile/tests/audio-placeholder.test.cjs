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
  /\/api\/audio\/assets\/\$\{encodeURIComponent\(assetId\)\}\.mp3/,
  'Mobile course audio must resolve immutable persistent asset IDs.',
);

assert.doesNotMatch(
  configSource,
  /\/api\/audio\/course(?:-completion)?\.mp3/,
  'Mobile must not retain a learner-facing live TTS URL.',
);

assert.match(
  lessonScreenSource,
  /card\.audio_assets\.map\(\(asset\) => ensureAudioPreloaded\(courseAudioAssetSource\(asset\)\)\)/,
  'Preloading must read only the assets already bound to the card.',
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
  /if \(options\.audioAssetId\) \{[\s\S]*?Never substitute a different[\s\S]*?return 0;/,
  'Missing persistent card audio must fail silent instead of using browser TTS.',
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
const persistentAssetIds = new Set();
const completionBlankPositions = { beginning: 0, middle: 0, ending: 0 };
for (const filename of fs.readdirSync(generatedRoot)) {
  if (filename !== 'a1-course.json') continue;
  const payload = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  const lessons = Array.isArray(payload) ? payload : [payload];
  for (const lesson of lessons) for (const card of lesson.cards) {
    assert.ok(card.audio_assets?.length, `${filename} has a card without persistent audio assets.`);
    for (const asset of card.audio_assets) {
      assert.ok(!persistentAssetIds.has(asset.id), `${filename} repeats persistent asset ID ${asset.id}.`);
      persistentAssetIds.add(asset.id);
      assert.ok(
        asset.image_ref === card.prompt_image_url
          || card.options.some((option) => option.image_url === asset.image_ref)
          || asset.image_ref.startsWith('text-only:'),
        `${filename} has audio that is not bound to the card's canonical visual.`,
      );
    }
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
  const { courseAudioAssetUrl } = require(path.resolve(compiledConfigPath));
  const url = new URL(courseAudioAssetUrl('lesson-test-c001-prompt-1234567890abcdef'));
  assert.equal(url.pathname, '/api/audio/assets/lesson-test-c001-prompt-1234567890abcdef.mp3');
  assert.ok(url.searchParams.get('key'));
}

console.log(`Verified ${completionCardCount} visual-blank cards with validated completion context.`);
