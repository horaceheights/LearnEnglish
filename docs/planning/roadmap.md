# SpanGlish Product Roadmap

Last reviewed: 2026-09-05

This is the persistent source of truth for product priorities. When work is
completed, update this file in the same commit. When asked "what is next?",
select the highest-value unfinished item whose dependencies are complete.

Statuses reflect checked-in implementation, automated guardrails, and recorded
QA. Do not mark a physical-device or manual test complete based only on code or
an automated test.

## Product vision

SpanGlish will combine the strongest qualities of immersive, image-led
learning and highly engaging, adaptive practice, while adding capabilities
that existing language apps do not currently provide well.

The product should:

- Teach meaning directly through images, sound, context, and interaction
- Make practice feel playful without sacrificing instructional quality
- Adapt to each learner's vocabulary, grammar, listening, and pronunciation
- Give specific, actionable help instead of only marking answers wrong
- Support beginners with Spanish when necessary, then gradually remove it
- Use animation, audio, haptics, and visual coaching as teaching tools
- Preserve a clear path from beginner recognition to real conversation
- Eventually provide differentiated pronunciation and visual mouth coaching

## Engine-first strategy

The complete 70-lesson A1 curriculum is now authored and serves as the engine's
verification catalog. Do not begin another mass content expansion until the
reusable learning engine is robust; otherwise new content would multiply
inconsistent interactions, incomplete analytics, and future migration work.

The near-term product is therefore the engine itself:

1. Reliable lesson state and navigation
2. Reusable activity definitions
3. Shared animation, audio, haptic, and feedback behavior
4. Progress persistence and resuming
5. Mistake, mastery, and review data
6. Accessibility and device-responsive layouts
7. Offline/error behavior
8. Content validation and an efficient authoring workflow

### Content-scaling gate

Further mass content production begins only when:

- [ ] Existing lessons complete reliably across the supported device matrix
- [x] Core activities are represented by reusable schemas, not lesson-specific code
- [x] A new lesson can be assembled mostly from data and existing activity types
- [~] Progress, retries, and first-attempt scores persist locally across connectivity loss; help and mastery signals remain incomplete
- [~] Shared audio, image, animation, and feedback behavior is guarded; haptics remain incomplete
- [x] Interrupted lesson state resumes locally across tested lock, app-switch, force-close, ordinary-exit, and airplane-mode recovery paths
- [~] Backend/network failures retain the latest local checkpoint and pending completion; full queued analytics synchronization remains P6 work
- [~] Reduced-motion and responsive layout behavior exist; the accessibility/device matrix remains incomplete
- [x] Automated content validation catches broken cards and missing media
- [x] Regression and release checklists are repeatable

After this gate passes, the same engine can support rapid, large-scale course
creation without proportionally increasing engineering effort.

## Status key

- `[ ]` Not started
- `[~]` In progress or partially implemented
- `[x]` Completed and verified
- `[R]` Research item

## Current baseline

- Android internal-preview build with EAS over-the-air updates
- Protected Preview publication from the exact `release/preview` commit, with release-integrity checks
- Visible app version and seven-character release commit in update surfaces
- Render-hosted backend with automatic deployment
- Unit-first course browser with progress states for the current and completed lessons
- Complete A1 curriculum: 70 lessons in seven units of ten; standard lessons use Learn -> Recognize -> Listen -> Speak -> Use and declared mission lessons use one continuous chaptered challenge
- Canonical YAML lessons plus an embedded mobile catalog bound to fail-closed release-integrity checks
- Shared automatic pronunciation flow with Azure scoring
- Local in-progress lesson resume with first-attempt state preserved
- Consolidated lesson header, shared 3:2 course imagery, and confirmed lesson exit
- Grammar answers animate toward sentence blanks and repeat the completed sentence
- Completion prompts synthesize only the visible prefix and suffix fragments, stitched around at least 550 ms of digital silence; the missing answer never enters prompt TTS
- In-app error boundary replaces unexplained blank screens
- Internal Engine QA hub can jump directly to all 70 lessons, stages, and cards through a compact unit-first navigator that restores the last QA location
- Persistent QA checklist: [`../qa/engine-qa-checklist.md`](../qa/engine-qa-checklist.md)

---

## P0 — Reliability and complete-course verification

Nothing moves ahead of a serious defect that prevents lesson completion,
corrupts progress, or produces unreliable learning feedback.

- [ ] Run every card in every lesson on a physical Android phone
- [~] Use the internal Engine QA hub to complete [`../qa/engine-qa-checklist.md`](../qa/engine-qa-checklist.md)
- [~] Verify correct, incorrect, retry, help, audio, and completion paths
- [~] Test leaving during playback, recording, grading, and animation
- [~] Screen lock, app switching, ordinary exit, force-close, and airplane-mode checkpoint recovery passed on Android; test calls and backend cold starts remain
- [ ] Test small, medium, and large Android landscape dimensions
- [x] Add production crash reporting and structured diagnostics
- [x] Show an in-app error screen instead of an unexplained blank screen
- [x] Persist and restore the active card, scoring state, and pending completion locally across ordinary and airplane-mode interruption
- [~] Silently cache every immutable audio clip for a started lesson and continue offline without blocking; the pronunciation-only local listen-back fallback is implemented and awaits physical-device verification
- [x] Create a repeatable pre-release checklist
- [x] Remove the temporary standalone pronunciation test lesson and keep pronunciation inside each lesson's Speak stage
- [x] Enforce the 70-lesson catalog, course fingerprint, release identity, and canonical Preview ancestry before publication

### P0 exit criteria

- Every current lesson completes without a known crash
- Interruptions do not unexpectedly lose completed work
- Every runtime failure identifies app version, lesson, card, and operation

---

## P1 — Complete learning foundation

### Accounts and progress

- [ ] Implement production authentication and account recovery
- [~] Synchronize learner profile and session data
- [x] Save lesson completion and first-attempt scores
- [x] Resume unfinished lessons from local state after force-close, screen lock, app switching, ordinary exit, and airplane-mode interruption
- [~] Show completed lessons and current-unit progress; add a clear total-course progress summary
- [~] Store attempt history and session timestamps; expose learner-facing learning-time history

### Learner controls

- [ ] Add slow, normal, and repeat voice controls
- [ ] Add sound and haptic settings
- [ ] Add text-size and accessibility settings
- [ ] Add English/Spanish instruction preferences
- [ ] Add controls for saving or deleting personal recordings

### Content architecture

- [ ] Finalize Course → Unit → Lesson → Sublesson → Activity → Card hierarchy
- [x] Make lesson content data-driven and reusable through canonical YAML and shared schemas
- [x] Validate lesson structure, answers, translations, media, and embedded snapshots automatically before deployment
- [x] Keep QA on the production lesson catalog while isolating QA sessions and analytics
- [x] Implement the complete 70-lesson A1 dependency chain across seven units of ten
- [x] Encode intentional curriculum growth through richer constructions in lessons 1-8, fresh-scenario comprehensive reviews in lesson 9, and distinct applied missions in lesson 10
- [~] Restructure Unit 1 one lesson at a time with a learner review checkpoint after every pushed lesson; Lesson 1.1 `Meet the People` is the active pilot
- [x] Present the seven-unit hierarchy without flattening all 70 lessons into the initial menu

---

## P2 — Reusable interactive activity engine

Build each interaction once, then create future lessons mostly through content.

- [x] Image-to-word and sentence-to-image selection
- [x] Listen-and-select
- [x] Fill-in-the-blank selection
- [x] Animate a correct grammar word toward the sentence blank
- [ ] General drag-and-drop sentence building
- [ ] Reorder scrambled words
- [ ] Match related items
- [ ] Sort words, people, actions, and objects into categories
- [ ] Memory-card matching
- [ ] Tap words in the correct order
- [ ] Find the incorrect word
- [ ] Singular/plural pairing
- [ ] Timed listening challenges
- [x] Build the lightly gamified Lesson 10 mission shell, including explicit mission metadata, continuous chapter progress, and accessible word-part-to-word and word-to-sentence tile challenges
- [~] Add measured responsive tile layout with drag clamping, tap alternatives, visible recovery controls, and automated minimum-target checks; keyboard, screen-reader movement, and the complete phone/tablet/web physical viewport matrix still require verification
- [ ] Produce and review a small versioned ElevenLabs sound-effects pack for mission feedback and transitions
- [x] Pronunciation activities
- [ ] Short conversational response activities
- [~] Shared animation, sound, help, scoring, analytics, and offline contracts; haptics remain unimplemented

### P2 exit criteria

A lesson using existing activity types should require little or no new
application code.

---

## P3 — Learning intelligence and adaptive review

- [ ] Track mastery per vocabulary item
- [ ] Track mastery per grammar concept
- [ ] Track reading and listening separately
- [ ] Track pronunciation by word and reliable phoneme data
- [ ] Track recurring confusion pairs such as `is/are` and `he/she`
- [ ] Track response speed, retries, and help usage
- [ ] Create a personal review queue
- [ ] Add spaced repetition
- [ ] Reduce repetition for mastered material
- [ ] Increase support after repeated difficulty
- [ ] Gradually remove support as mastery grows
- [ ] Recommend the next best lesson
- [ ] Generate a short personalized warm-up

---

## P4 — Motivation and emotional design

- [ ] Daily and weekly learning goals
- [ ] Forgiving learning streaks
- [ ] XP, levels, stars, and achievements
- [ ] Vocabulary and pronunciation mastery milestones
- [ ] Personal-best celebrations
- [ ] Progress maps
- [ ] Optional reminders and weekly summaries
- [ ] Confetti and richer animation for meaningful milestones
- [ ] Haptics synchronized with success/error feedback
- [ ] Celebrate mastery of a previously difficult word
- [ ] Keep reward presentation appropriate for both adults and children

---

## P5 — Pronunciation 2.0

- [x] Automatic model → cue → record → grade → retry/pass flow
- [x] Microphone/listening animation
- [ ] Drive the visualizer directly from actual microphone volume
- [ ] Highlight words in sync with model playback
- [ ] Tap an individual word to hear it
- [ ] Offer slow and normal-speed playback
- [x] Display syllable breakdown and live recognized-syllable progress
- [x] Identify the weakest word
- [ ] Show phoneme feedback only when confidence is sufficient
- [ ] Replay the learner's recording
- [ ] Compare model and learner recordings
- [ ] Show improvement across attempts
- [ ] Keep a personal difficult-word list
- [ ] Trigger focused practice after repeated difficulty
- [~] Convert scores into specific, supportive coaching

---

## P6 — Offline use and performance

- [x] Bundle canonical A1 still images and silently cache all immutable audio for a started lesson while connected
- [ ] Download complete lesson or unit packs
- [~] Complete eligible non-pronunciation cards seamlessly offline after lesson data is available; physical-device verification of the whole-lesson cache remains
- [~] Queue lesson checkpoints and pending completion locally; attempt analytics still need a durable queue
- [~] Retry missing lesson-session and completion synchronization when connectivity returns; general analytics synchronization remains
- [~] Fall back to local pronunciation recording and learner listen-back without a grade after one Speak-only warning; physical-device verification remains
- [ ] Reduce app and EAS update sizes
- [~] Standardize course imagery on contract-bound WebP assets; complete hash-bound human semantic approval and continue size and delivery optimization
- [ ] Remove ordinary lesson-navigation dependence on Render availability
- [ ] Move production backend to an appropriate always-on plan when justified

---

## P7 — Teacher and parent capabilities

- [ ] Teacher/parent accounts and learner invitations
- [ ] Assign lessons and review sets
- [ ] Weekly progress summaries
- [ ] Difficult-vocabulary reports
- [ ] Grammar and pronunciation mastery reports
- [ ] Time-on-task reporting
- [ ] Classroom/family groups
- [ ] Exportable progress summaries
- [ ] Notify adults about meaningful patterns, not every mistake

---

## P8 — AI conversation practice

- [ ] Controlled conversations using already-learned vocabulary
- [ ] Role-play for school, work, shopping, restaurants, health, and travel
- [ ] Adjustable speaking speed and Spanish hints
- [ ] Conversation transcripts and post-session corrections
- [ ] Explicit speaking goals tied to lesson concepts
- [ ] Responses matched to learner level and confidence
- [ ] Safe recovery when the learner does not understand
- [ ] Pronunciation coaching within conversations
- [ ] Optional animated-avatar conversations

### P8 dependency

Conversation behavior must use learner history, current curriculum scope, and
mastery data. It should not be an unconstrained general chatbot.

---

## P9 — Visual mouth coach research

Offer this only after repeated, evidence-based difficulty with a supported
sound or word.

- [R] Select 5–10 words/sounds for a limited experiment
- [R] Validate coaching guidance with an ESL pronunciation expert or SLP
- [ ] Ask permission before activating the camera
- [ ] Capture a short mouth-focused clip
- [ ] Extract lip, jaw, mouth-opening, timing, and head-position landmarks
- [ ] Prefer on-device landmark extraction
- [ ] Combine visual landmarks with acoustic pronunciation results
- [ ] Use an animated face and internal-mouth diagram for correction
- [ ] Provide slow-motion demonstrations and another guided attempt
- [ ] Measure whether visual coaching improves later attempts

### Important limitation

Camera video can estimate visible lip and jaw movement but usually cannot
observe internal tongue placement, airflow, velum position, or vocal-cord
behavior. A word such as American English `girl` depends heavily on an
R-colored vowel and internal tongue shape. The coach must combine acoustic
analysis, visible landmarks, phoneme-specific teaching rules, and an animated
internal-mouth model rather than claiming the camera alone can diagnose it.

### Privacy requirements

- Explicit opt-in permission and a clear explanation
- No facial identity recognition
- No model-training reuse without separate consent
- Automatic deletion by default
- Encryption in transit and at rest
- Prefer landmarks over retaining raw face video
- Parent/guardian protections where legally required

---

## Recommended immediate sequence

1. Complete the P0 physical-device lesson audit.
2. Verify whole-lesson cached audio, the Speak-only offline warning/listen-back path, and offline completion notice on a physical Android phone.
3. Complete the remaining P0 backend cold-start and phone-call interruption audit.
4. Complete the Android viewport and accessibility matrix.
5. Finalize the permanent course/activity hierarchy and post-Preview mastery policy.
6. Queue progress and analytics locally, then synchronize safely after reconnecting.
7. Build reusable drag-and-drop sentence construction.
8. Add tap-any-word audio.
9. Add actual microphone-volume visualization.
10. Begin vocabulary and grammar mastery tracking.

## Product rule

Build reusable systems rather than isolated effects:

- Motion effects belong to a shared interaction engine.
- Mistakes feed the mastery and review engine.
- Pronunciation history determines when focused coaching is offered.
- The future mouth coach is triggered by evidence, not shown indiscriminately.
- Rewards celebrate measurable learning rather than taps alone.
