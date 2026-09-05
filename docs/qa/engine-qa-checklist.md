# SpanGlish Engine QA Checklist

Use this checklist from the in-app **Engine QA** hub. QA mode uses the real
lesson player but does not create learner sessions or card-attempt records.

## Permanent QA parity guardrail

- Production lesson behavior is the single source of truth; QA must render the same lesson player and card components.
- QA may only add diagnostics, direct card/stage navigation, restart controls, and analytics isolation.
- **Auto ON** is the QA default and must reproduce the normal production timing, transitions, audio, swipe rules, help, translations, surveys, and responsive layouts.
- **Auto OFF** may pause transitions for inspection, but it must not substitute an older lesson flow.
- Every learner-facing change is incomplete until it is verified in both the normal lesson entry and Engine QA.
- Any new `qaMode` condition must be justified as a testing control or persistence safeguard, never as a separate UI implementation.
- The QA hub must expose the full course through a compact Unit → Lesson → Stage/Chapter → Card navigator. Standard lessons expose stages; declared mission lessons expose their ordered mission chapters and never fake a five-stage learner journey. It shows only the selected unit's ten lessons and must not put all 70 lessons before the card list.
- The last QA lesson, stage/chapter, and card are QA-only local state. Returning from the lesson player or reopening Engine QA restores that location without touching learner progress.

## Completion answer typography regression

- [ ] In normal lessons and Engine QA, inspect Unit 1 Completa answers before selection and during correct/wrong feedback, especially Lesson 1.8's `parents` / `children` bank.
- [ ] Short answers stay large and centered in full-width rows and compact three-option banks; all tiles retain equal dimensions.
- [ ] Check long phrases, portrait/landscape phone and tablet layouts, and enlarged system text. Labels must fit without microscopic text, clipping, or ellipses; overflowing banks remain scrollable.
- [ ] Check a Recognize and Listen text bank too: they share the same native label renderer.

## Test session record

- Tester:
- Date:
- Phone/model:
- Android version:
- Screen size/resolution:
- App runtime/update code:
- Network: Wi-Fi / mobile / offline transition
- Backend state: warm / cold start

For every defect, capture:

- Lesson ID
- Card number
- Stage or mission chapter
- Prompt
- Update code
- Expected result
- Actual result
- Screenshot or error panel
- Whether it reproduces after **Reiniciar**

## QA controls

- [ ] Engine QA opens from the home screen
- [ ] All seven unit buttons are reachable without vertical scrolling
- [ ] Selecting a unit shows exactly its ten lesson buttons
- [ ] Lesson selection loads the correct lesson
- [ ] Standard-lesson stage filters and mission chapter filters show the expected cards
- [ ] A selected card opens directly
- [ ] Returning from a card restores and highlights the same unit, lesson, stage/chapter, and card
- [ ] QA instructions and the Sentry test remain available under **Herramientas QA**
- [ ] QA header shows lesson, card, current stage or mission chapter, and update code
- [ ] QA header shows the live first-attempt score
- [ ] Previous opens the prior card
- [ ] Next opens the following card
- [ ] Restart resets the current card
- [ ] Auto OFF keeps a correct card open for inspection
- [ ] Auto ON performs the normal production transition
- [ ] Leaving the lesson returns to Engine QA
- [ ] QA activity does not alter learner progress or score history
- [x] Crash-reporting status shows Active
- [x] QA diagnostic test reaches Sentry with the correct runtime/update code

## Universal card behavior

Test at least one card from every standard stage or every mission chapter, then run the complete lesson audit.

- [ ] Prompt text fits without clipping
- [ ] Images fill their approved role-specific viewport and preserve every answer-critical head, face, hand, body, action, count, color, identity, relation, and other teaching cue
- [ ] Loading images use a neutral background without a spinner over any answer
- [ ] Model audio plays once at the correct time
- [ ] Tapping the prompt repeats its audio
- [ ] Correct choice receives clear visual feedback
- [ ] Incorrect choice receives clear visual feedback
- [ ] Incorrect choice can be retried
- [ ] First-attempt score increments only once
- [ ] Help opens and closes without layout overflow
- [ ] Help closes automatically after five seconds
- [ ] Help names the exact action for the current card (listen, replay, select, repeat, or wait for automatic advance)
- [ ] Help closes automatically after moving to the next card
- [ ] Back to Lessons/QA remains visible
- [ ] Opening an earlier completed section still accepts answers, shows feedback, and advances
- [ ] Replaying a completed card does not add score or create another recorded attempt
- [ ] Auto OFF permits result inspection
- [ ] Auto ON advances exactly once
- [ ] Last card reaches the completion screen

## Lesson survey layout

- [ ] At 360, 390, and 412 dp portrait widths, the heading wraps within the screen and Ahora no appears centered below Enviar comentarios with at least a 48 dp touch target
- [ ] Rotate to landscape and increase font size; scroll to reach both survey actions without horizontal clipping or overlap with system navigation
- [ ] Ahora no exits without requiring answers; it remains disabled during recording, transcription, and saving

## Mobile viewport-fit guardrail

Run these checks for every new card pattern before publishing Preview:

- [ ] Test portrait widths of 360, 390, and 412 dp, including an Android device with the system navigation bar visible
- [ ] A stage-only header uses one compact line and does not reserve an empty prompt row
- [ ] A prompt image plus the longest supported text-answer set (at most three stacked tiles) fits without overlap or navigation-bar clipping
- [ ] Phrase tiles remain full-width, horizontally stacked, and readable with one-line auto-sizing
- [ ] One-, two-, and three-card media retain the approved 3:2 treatment; four-image portrait choices retain a fixed 2x2 grid with fixed 4:5 media viewports
- [ ] A four-card window-like crop may omit nonessential scene edges, but the concept remains unmistakable and no numeral, count, price, action, spatial relationship, or identifying structure is hidden or changed
- [ ] New or changed four-card media is inspected in the real 4:5 Preview crop; before Production, its reviewed contact-sheet crop and current hash are recorded in `docs/product/a1-four-card-media-review.json`
- [ ] Font scale at 1.15 does not overlap choices; larger accessibility scales remain reachable by scrolling
- [ ] Capture one Engine QA screenshot for the longest phrase card in portrait before release

## Tile and mission-game responsive-layout guardrail

Run the complete matrix for every new construction, matching, collecting, drag, or drop pattern before enabling its lesson content:

- [ ] Test 360, 390, and 412 dp phone portrait widths; a small phone in landscape; tablet portrait and landscape; and narrow and wide web viewports
- [ ] Repeat with safe areas/system bars visible, font scale 1.15, and the largest supported accessibility text setting
- [ ] The complete tile bank, active construction area, visible drop targets, mission progress, feedback, replay, Undo, Reset, Check, Retry, and Continue are visible or immediately reachable
- [ ] No required source or destination is off-screen during a drag; tap-to-place, tap-to-remove, keyboard movement, and screen-reader reorder actions can complete the same task without dragging
- [ ] Every interactive target measures at least 44 by 44 CSS pixels on web and 48 by 48 dp on mobile, without clipped, overlapping, truncated, or split-word labels
- [ ] The largest authored tile bank and longest authored construction use available space efficiently, reflow without horizontal page overflow, and use a bounded bank scroll or paging instead of shrinking below the minimum target and text sizes
- [ ] Lesson 1.10's largest eight-tile bank wraps its answer area into two to four slots per row on mobile and an auto-fitting minimum-width grid on web; no mission tile label shrinks below 80 percent of its authored size
- [ ] Rotating or resizing with a partial construction preserves its order and keeps every placed tile inside the usable construction area
- [ ] Dragging and reordering do not trigger lesson-card swipe navigation, unintended page scrolling, or an adjacent drop target
- [ ] A lifted tile stays inside usable bounds; any edge scrolling is confined to the intended bank or construction region, and a resize or rotation during drag safely returns the tile to its last valid position
- [ ] Help, feedback, Retry, and completion states do not cover the active construction or move primary controls beneath browser or system navigation
- [ ] Capture screenshots of the largest tile bank and longest construction on the smallest phone, a landscape phone, and a tablet before release

## Narrative sequence guardrail

Review every changed lesson from its first card to its last in authored order:

- [ ] The cards follow a coherent narrative, causal, chronological, spatial, procedural, or pedagogical sequence rather than merely sharing a topic
- [ ] For every adjacent pair, a reviewer can explain why the following slide naturally continues, answers, applies, contrasts, deepens, or resolves the previous slide and how it prepares what comes next
- [ ] The final slide of each section creates a logical bridge into the next section instead of resetting to an unrelated sequence
- [ ] People, places, objects, and goals are established before the learner must use them
- [ ] Greetings precede introductions and information exchange; goodbye and other closings occur after the exchange they close
- [ ] Changes of speaker, place, time, or task have an understandable transition rather than an arbitrary jump
- [ ] Each review station is internally coherent and the station order is purposeful
- [ ] Every mission card establishes the goal, reveals needed information, overcomes an obstacle, performs required language, or resolves the story
- [ ] Runtime delivery preserves authored card order and randomizes only the permitted answer positions

## Continuous mission contract

Run every declared mission from briefing through resolution without using direct-card navigation:

- [ ] The learner sees one mission shell with beat progress and chapter transitions, never the standard five-stage journey, section-completion screen, or section picker
- [ ] The mission label, title, briefing, chapter objective, and final resolution match the canonical mission presentation metadata
- [ ] Every card belongs to exactly one declared chapter; chapter order is monotonic and a completed chapter never reopens as a visible section
- [ ] Beat numbers are contiguous, the denominator equals the actual card count, restart returns to the briefing, and resume restores the exact saved beat and partial first-attempt state
- [ ] The mission presentation briefs a concrete story goal before the first assessed beat, every middle beat obtains or applies information needed for that goal, and the last beat resolves the story rather than merely reporting card completion
- [ ] Identity/clue, listening, speaking, word-part, and sentence-building mechanics occur in the authored narrative order and each interaction uses its normal production audio, scoring, feedback, retry, and accessibility lifecycle
- [ ] Unit 1 Lesson 1.10 contains exactly 22 beats and covers all 46 vocabulary targets introduced in Lessons 1.1-1.8 on correct/successful paths, not merely in distractors or metadata
- [ ] `Who is he?`, `Who is she?`, and `Who are they?` each appear as an assessed Unit 1 mission form with the correct singular/plural answer frame
- [ ] No assessed prompt, model audio, correct answer, speaking target, or completed construction contains English not introduced in Lessons 1.1-1.8
- [ ] Every assessed beat has a fresh, unambiguous hero still; no hero reuses an exact asset from Lessons 1.1-1.9 or another mission beat, and all answer-critical cues survive the real mobile crop
- [ ] Speech-service failure, offline entry, a wrong answer, Undo, Reset, rotation, help, or background/foreground cannot strand the mission or erase a valid completed beat

## Prerequisite and cumulative-sentence guardrail

- [ ] The unit mastery map identifies the first teaching slide for every content word, article, pronoun, form of `be`, preposition, place/object noun, and other function word used later
- [ ] No prompt, answer, distractor, audio line, speaking target, or mission step uses a word or structure before its intentional introduction
- [ ] When vocabulary or grammar moves between lessons 1-8 of one unit, every prerequisite, review target, downstream lesson, and Lesson 9 coverage calculation is updated with it; no later-unit target moves forward without explicit approval
- [ ] Longer sentences grow through small meaningful additions of already introduced language instead of appearing fully formed; Unit 1 can reach `girl` → `the girl` → `running` → `The girl is running.`, while `park` → `in the park` → `The girl is running in the park.` waits for Unit 2
- [ ] Each cumulative sentence remains visually literal, continues the established scene or story, and gives the learner more communicative power rather than merely adding length

## Activity-stage matrix

### Action Introduction

- [ ] Correct image selection
- [ ] Incorrect selection and retry
- [ ] Image sizing on one-choice and multi-choice cards
- [ ] Prompt and answer audio timing

### New Vocab / New Words

- [ ] New item is visually clear
- [ ] Image and label match
- [ ] Audio pronunciation matches the content
- [ ] Single-choice progression works

### Meaning Practice

- [ ] Sentence matches the correct image
- [ ] All distractor images are distinct and visible
- [ ] Wrong-answer retry preserves the same card

### Listen / Listen To Picture

- [ ] Audio starts without displaying the answer
- [ ] First Listen card images are visible when the card appears on a cold cache
- [ ] Automatically advancing into Listen renders every answer image immediately, without requiring a swipe away and back
- [ ] Swiping backward and forward does not change which answer images are visible
- [ ] Replay works
- [ ] Correct image matches spoken audio
- [ ] Learner can retry after a wrong choice

### More People

- [ ] Singular/plural image meaning is clear
- [ ] `and` / `are` highlighting is correct
- [ ] Completed answer audio is correct

### Grammar / New Grammar

- [ ] Sentence displays the intended blank
- [ ] Correct and incorrect word choices are readable
- [ ] Wrong choice retries normally
- [ ] Correct word flies toward the blank
- [ ] Blank becomes the completed sentence
- [ ] Inserted word is highlighted
- [ ] Completed sentence is spoken
- [ ] Auto OFF preserves the completed sentence
- [ ] Auto ON advances after speech

### Picture To Text / What Is It?

- [ ] Large prompt image fills its approved viewport without losing any answer-critical or teaching cue
- [ ] Text choices fit and remain readable
- [ ] Question audio and answer audio use the correct timing/voice

### Pronunciation Practice

- [ ] Model phrase plays
- [ ] Model phrase plays once without restarting during the microphone permission flow
- [ ] Ready beep plays, including on the first card
- [ ] Recording begins only after the beep
- [ ] Listening dot and bars animate
- [ ] Voice/silence detection ends recording automatically
- [ ] Checking state remains visible
- [ ] Score and recognized sentence render
- [ ] Weak word feedback renders when available
- [ ] A graded failure keeps feedback visible and waits for the learner to choose Retry
- [ ] A no-speech result replays automatically for no more than three recovery rounds, then waits for Retry
- [ ] Accepted attempt advances only once
- [ ] Restart works before, during, and after an attempt
- [ ] Leaving during recording does not crash
- [ ] Final pronunciation card reaches completion

## Interruption and recovery

- [ ] Lock/unlock during a normal card
- [ ] Lock/unlock during model audio
- [ ] Lock/unlock during pronunciation recording
- [ ] Background/foreground during grading
- [ ] Leave lesson during grammar animation
- [ ] Backgrounding pauses model/answer audio and does not advance a hidden card
- [ ] Returning to pronunciation restarts the current phrase without awarding a stale result
- [ ] Returning during grammar or answer audio safely resumes or advances exactly once
- [ ] Rotate or attempt to rotate during a lesson
- [ ] Disable internet before loading a lesson
- [ ] Disable internet during a non-pronunciation lesson
- [ ] Disable internet during pronunciation grading
- [ ] After making progress offline, force-close and reopen after reconnecting; the exact saved card and first-attempt score state return
- [ ] Finish a lesson offline, exit, reconnect, and reopen; the completion state returns and synchronizes instead of restarting at card one
- [ ] Uncached lesson audio never blocks answering or card progression while offline
- [ ] Pronunciation shows retry and continue-without-score controls while offline
- [ ] Restoring internet allows pronunciation to restart normally
- [ ] Test after backend cold start
- [ ] Force-close and reopen the app

## Device-layout matrix

- [ ] Small Android phone landscape
- [ ] Medium Android phone landscape
- [ ] Large Android phone landscape
- [ ] Camera cutout/notch does not cover controls
- [ ] Android navigation area does not cover controls
- [ ] Larger system text does not make controls unusable

## Preview test gate

A Preview update is ready for Horace's internal device testing when:

- [ ] TypeScript check passes
- [ ] Android production export passes
- [ ] Automated lesson/media validation passes
- [ ] Any pending human semantic or four-card crop reviews appear only as explicit Preview warnings; there are no rejected decisions, stale or malformed semantic contracts or asset-binding hashes, missing assets, copy-parity failures, ambiguous answers, or structural media errors
- [x] Automated first-try, retry, duplicate-completion, and skipped-pronunciation scoring checks pass
- [ ] Representative card from every stage passes
- [ ] The complete Speak stage passes in a representative lesson from every unit
- [ ] Complete grammar transition test passes
- [ ] No open crash-level regression exists
- [ ] Sentry source maps are uploaded and verified for this named build/update
- [ ] Update code and change summary are recorded

## Production gate

A tested Preview is eligible for Production only when:

- [ ] Every learner-facing still and final runtime crop has a current human approval; there are zero `pending` and zero `rejected` semantic contracts
- [ ] `docs/product/a1-four-card-media-review.json` exactly matches the current four-card inventory and file hashes
- [ ] `npm run verify:production` passes without review warnings or errors
- [ ] The latest tested Preview group contains Android and iOS updates whose `gitCommitHash` exactly matches the clean, pushed approval commit
- [ ] The user explicitly approves promotion after testing that exact Preview group

## Card-specific teaching hints

- In normal lessons and Engine QA, choose `A` for `___ adult.` in Lesson 1.5: the hint must explain that `adult` begins with a vowel sound, so the answer is `an adult`, not `a adult`.
- Compare action choices with the same subject and verb (reading versus writing): feedback must explain the action words, never an unrelated `is` rule.
- Check `Where are you from?`, `There are two chairs`, `I do not like milk`, `on Monday`, and `in the morning`: each explanation must use that card's context.
- On a two-blank card, get the first blank wrong and the second right, then reverse the mistake. The hint must follow the first incorrect position in the submitted attempt.
- Check short phone portrait and enlarged font settings: the complete explanation and answer controls must remain visible or reachable; feedback space follows its measured height.
- Automated gate: `mobile/tests/lesson-mistake-hints.test.cjs` exercises every distractor at each answer position across the 70 embedded lessons and verifies that web and mobile share the resolver. It rejects generic retries, untranslated or blank-marker feedback, and excessively long hints. This does not replace the on-device reading check.

## Edge-to-edge lesson media

- Inspect the actual scene inside the established border inset, including decoded first, middle, and last playing frames. A correctly sized video element does not prove that encoded content fills it.
- Exercise one-, two-, three-, and four-image layouts on mobile and web, including posters, cold-load transitions, reduced-motion/failure stills, and playing clips.
- Reject neutral/black bands, blurred side panels, and padding baked into source pixels. Preserve heads, hands, feet, action tools, and answer-critical detail without stretching.
- Regression examples: Unit 1.6 mother cooking must fill both sides while retaining the pan and stirring hands; walking must retain the feet.
- Audit every mapped action clip and each two-card variant, not just the reported slide. Regenerate from the reviewed landscape master; do not approve the old inset exception or replace motion with a still to pass.

Run `python scripts/audit_video_full_bleed.py` to decode all client-mapped clips, verify bundled/web byte parity, and reject solid edge bands. This is mandatory in Preview and Production preflight. This pixel heuristic supplements visual review; it does not prove correct actions or detect every possible blurred panel.
