const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '../src/config.ts');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const generatedRoot = path.resolve(__dirname, '../src/generated');
const configSource = fs.readFileSync(configPath, 'utf8');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const compiledConfigPath = process.argv[2];

assert.match(
  configSource,
  /throw new Error\('Completion placeholders are visual only and cannot be sent to course audio\.'\)/,
  'The remote course-audio URL boundary must reject every completion placeholder.',
);

assert.match(
  lessonScreenSource,
  /if \(text\.trim\(\) && !hasVisualAudioPlaceholder\(text\)\)/,
  'Completion prompts must be excluded from course-audio preloading.',
);

assert.match(
  lessonScreenSource,
  /if \(hasVisualAudioPlaceholder\(text\)\) return;/,
  'The shared playback boundary must refuse completion prompts.',
);

assert.match(
  lessonScreenSource,
  /if \(promptHasVisualBlank\) \{[\s\S]*?setPromptAutoplayFinished\(true\);[\s\S]*?return undefined;/,
  'Blank completion cards must enable interaction without starting prompt audio.',
);

assert.match(
  lessonScreenSource,
  /const promptHasVisualBlank = hasVisualAudioPlaceholder\(currentCard\?\.prompt \?\? ''\)[\s\S]*?\|\| hasVisualAudioPlaceholder\(promptAudio\);/,
  'Blank detection must inspect the displayed prompt even when legacy audio_text is empty.',
);

let completionCardCount = 0;
for (const filename of fs.readdirSync(generatedRoot)) {
  if (!filename.endsWith('.json')) continue;
  const payload = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  const lessons = Array.isArray(payload) ? payload : [payload];
  for (const lesson of lessons) for (const card of lesson.cards) {
    const promptAudio = card.audio_text ?? card.prompt ?? '';
    const visualPrompt = card.prompt ?? '';
    if (!/_{2,}|\.{3}|…|\{blank\}|\[blank\]/i.test(visualPrompt)
      && !/_{2,}|\.{3}|…|\{blank\}|\[blank\]/i.test(promptAudio)) continue;
    completionCardCount += 1;
    assert.ok(
      card.answer_audio_text?.trim(),
      `${filename} has a silent visual blank without completed answer audio.`,
    );
    assert.doesNotMatch(
      card.answer_audio_text,
      /_+|\.{3}|…|\{blank\}|\[blank\]/i,
      `${filename} sends a placeholder in completed answer audio.`,
    );
    const correctOption = card.options.find((option) => option.id === card.correct_option_id);
    assert.ok(
      correctOption?.label?.trim(),
      `${filename} cannot build complete answer audio without a labeled correct option.`,
    );
    const completedPrompt = visualPrompt.replace(/_{2,}|\.{3}|…|\{blank\}|\[blank\]/i, correctOption.label);
    const normalizeCompletion = (text) => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    assert.equal(
      normalizeCompletion(card.answer_audio_text),
      normalizeCompletion(completedPrompt),
      `${filename} must speak the entire completed prompt, including context before the blank.`,
    );
  }
}
assert.ok(completionCardCount > 0, 'Generated lessons must exercise completion-audio guardrails.');

if (compiledConfigPath) {
  const { courseAudioUrl } = require(path.resolve(compiledConfigPath));
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
}

console.log(`Verified ${completionCardCount} silent visual-blank cards with full completed-prompt audio.`);
