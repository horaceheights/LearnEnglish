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
const courseAudioProfileId = 'a1-elevenlabs-character-cast-v1';
const semanticRoles = new Set(['teacher', 'question', 'answer']);
const speakerRoles = new Set([
  ...semanticRoles,
  'ana',
  'sofia',
  'female-character',
  'luis',
  'diego',
  'male-character',
]);
let lessonThreeOne = null;
for (const filename of fs.readdirSync(generatedRoot)) {
  if (filename !== 'a1-course.json') continue;
  const payload = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  const lessons = Array.isArray(payload) ? payload : [payload];
  for (const lesson of lessons) {
    if (lesson.sub_lesson_id === '3.1') lessonThreeOne = lesson;
  }
  for (const lesson of lessons) for (const card of lesson.cards) {
    assert.ok(card.audio_assets?.length, `${filename} has a card without persistent audio assets.`);
    if (card.audio_speaker != null) {
      assert.ok(
        speakerRoles.has(card.audio_speaker),
        `${filename} ${card.slide_id} has unsupported prompt speaker ${card.audio_speaker}.`,
      );
    }
    if (card.answer_audio_speaker != null) {
      assert.ok(
        speakerRoles.has(card.answer_audio_speaker),
        `${filename} ${card.slide_id} has unsupported answer speaker ${card.answer_audio_speaker}.`,
      );
    }
    for (const field of ['audio_revision', 'answer_audio_revision']) {
      if (card[field] == null) continue;
      assert.ok(
        Number.isInteger(card[field]) && card[field] > 0,
        `${filename} ${card.slide_id} has invalid ${field}.`,
      );
    }
    for (const asset of card.audio_assets) {
      assert.ok(!persistentAssetIds.has(asset.id), `${filename} repeats persistent asset ID ${asset.id}.`);
      persistentAssetIds.add(asset.id);
      assert.equal(
        asset.profile_id,
        courseAudioProfileId,
        `${filename} ${card.slide_id} must use the approved character-cast profile.`,
      );
      assert.ok(
        semanticRoles.has(asset.semantic_role),
        `${filename} ${card.slide_id} has unsupported semantic role ${asset.semantic_role}.`,
      );
      assert.ok(
        speakerRoles.has(asset.speaker_role),
        `${filename} ${card.slide_id} has unsupported speaker role ${asset.speaker_role}.`,
      );
      assert.ok(
        Number.isInteger(asset.revision) && asset.revision > 0,
        `${filename} ${card.slide_id} has an invalid persistent-audio revision.`,
      );
      const expectedRevision = asset.purpose === 'answer'
        ? (card.answer_audio_revision ?? 1)
        : (card.audio_revision ?? 1);
      assert.equal(
        asset.revision,
        expectedRevision,
        `${filename} ${card.slide_id} audio revision is not bound to its card purpose.`,
      );
      const expectedSpeaker = asset.purpose === 'answer'
        ? (card.answer_audio_speaker || card.audio_speaker || asset.semantic_role)
        : (card.audio_speaker || asset.semantic_role);
      assert.equal(
        asset.speaker_role,
        expectedSpeaker,
        `${filename} ${card.slide_id} audio speaker is not bound to its card purpose.`,
      );
      const correctOption = card.options.find((option) => option.id === card.correct_option_id);
      const cardImageRef = card.prompt_image_url?.trim() || correctOption?.image_url?.trim() || null;
      const pronunciationOptionMatch = asset.purpose.match(/^pronunciation-option-(\d+)$/);
      const pronunciationOption = pronunciationOptionMatch
        ? card.options[Number(pronunciationOptionMatch[1]) - 1]
        : null;
      const expectedImageRef = pronunciationOption?.image_url?.trim() || cardImageRef;
      if (expectedImageRef) {
        assert.equal(
          asset.image_ref,
          expectedImageRef,
          `${filename} has audio that is not bound to the card's exact canonical visual.`,
        );
      } else {
        assert.match(
          asset.image_ref,
          /^text-only:[a-f0-9]{20}$/,
          `${filename} text-only audio must bind to the stable rendered-card digest.`,
        );
      }
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

assert.ok(lessonThreeOne, 'The generated aggregate must contain Lesson 3.1.');
const lessonThreeOneCards = new Map(lessonThreeOne.cards.map((card) => [card.slide_id, card]));
const lessonThreeOnePromptSpeakers = {
  ana: ['L1', 'L3', 'L6', 'R1', 'R3', 'N1', 'N2', 'S1', 'S2', 'S5', 'U4'],
  luis: ['L2', 'L4', 'L5', 'R2', 'N3', 'N5', 'S3', 'S4', 'U3'],
};
for (const [speaker, slideIds] of Object.entries(lessonThreeOnePromptSpeakers)) {
  for (const slideId of slideIds) {
    const card = lessonThreeOneCards.get(slideId);
    assert.ok(card, `Lesson 3.1 is missing ${slideId}.`);
    assert.equal(card.audio_speaker, speaker, `Lesson 3.1 ${slideId} must be voiced by ${speaker}.`);
    for (const asset of card.audio_assets) {
      assert.equal(
        asset.speaker_role,
        speaker,
        `Lesson 3.1 ${slideId} must keep ${speaker} for every card-bound clip.`,
      );
    }
  }
}
const lessonThreeOneAnswerSpeakers = {
  ana: ['R4', 'U1'],
  luis: ['R5', 'U2', 'U5'],
};
for (const [speaker, slideIds] of Object.entries(lessonThreeOneAnswerSpeakers)) {
  for (const slideId of slideIds) {
    const card = lessonThreeOneCards.get(slideId);
    assert.ok(card, `Lesson 3.1 is missing ${slideId}.`);
    assert.equal(
      card.answer_audio_speaker,
      speaker,
      `Lesson 3.1 ${slideId} answer must be voiced by ${speaker}.`,
    );
    const answerAsset = card.audio_assets.find((asset) => asset.purpose === 'answer');
    assert.ok(answerAsset, `Lesson 3.1 ${slideId} must bind an answer clip.`);
    assert.equal(answerAsset.speaker_role, speaker, `Lesson 3.1 ${slideId} answer clip has the wrong voice.`);
  }
}
for (const slideId of ['L7', 'L8', 'R6', 'S6']) {
  const card = lessonThreeOneCards.get(slideId);
  assert.ok(card, `Lesson 3.1 is missing ${slideId}.`);
  assert.equal(card.audio_speaker ?? null, null, `Lesson 3.1 ${slideId} is a mixed exchange, not one character.`);
  assert.equal(
    card.answer_audio_speaker ?? null,
    null,
    `Lesson 3.1 ${slideId} is a mixed exchange, not one character.`,
  );
  assert.ok(
    card.audio_assets.every((asset) => semanticRoles.has(asset.speaker_role)),
    `Lesson 3.1 ${slideId} must retain a neutral voice until dialogue clips can be segmented.`,
  );
}
const lessonThreeOneL1 = lessonThreeOneCards.get('L1');
assert.equal(lessonThreeOneL1.audio_revision, 2, 'Lesson 3.1 L1 must reject the old prompt take via revision 2.');
assert.equal(lessonThreeOneL1.answer_audio_revision, 2, 'Lesson 3.1 L1 must reject the old answer take via revision 2.');
assert.ok(
  lessonThreeOneL1.audio_assets.every((asset) => asset.revision === 2),
  'Every Lesson 3.1 L1 clip must be bound to revision 2.',
);
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
