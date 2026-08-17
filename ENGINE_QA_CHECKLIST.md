# SpanGlish Engine QA Checklist

Use this checklist with the in-app **Engine QA** hub. QA mode uses the real
lesson player but does not create learner sessions or card-attempt records.

## Permanent QA parity guardrail

- Production lesson behavior is the single source of truth; QA must render the same lesson player and card components.
- QA may only add diagnostics, direct card/stage navigation, restart controls, and analytics isolation.
- **Auto ON** is the QA default and must reproduce the normal production timing, transitions, audio, swipe rules, help, translations, surveys, and responsive layouts.
- **Auto OFF** may pause transitions for inspection, but it must not substitute an older lesson flow.
- Every learner-facing change is incomplete until it is verified in both the normal lesson entry and Engine QA.
- Any new `qaMode` condition must be justified as a testing control or persistence safeguard, never as a separate UI implementation.

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
- Stage
- Prompt
- Update code
- Expected result
- Actual result
- Screenshot or error panel
- Whether it reproduces after **Reiniciar**

## QA controls

- [ ] Engine QA opens from the home screen
- [ ] Lesson selection loads the correct lesson
- [ ] Stage filters show the expected cards
- [ ] A selected card opens directly
- [ ] QA header shows lesson, card, stage, and update code
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

Test at least one card from every stage, then run the complete lesson audit.

- [ ] Prompt text fits without clipping
- [ ] Images remain uncropped and use available space
- [ ] Model audio plays once at the correct time
- [ ] Tapping the prompt repeats its audio
- [ ] Correct choice receives clear visual feedback
- [ ] Incorrect choice receives clear visual feedback
- [ ] Incorrect choice can be retried
- [ ] First-attempt score increments only once
- [ ] Help opens and closes without layout overflow
- [ ] Back to Lessons/QA remains visible
- [ ] Auto OFF permits result inspection
- [ ] Auto ON advances exactly once
- [ ] Last card reaches the completion screen

## Mobile viewport-fit guardrail

Run these checks for every new card pattern before publishing Preview:

- [ ] Test portrait widths of 360, 390, and 412 dp, including an Android device with the system navigation bar visible
- [ ] A stage-only header uses one compact line and does not reserve an empty prompt row
- [ ] A prompt image plus four phrase choices fits in the usable screen without overlap or navigation-bar clipping
- [ ] Long phrase choices remain readable within three lines and do not change the 2x2 grid dimensions
- [ ] Prompt and answer images use `contain` and never crop heads, hands, or the action being taught
- [ ] Font scale at 1.15 does not overlap choices; larger accessibility scales remain reachable by scrolling
- [ ] Capture one Engine QA screenshot for the longest phrase card in portrait before release

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

- [ ] Large prompt image is uncropped
- [ ] Text choices fit and remain readable
- [ ] Question audio and answer audio use the correct timing/voice

### Pronunciation Practice

- [ ] Model phrase plays
- [ ] Ready beep plays, including on the first card
- [ ] Recording begins only after the beep
- [ ] Listening dot and bars animate
- [ ] Voice/silence detection ends recording automatically
- [ ] Checking state remains visible
- [ ] Score and recognized sentence render
- [ ] Weak word feedback renders when available
- [ ] Failed attempt automatically retries
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
- [ ] Rotate or attempt to rotate during a lesson
- [ ] Disable internet before loading a lesson
- [ ] Disable internet during a non-pronunciation lesson
- [ ] Disable internet during pronunciation grading
- [ ] Test after backend cold start
- [ ] Force-close and reopen the app

## Device-layout matrix

- [ ] Small Android phone landscape
- [ ] Medium Android phone landscape
- [ ] Large Android phone landscape
- [ ] Camera cutout/notch does not cover controls
- [ ] Android navigation area does not cover controls
- [ ] Larger system text does not make controls unusable

## Release gate

A preview update is ready for broader testing when:

- [ ] TypeScript check passes
- [ ] Android production export passes
- [ ] Automated lesson/media validation passes
- [ ] Representative card from every stage passes
- [ ] Complete pronunciation test lesson passes
- [ ] Complete grammar transition test passes
- [ ] No open crash-level regression exists
- [x] Sentry source maps are uploaded for the build/update
- [ ] Update code and change summary are recorded
