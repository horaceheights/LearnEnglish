# SpanGlish Product Roadmap

This is the persistent source of truth for product priorities. When work is
completed, update this file in the same commit. When asked "what is next?",
select the highest-value unfinished item whose dependencies are complete.

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

Do not scale course content massively until the reusable learning engine is
robust. New content created before the engine stabilizes would multiply
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

Mass content production begins only when:

- [ ] Existing lessons complete reliably across the supported device matrix
- [x] Core activities are represented by reusable schemas, not lesson-specific code
- [x] A new lesson can be assembled mostly from data and existing activity types
- [ ] Progress, retries, help usage, and mastery signals persist correctly
- [ ] Audio, image, animation, and haptic behavior is consistent
- [ ] Interrupted lessons resume safely
- [ ] Backend/network failures recover without losing learner work
- [ ] Accessibility and text/layout scaling have been tested
- [x] Automated content validation catches broken cards and missing media
- [ ] Regression and release checklists are repeatable

After this gate passes, the same engine can support rapid, large-scale course
creation without proportionally increasing engineering effort.

## Status key

- `[ ]` Not started
- `[~]` In progress or partially implemented
- `[x]` Completed and verified
- `[R]` Research item

## Current baseline

- Android internal-preview APK with EAS over-the-air updates
- Visible runtime/update identifier on the home screen
- Render-hosted backend with automatic deployment
- Portrait home screen and landscape lessons
- Five production lessons plus a temporary five-card pronunciation test lesson
- Shared automatic pronunciation flow with Azure scoring
- Consolidated lesson header, larger uncropped images, and visible lesson exit
- Grammar answers animate toward sentence blanks and repeat the completed sentence
- In-app error boundary replaces unexplained blank screens
- Internal Engine QA hub can jump directly to lessons, stages, and cards
- Persistent QA checklist: `ENGINE_QA_CHECKLIST.md`

---

## P0 — Reliability and complete-course verification

Nothing moves ahead of a serious defect that prevents lesson completion,
corrupts progress, or produces unreliable learning feedback.

- [ ] Run every card in every lesson on a physical Android phone
- [~] Use the internal Engine QA hub to complete `ENGINE_QA_CHECKLIST.md`
- [ ] Verify correct, incorrect, retry, help, audio, and completion paths
- [ ] Test leaving during playback, recording, grading, and animation
- [ ] Test screen lock, app switching, calls, lost internet, and backend cold starts
- [ ] Test small, medium, and large Android landscape dimensions
- [x] Add production crash reporting and structured diagnostics
- [x] Show an in-app error screen instead of an unexplained blank screen
- [ ] Persist the learner's active lesson/card before interruption
- [ ] Create a repeatable pre-release checklist
- [ ] Remove the temporary pronunciation test lesson after pronunciation is finalized

### P0 exit criteria

- Every current lesson completes without a known crash
- Interruptions do not unexpectedly lose completed work
- Every runtime failure identifies app version, lesson, card, and operation

---

## P1 — Complete learning foundation

### Accounts and progress

- [ ] Implement production authentication and account recovery
- [~] Synchronize learner profile and session data
- [~] Save lesson completion and first-attempt scores
- [ ] Resume unfinished lessons
- [ ] Show completed lessons, current unit, and total course progress
- [ ] Track learning time and attempt history

### Learner controls

- [ ] Add slow, normal, and repeat voice controls
- [ ] Add sound and haptic settings
- [ ] Add text-size and accessibility settings
- [ ] Add English/Spanish instruction preferences
- [ ] Add controls for saving or deleting personal recordings

### Content architecture

- [ ] Finalize Course → Unit → Lesson → Sublesson → Activity → Card hierarchy
- [~] Make lesson content data-driven and reusable
- [~] Validate lesson content automatically before deployment
- [ ] Separate temporary QA content from production curriculum

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
- [~] Pronunciation activities
- [ ] Short conversational response activities
- [ ] Shared animation, sound, haptic, help, scoring, analytics, and offline contracts

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

- [~] Automatic model → cue → record → grade → retry/pass flow
- [~] Microphone/listening animation
- [ ] Drive the visualizer directly from actual microphone volume
- [ ] Highlight words in sync with model playback
- [ ] Tap an individual word to hear it
- [ ] Offer slow and normal-speed playback
- [ ] Display syllable breakdown
- [~] Identify the weakest word
- [ ] Show phoneme feedback only when confidence is sufficient
- [ ] Replay the learner's recording
- [ ] Compare model and learner recordings
- [ ] Show improvement across attempts
- [ ] Keep a personal difficult-word list
- [ ] Trigger focused practice after repeated difficulty
- [ ] Convert scores into specific, supportive coaching

---

## P6 — Offline use and performance

- [ ] Cache current and next-card images/audio
- [ ] Download complete lesson or unit packs
- [ ] Complete eligible activities offline
- [ ] Queue progress and analytics locally
- [ ] Synchronize safely when connectivity returns
- [ ] Clearly mark activities that require internet
- [ ] Reduce app and EAS update sizes
- [ ] Optimize image dimensions and formats
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
2. Add crash reporting and structured card-level diagnostics.
3. Add resume-in-progress.
4. Finalize the permanent course/activity data schema.
5. Build reusable drag-and-drop sentence construction.
6. Add tap-any-word audio.
7. Add actual microphone-volume visualization.
8. Begin vocabulary and grammar mastery tracking.

## Product rule

Build reusable systems rather than isolated effects:

- Motion effects belong to a shared interaction engine.
- Mistakes feed the mastery and review engine.
- Pronunciation history determines when focused coaching is offered.
- The future mouth coach is triggered by evidence, not shown indiscriminately.
- Rewards celebrate measurable learning rather than taps alone.
