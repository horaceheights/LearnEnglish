const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const cardView = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonCardView.tsx'),
  'utf8',
);
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const previewLessons = fs.readFileSync(
  path.join(mobileRoot, 'src/previewLessons.ts'),
  'utf8',
);
const guardrails = fs.readFileSync(
  path.resolve(mobileRoot, '../docs/product/project-guardrails.md'),
  'utf8',
);
const qaChecklist = fs.readFileSync(
  path.resolve(mobileRoot, '../docs/qa/engine-qa-checklist.md'),
  'utf8',
);
const courseDesign = fs.readFileSync(
  path.resolve(mobileRoot, '../docs/product/course-design-a1.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'),
  'utf8',
);

assert.match(
  lessonScreen,
  /lessonLocation:\s*\{[^}]*fontSize:\s*16[^}]*lineHeight:\s*20/,
  'The unit and lesson context must remain twice the original 8 dp label size.',
);
assert.match(
  lessonScreen,
  /stage:\s*\{[^}]*fontSize:\s*20[^}]*lineHeight:\s*24/,
  'Every active lesson section must remain twice the original 10 dp label size.',
);
assert.match(
  lessonScreen,
  /stageOnlyLabel:\s*\{\s*lineHeight:\s*24\s*\}/,
  'Stage-only Learn cards must not clip the enlarged section label.',
);

assert.match(
  cardView,
  /const landscapeImageColumnCount = useTabletImageGrid\s*\? 2\s*:\s*Math\.max\(1, card\.options\.length\)/,
  'Tablet four-card choices must remain a 2x2 grid while other landscape counts keep their authored row.',
);
assert.match(
  cardView,
  /const heightAwareThreeByTwoFrameWidth = Math\.max\([\s\S]*?optionImageHeight \* \(3 \/ 2\)\) \+ 24/,
  'Landscape 3:2 frames must cap their width from the measured remaining card height.',
);
assert.match(
  cardView,
  /width:\s*constrainedPortraitImageOptionWidth\s*\?\? constrainedLandscapeImageOptionWidth\s*\?\? optionWidth/,
  'Height-aware landscape sizing must apply without replacing the existing portrait constraint or authored option widths.',
);
assert.match(
  cardView,
  /const useFullWidthSingleActionVideo = useExpandedSingleActionVideo && !isTabletLandscape/,
  'Landscape tablet teaching videos must not override the shared height-aware single-card width cap.',
);
assert.match(
  cardView,
  /useFullWidthSingleActionVideo \? styles\.singleActionVideoOption : null/,
  'The full-width teaching-video style must remain scoped to phones.',
);
assert.match(
  cardView,
  /tabletImageGridWidth[\s\S]*?alignSelf:\s*'center',[\s\S]*?width:\s*tabletImageGridWidth/,
  'A height-capped tablet grid must stay centered and exactly two columns wide.',
);

assert.match(
  guardrails,
  /mobile unit\/lesson context at 16 dp and the active section label at 20 dp on both phones and tablets/,
  'The approved phone and tablet header scale must be durable product memory.',
);
assert.match(
  guardrails,
  /no one-, two-, three-, or four-card layout may overlap the header or extend beneath Android system navigation/,
  'The guardrail must explicitly cover overlay risk for every option count on tablets and phones.',
);
assert.match(
  guardrails,
  /Never require a learner to drag to or from an off-screen target/,
  'Tile games must not require an off-screen drag source or destination.',
);
assert.match(
  guardrails,
  /at least 44 by 44 CSS pixels on web and 48 by 48 dp on mobile/,
  'Tile games must preserve the approved cross-platform minimum target sizes.',
);
assert.match(
  guardrails,
  /Tap-to-place, tap-to-remove, keyboard movement, and screen-reader reorder actions must provide a complete alternative to dragging/,
  'Every drag interaction must retain a complete non-drag path.',
);
assert.match(
  guardrails,
  /clamp it to the usable bounds and keep its destination and placement state visible/,
  'Dragged tiles must stay inside the measured usable viewport.',
);
assert.match(
  guardrails,
  /Every lesson must unfold as one intentional sequence whose logic may be narrative, causal, chronological, spatial, procedural, or pedagogical/,
  'Authored card order must remain a coherent sequence across every lesson type.',
);
assert.match(
  guardrails,
  /Every adjacent pair of cards needs an understandable bridge/,
  'Every slide must follow naturally from the previous slide and prepare the next one.',
);
assert.match(
  guardrails,
  /Section boundaries do not reset the story logic/,
  'The five lesson sections must remain parts of one continuous learning arc.',
);
assert.match(
  guardrails,
  /runtime delivery may randomize answer positions but must never shuffle the cards themselves/,
  'Runtime randomization must not destroy the authored lesson story.',
);
assert.match(
  guardrails,
  /Lessons 1 through 8 are forward-building lessons, not mixed review decks/,
  'Lessons 1-8 must reuse earlier vocabulary only through forward construction.',
);
assert.match(
  guardrails,
  /Vocabulary and grammar allocations across lessons 1 through 8 are movable/,
  'Lesson boundaries must not block the approved cumulative story progression.',
);
assert.match(
  guardrails,
  /explicitly introduce every required content word and supporting function word/,
  'Articles, prepositions, and other supporting language must be taught before use.',
);
assert.match(
  guardrails,
  /The girl is running in the park\./,
  'The cumulative sentence ladder must remain part of the durable course contract.',
);
assert.match(
  guardrails,
  /Lesson 9 is a comprehensive, no-new-language review[\s\S]*?at least 70 percent/,
  'Lesson 9 must own comprehensive unit review and meet the approved coverage floor.',
);
assert.match(
  guardrails,
  /Lesson 10 is not a second review/,
  'Lesson 10 must remain an applied mission rather than another review deck.',
);
assert.match(
  guardrails,
  /syllables or word parts to whole words[\s\S]*?words to useful sentences/,
  'Lesson 10 tile play must support the approved word-part-to-sentence progression.',
);
assert.match(
  guardrails,
  /New bespoke lesson and mission sound effects use ElevenLabs Sound Effects during asset production/,
  'New mission sound effects must use the approved static ElevenLabs workflow.',
);
assert.doesNotMatch(
  courseDesign,
  /purposeful review cards that mix old and new vocabulary/,
  'The superseded mixed-review-card standard must not return to the course design.',
);
assert.match(
  qaChecklist,
  /## Tile and mission-game responsive-layout guardrail[\s\S]*?360, 390, and 412 dp phone portrait widths/,
  'Engine QA must exercise tile games at every representative phone width.',
);
assert.match(
  qaChecklist,
  /## Narrative sequence guardrail[\s\S]*?For every adjacent pair[\s\S]*?Greetings precede introductions and information exchange/,
  'Engine QA must review adjacent-slide continuity as well as conversational chronology.',
);
assert.match(
  qaChecklist,
  /## Prerequisite and cumulative-sentence guardrail[\s\S]*?No prompt, answer, distractor, audio line, speaking target, or mission step uses a word or structure before its intentional introduction/,
  'Engine QA must reject unintroduced supporting language in cumulative sentences.',
);
assert.match(
  previewLessons,
  /cards:\s*lesson\.cards\.map\(\(card\)\s*=>\s*\(\{[\s\S]*?\.\.\.card,[\s\S]*?options:\s*shuffledOptions\(card\.options\)/,
  'Preview delivery must preserve authored card order and shuffle only each card\'s answer options.',
);
assert.match(
  interactionVerifier,
  /node tests\/tablet-lesson-layout\.test\.cjs/,
  'Preview interaction verification must always run the phone and tablet layout guardrail.',
);

console.log('Phone and tablet layouts, responsive tile-game contracts, and authored lesson chronology remain protected.');
