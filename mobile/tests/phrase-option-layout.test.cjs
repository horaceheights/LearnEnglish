const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cardViewPath = path.resolve(__dirname, '../src/components/LessonCardView.tsx');
const cardViewSource = fs.readFileSync(cardViewPath, 'utf8');
const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const course = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../src/generated/a1-course.json'),
  'utf8',
));

assert.match(
  cardViewSource,
  /const useHorizontalPhraseOptions = !isLandscape && hasTextOnlyOptions && !useCompactCompletionTiles;/,
  'Portrait phrase choices must use the shared horizontal-row layout outside compact word-tile completions.',
);

assert.match(
  cardViewSource,
  /useCompactCompletionTiles\s*\? '31%'/,
  'Three short completion words must share one visible responsive row.',
);
assert.match(
  cardViewSource,
  /\(option\.label\?\.trim\(\)\.length \|\| 0\) <= 8/,
  'Only completion labels that remain readable on the smallest phone may use the compact row.',
);
assert.match(
  cardViewSource,
  /textOptionCompact: \{ paddingHorizontal: 0 \}/,
  'Compact completion labels must receive the full narrow tile width.',
);

assert.match(
  cardViewSource,
  /useHorizontalPhraseOptions\s*\? '100%'/,
  'Every portrait phrase tile must use the full available width.',
);
assert.match(
  cardViewSource,
  /useStackedCompactLandscapeText\s*\? '100%'/,
  'Very long answers must not be squeezed into narrow compact-landscape columns.',
);

assert.match(
  cardViewSource,
  /const TEXT_OPTION_NORMAL_MAX_LINES = 2;[\s\S]*?const TEXT_OPTION_MAX_LINES = 3;/,
  'Ordinary answers use two lines while genuinely long answers may use a third.',
);

const textAnswerStart = cardViewSource.indexOf('{option.label && !option.image_url ? (');
const textAnswerEnd = cardViewSource.indexOf('{revealCorrect ?', textAnswerStart);
assert.ok(textAnswerStart >= 0 && textAnswerEnd > textAnswerStart, 'missing shared text-answer renderer');
const textAnswerSource = cardViewSource.slice(textAnswerStart, textAnswerEnd);

assert.match(
  textAnswerSource,
  /<Text\s+adjustsFontSizeToFit[\s\S]*?numberOfLines=\{optionTextLineLimit\}[\s\S]*?>[\s\S]*?\{option\.label\}/,
  'Every mapped text answer must independently use native largest-text-that-fits sizing.',
);
assert.doesNotMatch(
  textAnswerSource,
  /numberOfLines=\{[^}]*\?\s*1/,
  'Long answers may wrap instead of forcing every phrase onto one tiny line.',
);
assert.match(
  textAnswerSource,
  /android_hyphenationFrequency="none"[\s\S]*?textBreakStrategy="simple"/,
  'Multi-line answers must wrap at word boundaries on Android.',
);
assert.match(
  cardViewSource,
  /const optionTextLineLimit = textOptionLineLimit\(option\.label\);/,
  'Each answer must choose its own line limit from its own label.',
);
assert.match(
  cardViewSource,
  /minHeight: hasTextOnlyOptions\s*\? uniformTextOptionHeight\s*: optionMinHeight/,
  'Every text tile must use the same height, sized for the longest answer.',
);
assert.match(
  cardViewSource,
  /const textOptionsReservedHeight = hasTextOnlyOptions[\s\S]*?textOptionRows \* uniformTextOptionHeight[\s\S]*?: 0;/,
  'The shared card layout must reserve the same tallest tile height for every row.',
);
assert.match(
  cardViewSource,
  /hasTextOnlyOptions\s*\? textOptionsReservedHeight \+ feedbackReservedHeight \+ 30/,
  'Prompt media must reserve screen space for both adaptive text rows and answer feedback.',
);
const featureImageHeightMatch = cardViewSource.match(/const featureImageHeight = ([\s\S]*?);/);
assert.ok(featureImageHeightMatch, 'missing feature-image height calculation');
const featureImageHeightFor = Function(
  'allowVerticalGrowth',
  'hasTextOnlyOptions',
  'isPronunciation',
  'isMissionTile',
  'responsiveFeatureImageHeight',
  'availableCardHeight',
  'featureReservedHeight',
  `"use strict"; return ${featureImageHeightMatch[1]};`,
);
// A 700dp phone with three two-line answers has a 189dp responsive image.
// Before feedback, natural height lacks the 58dp feedback reservation. Repeated
// measurements must not recursively subtract that space from the image itself.
let naturalCardHeight = 482;
for (let layoutPass = 0; layoutPass < 4; layoutPass += 1) {
  const imageHeight = featureImageHeightFor(true, true, false, false, 189, naturalCardHeight, 360);
  assert.equal(imageHeight, 189, 'Scrollable text media must keep its readable responsive height.');
  naturalCardHeight = imageHeight + 293;
}
assert.equal(
  featureImageHeightFor(true, true, false, false, 189, naturalCardHeight + 58, 360),
  189,
  'Showing feedback must not resize the prompt image in a naturally growing text card.',
);
assert.equal(
  featureImageHeightFor(false, true, false, false, 189, 482, 360),
  122,
  'Fixed-height text cards must retain their measured screen-space cap.',
);
assert.equal(
  featureImageHeightFor(true, false, false, false, 189, 482, 360),
  122,
  'The natural-height exception must never change image-choice grids.',
);
assert.match(
  cardViewSource,
  /const isTabletViewport = Math\.min\(viewportWidth, viewportHeight\) >= 540;[\s\S]*?const textOptionFontSize = isTabletViewport/,
  'Text sizing must use tablet scale in portrait as well as landscape.',
);
assert.match(
  cardViewSource,
  /const textOptionMinimumFontSize = isTabletViewport \? 22 : 16;[\s\S]*?textOptionMinimumFontSize \/ textOptionFontSize/,
  'Adaptive labels must stop at a readable 16dp phone or 22dp tablet floor.',
);
assert.doesNotMatch(
  textAnswerSource,
  /minimumFontScale=\{(?:isTabletLandscape[^}]*|[^}]*0\.55)/,
  'Text answers must not retain the old 55% tiny-font fallback.',
);
assert.match(
  cardViewSource,
  /textOptionLong: \{ paddingHorizontal: 0 \}/,
  'Three-line answers must use the complete phone tile width before approaching the readable floor.',
);
assert.match(
  cardViewSource,
  /hasTextOnlyOptions && optionTextLineLimit > 1 \? styles\.textOptionSentence : null/,
  'Sentence width adjustments must be restricted to text-only answers, never image grids.',
);
assert.match(
  cardViewSource,
  /hasTextOnlyOptions && optionTextLineLimit === TEXT_OPTION_MAX_LINES \? styles\.textOptionLong : null/,
  'Three-line padding must never change image-choice frames.',
);

const lineLimitFunctionMatch = cardViewSource.match(
  /export function textOptionLineLimit\(label: string \| null \| undefined\) \{[\s\S]*?\n\}/,
);
assert.ok(lineLimitFunctionMatch, 'missing adaptive text-option line-limit function');
const executableLineLimitSource = lineLimitFunctionMatch[0]
  .replace('export ', '')
  .replace('(label: string | null | undefined)', '(label)');
const textOptionLineLimit = Function(
  'TEXT_OPTION_NORMAL_MAX_LINES',
  'TEXT_OPTION_MAX_LINES',
  `"use strict"; ${executableLineLimitSource}; return textOptionLineLimit;`,
)(2, 3);
const longReviewAnswer = 'Who are they? They are the grandparents. They are sitting and talking. They are not sleeping.';
assert.deepEqual(
  [
    'father',
    'She is writing.',
    'The parents and the children are a family.',
    longReviewAnswer,
  ].map(textOptionLineLimit),
  [1, 1, 2, 3],
  'Each response must independently choose one, two, or three lines from its own copy.',
);

const textOnlyCards = course.flatMap((lesson) => (lesson.cards || []).filter((card) => (
  card.options?.length > 0 && card.options.every((option) => !option.image_url)
)));
const longestTextCard = textOnlyCards.reduce((longestCard, card) => {
  const longestLength = Math.max(...longestCard.options.map((option) => (option.label || '').length));
  const cardLength = Math.max(...card.options.map((option) => (option.label || '').length));
  return cardLength > longestLength ? card : longestCard;
});
const longestAuthoredLabel = longestTextCard.options.reduce((longest, option) => (
  (option.label || '').length > longest.length ? option.label : longest
), '');
assert.ok(longestAuthoredLabel.length >= 90, 'expected the current long multi-sentence review answer');
assert.equal(
  textOptionLineLimit(longestAuthoredLabel),
  3,
  'The longest real authored answer must receive the three-line readable layout.',
);

const scrollFunctionMatch = cardViewSource.match(
  /export function textAnswerStackNeedsScroll\([\s\S]*?\n\}/,
);
assert.ok(scrollFunctionMatch, 'missing text-answer scroll safety predicate');
const executableScrollSource = scrollFunctionMatch[0]
  .replace('export ', '')
  .replace('viewportWidth: number', 'viewportWidth')
  .replace('viewportHeight: number', 'viewportHeight')
  .replace('labels: Array<string | null | undefined>', 'labels');
const textAnswerStackNeedsScroll = Function(
  'textOptionLineLimit',
  `"use strict"; ${executableScrollSource}; return textAnswerStackNeedsScroll;`,
)(textOptionLineLimit);
assert.equal(
  textAnswerStackNeedsScroll(320, 568, ['father', 'mother', 'parents']),
  true,
  'Every text bank on a short portrait phone must have a reachable scroll fallback for feedback.',
);
assert.equal(
  textAnswerStackNeedsScroll(390, 844, longestTextCard.options.map((option) => option.label)),
  true,
  'The real longest answer bank must remain reachable even on a taller portrait phone.',
);
assert.equal(
  textAnswerStackNeedsScroll(390, 844, ['father', 'mother']),
  false,
  'A short answer bank on a normal portrait phone must not introduce needless scrolling.',
);
assert.equal(
  textAnswerStackNeedsScroll(720, 400, ['father', 'mother', 'parents']),
  true,
  'A compact landscape phone must also keep text choices and feedback vertically reachable.',
);
assert.match(
  lessonScreenSource,
  /const needsAccessibleScrolling = fontScale > 1\.3[\s\S]*?\|\| needsTextAnswerScrolling;/,
  'Overflow-prone text answers must activate the lesson page ScrollView.',
);
assert.match(
  lessonScreenSource,
  /needsTextAnswerScrolling \? styles\.pageScrollableTextAnswers : null/,
  'The scroll content must grow to its natural text-answer height.',
);
assert.match(
  lessonScreenSource,
  /allowVerticalGrowth=\{needsTextAnswerScrolling\}/,
  'The lesson card must expose its full content height to the scroll surface.',
);
assert.match(
  lessonScreenSource,
  /pageScrollableTextAnswers: \{ flexGrow: 1 \}/,
  'The short-phone ScrollView content must fill the viewport when no scrolling is needed.',
);
assert.match(
  lessonScreenSource,
  /cardCarouselVerticalGrowth: \{ flexBasis: 'auto', flexGrow: 1, flexShrink: 0 \}/,
  'Overflowing text cards must contribute their natural height to the page scroll range.',
);
assert.match(
  cardViewSource,
  /cardVerticalGrowth: \{ flexBasis: 'auto', flexGrow: 1, flexShrink: 0 \}/,
  'The card itself must not flex-shrink choices or feedback out of reach.',
);
const textOptionStyleStart = cardViewSource.indexOf('textOptionLabel: {');
const textOptionStyleEnd = cardViewSource.indexOf('pendingOption:', textOptionStyleStart);
assert.ok(textOptionStyleStart >= 0 && textOptionStyleEnd > textOptionStyleStart, 'missing text-option style');
const textOptionStyleSource = cardViewSource.slice(textOptionStyleStart, textOptionStyleEnd);
for (const requiredStyle of [
  /alignSelf:\s*'stretch'/,
  /flexShrink:\s*1/,
  /maxWidth:\s*'100%'/,
  /textAlign:\s*'center'/,
  /width:\s*'100%'/,
]) {
  assert.match(
    textOptionStyleSource,
    requiredStyle,
    'Adaptive answer text must remain centered and bounded inside each tile.',
  );
}

console.log('Horizontal phrase-option layout checks passed.');

const uniformHeightExpression = cardViewSource.match(/const uniformTextOptionHeight = (.*);/)[1];
const uniformHeightFor = Function("optionMinHeight", "textOptionLineLimits", "textOptionMinHeightFor", `return ${uniformHeightExpression};`);
for (const limits of [[1, 2], [3, 1, 2], [1, 1, 1]]) {
  const height = uniformHeightFor(58, limits, (lines) => Math.max(58, lines * 32 + 28));
  assert.equal(height, Math.max(...limits.map((lines) => Math.max(58, lines * 32 + 28))));
}
assert.match(cardViewSource, /height: hasTextOnlyOptions \? uniformTextOptionHeight : undefined/);
const webSource = fs.readFileSync(path.resolve(__dirname, "../../frontend/components/LessonPlayer.js"), "utf8");
assert.match(webSource, /gridAutoRows: currentCard.options.every\(\(option\) => !option.image_url\) \? "1fr" : undefined/);
