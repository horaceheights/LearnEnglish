# Lesson section briefings — 2026-09-09

Standard lessons now open with a briefing and show another one at every section
boundary, so the learner is never dropped into a different activity without
warning. The Learn section also states that it plays by itself and shows the
window draining, and a placed Completa word visibly travels into its slot.

Mobile only. Web is unchanged by explicit user decision.

## What the learner sees

- Entering a standard lesson shows `VAS A APRENDER` with the lesson's vocabulary,
  then `AHORA · Aprende` with `Esta sección es automática: solo mira y escucha.`
- Finishing a section shows `LO QUE ACABAS DE PRACTICAR` with what that section
  covered, then the next section, its Spanish task description, how many cards it
  holds, and how it works. The journey strip above shows the finished segment
  ticking over and the next one becoming active.
- Lesson 1.1 produces five surfaces: the opening plus boundaries after cards
  10, 20, 28 and 35.
- The Listen bridge derives `¡Escucha y elige la foto!` or `... la frase!` from the
  upcoming cards through the same shared rule the card itself uses.
- The Speak bridge warns about the microphone before the OS permission dialog
  can appear. This is the course's first microphone use.
- `Automático` pill on Learn cards drains over the same 3 s window the advance
  timer uses. Non-interactive; reduced motion shows it settled.
- The first `complete-sentence` card explains once that every word is now blank
  and the bank holds exactly the words needed.

## What is derived, not authored

Briefings come from the authored stage boundaries at runtime. No lesson content
changed: lesson 1.1 keeps its 42 cards and its `10/10/8/7/7` rhythm, and the
backend structure tests, course fingerprint, resume checkpoints, first-attempt
scoring and Engine QA card navigation are untouched. Copy resolves from a
per-stage Spanish table plus each lesson's own `vocabulary` and card prompts, so
every standard lesson works without being keyed to a lesson ID. Mission lessons
return no briefing.

Briefings follow forward progress only. Backward navigation, the section picker,
section review, an Engine QA card jump and a restored resume checkpoint all
behave exactly as before. `Empezar de nuevo` counts as a fresh run and reopens
the lesson briefing.

The briefing is visual-only Spanish and never reaches course audio. Prompt
autoplay and the automatic Learn advance both wait behind it.

A briefing replaces the page curl at that boundary rather than wrapping it. The
briefing renders in place of the card, so `pageRef` is unmounted while it is on
screen and `startPageTurn` takes its existing plain-navigate path: no curl and no
`chapter-arrival-v2.mp3` when entering or leaving a briefing. The full-screen
change of surface is the transition. Backward movement, within-section
advancement, section-picker jumps and every web transition keep the curl, and
guardrail section 8 was amended in the same commit so the two rules agree.

## Completa tile flight

Placing a word — by tap or by drop — commits and validates first, exactly as
before, then animates a copy of the tile from the bank into the slot over 220 ms.
A measurement or animation failure can never block progress. Reduced motion
skips it. This matches the 700 ms flying answer the guided `complete2`/`complete4`
cards already had, so both halves of the Use section now behave alike.

## Verification

- Mobile TypeScript passed.
- 12 new briefing checks and 7 sentence-construction checks passed, including
  boundary indices against the real generated lesson-1.1 snapshot, mission and
  malformed-lesson rejection, unknown-stage fallback, the single-live-tree render
  order that produces the no-curl transition, and the tile-flight geometry.
- `lesson-page-turn` (21) and `section-review` contract tests still pass: the
  `advance()` tail is preserved verbatim inside `commitAdvance`, there is still
  exactly one `playMissionSound('page-turn')`, and `review-complete` still appears
  exactly twice.
- 268 backend tests passed unchanged — the proof that no lesson content moved.
- `scripts/validate_lesson_cards.py --semantic-review-policy preview` passed.

### Pre-existing, not caused by this change

The default Production-strict `validate_lesson_cards.py` fails on `origin/main`
today with 3,423 missing manifest runtime image usages and 3,636 stale renderer
signatures. Running it against a pristine `origin/main` worktree produced
byte-identical output to this branch, so this work adds no validation problems.
Under the Preview policy those become the expected advisories and the run passes.

### Still required

Installed-device review on the protected Preview: the felt pacing of the five
briefings, the countdown against real audio timing, the tile flight on touch and
after rotation, the microphone warning ahead of the permission dialog, and
`Continuar` reachability on a small phone, in landscape, and at enlarged text.
A JavaScript export and node checks are not on-device evidence.
