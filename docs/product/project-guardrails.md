# SpanGlish Project Guardrails

Last reviewed: 2026-08-22

This file is the durable product and engineering memory for SpanGlish. It exists so established decisions survive context compaction and new Codex tasks. Read it before changing lessons, shared lesson behavior, media, audio, pronunciation, or release code.

The detailed A1 syllabus and Unit 1 roadmap live in [`course-design-a1.md`](course-design-a1.md). This file defines the reusable rules that the implementation must preserve.

## 1. Change Discipline

1. Implement the requested change without removing or redesigning unrelated behavior.
2. Reuse the established shared component or authoring pattern. Do not fix the same issue independently in every lesson.
3. Before changing shared behavior, identify which stages and lessons use it and check the effect across all of them.
4. Do not introduce a new interaction pattern in a new lesson unless the user explicitly approves it as a new standard.
5. Every recurring regression should gain an automated guardrail when practical.
6. Preserve unrelated working-tree changes. Never stage, revert, or overwrite them.
7. When an approved standard changes, update this file in the same commit.

### Cross-platform parity

- Canonical lesson content lives in the backend lesson files. Web and mobile must present the same lesson order, prompts, answers, stage behavior, and media intent.
- A change to lesson content must regenerate the embedded mobile Preview snapshots.
- A shared learner-facing behavior must be checked on both web and mobile unless the request is explicitly platform-specific.
- Do not consider a fix complete because it works on desktop Chrome. Mobile Android Chrome and the Expo Preview app are required checks for mobile-sensitive audio, microphone, video, and layout behavior.
- Every active lesson-stage header must show the canonical unit and lesson number in a compact line above the stage label, inside the same header surface.

## 2. Canonical Lesson Engine

Every standard lesson follows this visible sequence:

`Learn -> Recognize -> Listen -> Speak -> Use`

- Do not add a visible Grammar section to the standard beginner flow.
- Grammar is learned through interactive completion, selection, rearrangement, and repeated use.
- A separate grammar-heavy mode may be designed later, but it is not part of the current lesson shell.
- The shell, stage order, navigation, feedback, and visual language should remain predictable across lessons.
- Content difficulty progresses in small steps. A lesson should rely only on language introduced or reinforced earlier.

### Learn

- Introduce new vocabulary before testing it.
- Begin with one clear image or scene for a new concept whenever possible.
- Use two-choice slides before moving to four-choice slides for new vocabulary.
- Keep the visual unambiguous. The intended person, relationship, object, place, or action must be obvious without reading the answer.
- Reuse established family characters so learners can infer relationships and context.
- When contrasting states such as sitting and standing, use the same person whenever possible.

### Recognize

- Connect image and text in both directions over the lesson journey:
  - phrase or audio -> image
  - image -> phrase
- On image-to-sentence identity cards, show the short identity question (`Who is he?`, `Who is she?`, or `Who are they?`) above the image and play that question before enabling the sentence choices. Do not hide the question until after selection or combine the correct answer into the upfront prompt. After a correct choice, play only the chosen answer sentence, such as `They are the parents.`
- Correct-answer placement must not stay in one predictable position.
- Never reveal the correct answer through a different border, fill, loading state, or layout before selection.
- Text-answer cards must not depend on images alone; learners must also recognize written language.

### Listen

- Play the prompt audio before the learner selects an answer.
- Do not replay the same prompt after a correct selection unless the card explicitly has different answer audio for a pedagogical reason.
- Include an icon-only speaker replay control. Do not add explanatory text beside it.
- Include both audio-to-image and, where useful, audio-to-text recognition.
- Keep answer text hidden when the activity is intended to test listening against images.

### Speak

- The model audio must finish completely before the ready beep and microphone activation.
- The microphone animation starts when recording actually starts, not before the beep.
- Play one clear ready beep. Do not emit an extra beep during the transition to the next card.
- Show grading feedback as soon as recording and evaluation finish.
- A1 scoring is intentionally forgiving, but it is not one fixed percentage. The backend policy for the learner level and exercise type is authoritative; completeness and understandable sounds are valued above matching the model's speed or intonation. Exact thresholds belong in the versioned pronunciation policy, not duplicated in product copy.
- Do not require the learner to copy the guide's exact rhythm or pitch.
- Highlight words as the learner progresses through the sentence when timing data is available.
- On a graded failure, keep the feedback visible and wait for the learner to choose Retry after reading it. Do not replay or advance automatically.
- Retry guidance is in simple Spanish and may explain mouth or tongue placement.
- A no-speech result may replay the model automatically for at most three recovery rounds. After that, keep a friendly message visible and wait for Retry. Service errors must become friendly learner messages, never raw provider JSON.
- Azure is the current pronunciation assessment provider. Speechace is no longer the active scoring path.

### Use

- Use interactive completion, choice, ordering, or matching. Do not turn this stage into a written grammar lecture.
- Mix related forms instead of batching every `is` item before every `are` item.
- Include affirmative and negative forms only after each form has been introduced clearly.
- End with a short completion or mission activity that uses previously learned language.
- Completion blanks are visual UI only. Never send literal underscores or placeholder characters to TTS. Before selection, speak the incomplete sentence with a short silent pause at the blank; speak the completed answer only after the learner answers.

## 3. New-Word Learning Journey

A word is not considered learned after one exposure. New language should travel through this sequence:

1. Clear introduction with image or scene and audio.
2. Recognition with a small option set.
3. Recognition with a larger and randomized option set.
4. Image-to-text and text-or-audio-to-image connection.
5. Listening without relying on visible answer text.
6. Speaking with beginner-friendly scoring and retry support.
7. Use in a short sentence or interaction.
8. Spiral review in later lessons and the unit review.

Do not force every word through every step in a single lesson when that would make the lesson repetitive. The journey can continue across later lessons, but the roadmap and tests must make that continuation intentional.

- On `Learn` introduction cards, words declared in the lesson vocabulary contract use the shared readable yellow emphasis and one brief shine/stretch animation. The animation plays once per card, never loops, never shifts layout, and respects reduced-motion settings.

## 4. Mobile Layout Guardrails

- Design for the usable phone viewport, including Android system bars and enlarged font settings.
- After a wrong lesson choice, keep the encouragement first and place one short Spanish teaching hint directly below it. Explain the relevant rule (`is`, `are`, `not`) when available; otherwise point the learner back to the person, group, or action without adding a long instruction block. Identity-choice hints must name the exact visible mismatch, such as parents versus grandparents, instead of repeating one generic `is/are` explanation across the section.
- Essential choices, feedback, and navigation must fit without being hidden below the system navigation area.
- Keep the lesson header compact. The stage strip communicates progress without consuming unnecessary vertical space.
- Portrait phrase-answer tiles are full-width, short horizontal rows stacked at the bottom.
- Phrase tiles use one-line auto-sizing. Never split a word in half to fit a narrow tile.
- Image choices retain their established image grid or stack layout; the horizontal phrase rule does not convert image choices into text rows.
- Text must remain readable and inside its container on small phones and tablets.
- A shared component change must be verified against two-option and four-option cards.
- Do not use a correct-answer visual treatment until after the learner selects an answer.
- The SpanGlish lesson logo remains a navigation control back to the lesson home/menu.

## 5. Image Guardrails

- Images are central to the product, but lessons must also test text and audio without images.
- Every newly created course still uses the shared 3:2 landscape canvas (1536x1024 or an exact equivalent ratio). Preserve the complete subject with a neutral or softly extended background instead of changing the ratio or cropping meaning. The content validator must reject new `a1_` lesson assets with any other ratio.
- Every `a1_` still referenced by an embedded mobile lesson or the unit browser must be bundled through a literal Metro `require` and verified during Preview preflight. Do not ship embedded lesson JSON that depends on a new remote image deployment.
- School scenes must be identified through the entrance, pupils, and clearly visible backpacks rather than the word `SCHOOL`. Keep the setting broadly recognizable to learners in Latin America and the United States without flags or region-specific institutional text.
- Place and transport images must communicate through visual context rather than answer text. Only the hospital asset may use a single `H`; restaurant, train, station, bank, pharmacy, library, school, and store assets must contain no venue words or answer letters. A bank scene must include an unmistakable banking action or object, such as a clearly visible customer using an ATM, rather than relying on generic institutional architecture.
- The intended answer must be visually unambiguous. Avoid near-duplicate scenes for reading versus studying, smiling versus talking, or standing versus sitting.
- For negative action or posture prompts, the correct image must visibly exclude the negated state. Showing people talking while seated is not a valid answer for `They are not sitting`; use a clearly upright or moving scene.
- Judge every option against the complete spoken or written prompt, not its asset name or intended option ID. Every distractor must be visibly false for that complete prompt.
- Do not use category subsets or supertypes as image distractors when both can satisfy the prompt. Brothers, sisters, and babies are children; parents and grandparents are adults; and a family scene contains children, siblings, parents, and grandparents.
- Negative image questions should use an exact two-scene contrast, preferably with the same subject visibly doing versus not doing the named action. Do not offer several unrelated scenes that all technically satisfy `not`.
- A specific identity choice cannot be driven by `Who is he?`, `Who is she?`, or `Who are they?` alone. Include the identifying answer in the audio or establish an unmistakable antecedent before showing choices.
- Do not crop heads, faces, hands needed for meaning, or the action itself.
- Preserve the full subject with `contain` or an equivalent normalized frame when cropping would remove meaning.
- Use consistent aspect ratios and framing for images serving the same card role.
- Every A1 lesson and unit has its own explicit title image that represents that lesson or unit's primary learning focus. Title imagery is globally unique across the course: no two lessons, no two units, and no lesson-unit pair may reuse the same picture, including identical picture content saved under different filenames. Reserve each unit-level image for that unit's menu and header only.
- Reuse established people and family members when continuity helps learners infer meaning.
- Family compositions must match previously established family members and relationships.
- Before accepting a generated image, inspect it at the actual mobile card aspect ratio, not only as a source file.

## 6. Motion and Video Guardrails

- Motion is a selective teaching aid, not decoration and not required on every card.
- Use motion when it clarifies an action or concept that can be ambiguous in a still image, such as running, walking, swimming, reading, writing, studying, talking, working, cooking, playing, eating, drinking, or sleeping.
- In multi-choice slides, keep action choices visually still by pausing their video surfaces. After the correct choice, the selected surface may play a short two-to-three-second motion confirmation.
- A single-card vocabulary introduction may play its teaching clip directly.
- When an action clip exists, its paused first frame is the card's normal visual surface. Do not render a separate still image and then swap to video after selection; play the already-mounted video surface instead. A still image is allowed only for reduced-motion mode or a genuine video-load failure.
- Single-card teaching clips use the full available card width and the main visual height. Do not force them into a short 16:9 strip inside a large empty card.
- Generated clips must be silent. Do not generate talking mouths unless speech itself is the lesson target.
- Normalize action clips to the shared 16:9 frame, currently 640x360, with no encoded black sidebars.
- Action-video surfaces must fill their clipped card edge-to-edge. Use `cover` plus a slight player-layer overscan on web and native; never use `contain` for lesson action clips because it exposes black sidebars.
- Version video URLs whenever a clip is replaced or normalized so mobile and CDN caches cannot keep serving an obsolete copy with old framing or black bars.
- The still and video layers must occupy exactly the same frame. Switching to video must not reveal the old image, resize the subject, or create gaps.
- Preserve the whole subject. Use a blurred side fill when source framing cannot fill 16:9 without cropping important content.
- Compress clips after generation while preserving enough clarity for the teaching action.
- Normalize clips from their original raw source at the shared 640x360 frame and CRF 20. Never normalize an already compressed lesson export in place; repeated lossy passes visibly soften full-height mobile cards and shorten trimmed clips.
- To reduce generation cost, prefer one source generation containing two clearly separated actions, then trim it into two focused clips when the provider can follow that prompt reliably.
- Inspect a contact sheet or representative frames before adding a generated clip to lessons.
- Do not bulk-generate after a failed or ambiguous sample. Correct the prompt and validate one result first.
- Never retry a paid generation repeatedly without explaining the failure and likely added cost.

## 7. Audio Guardrails

- Course audio uses provider-neutral semantic roles. The approved primary provider is ElevenLabs Premium and the approved provider fallback is OpenAI; device or browser speech synthesis is an emergency fallback only.
- Web and mobile must resolve the same semantic role for the same canonical card. The standard roles are `teacher`, `question`, and `answer`; named character roles require an explicit content assignment. Never choose a learner-facing voice from a card, lesson, or text hash.
- Provider voice IDs, model versions, and role-to-voice mappings belong in the versioned audio profile rather than lesson content or this guardrail.
- A1 delivery is clear and moderately slow, with understandable word separation, but not unnaturally slow.
- Pronunciation model audio may emphasize syllables, especially `-ing`, but the listener activates only after playback ends.
- When new lesson content is added, pre-generate all expected audio and update both the backend cache and static frontend audio manifest before release.
- Static audio exists to reduce first-use delay, provider cost, and robotic fallback behavior.
- Do not show internal audio-generation or scoring terminology to learners. A visible neutral processing state such as `Un momento...` is allowed.
- Target phrases and individual pronunciation words remain tappable for audio replay where that interaction is available.
- Every learner-facing lesson prompt supports the established double-tap Spanish translation. New lesson prompts must not ship with the generic `Traducción no disponible todavía.` fallback. Keep the double-tap window usable with Android's completed-press timing; do not shorten it to a desktop-fast interval that turns ordinary double taps into two replay taps.
- Every course-audio boundary must sanitize visual answer blanks into a silent pause. No provider or browser fallback may receive literal underscore runs.
- Treat `_`, repeated underscores, `[pause]`, and equivalent visual blank markers as control data, never speech content. Strip or convert them to timed silence before synthesis, and audit generated completion audio through the end of each clip for unexpected trailing speech, filler, or gibberish before release.

## 8. Feedback and Interaction

- Cold-start, course, and lesson loading surfaces use the shared playful SpanGlish loader. Keep backend lifecycle details such as server wake-up or connection state out of learner-facing loading copy, and respect reduced-motion settings.
- Correct answers play the established success sound and retain visible word-level feedback where applicable.
- Wrong answers play the established retry sound and retain the correction/help until the learner acts.
- Do not apply green, orange, or red pronunciation colors while recording or scoring. Keep words neutral until a real result is available.
- Pronunciation color meaning is stable: green is strong, orange is acceptable but needs attention, and red is failed and requires retry.
- When detailed scoring is available, color only the weak word or syllable rather than adding an unexplained red layer beneath an otherwise successful word.
- The microphone/listening state is communicated graphically. Do not restore visible internal labels such as `Listening`, `Scoring`, or `Checked`.
- Do not auto-dismiss useful correction instructions before the learner can read them.
- A Retry action must restart the complete intended flow, including model playback when that is part of the exercise.
- Do not allow rapid automatic transitions to hide feedback.
- User-facing messages are simple and encouraging, with Spanish support for operational or pronunciation guidance at A1.

## 9. Current A1 Course Contract

The A1 course contains seven units with ten lessons in numeric order per unit:

1. `People, Family, and Actions`
2. `Places, Objects, Numbers, and Colors`
3. `Me and Other People`
4. `Home and Daily Life`
5. `Food, Drinks, and Shopping`
6. `Around Town`
7. `Everyday Needs and A1 Integration`

Unit 1 lessons are:

1. `1.1 People and Core Actions`
2. `1.2 He and She`
3. `1.3 Two People: They and Are`
4. `1.4 Children and Siblings`
5. `1.5 Parents and Grandparents`
6. `1.6 Family Actions`
7. `1.7 Is, Are, and Not`
8. `1.8 Who Is He? Who Are They?`
9. `1.9 Unit 1 Spiral Review`
10. `1.10 Family Scene Mission`

Do not reuse old lesson IDs or reintroduce the removed standalone pronunciation lesson. Pronunciation belongs inside each lesson's Speak stage.

Units 2-7 use the same ten-lesson rhythm: eight stepped lessons, a no-new-language spiral review in lesson 9, and an integrated mission in lesson 10. The exact titles, goals, vocabulary progression, grammar functions, prerequisites, review vocabulary, and speaking outcomes live in [`course-design-a1.md`](course-design-a1.md) and the canonical backend lesson files.

The course browser must preserve the curriculum hierarchy. Its default view shows all seven units and their outcomes. Selecting a unit shows only that unit's ten lessons, and the learner must have an obvious way to return to the all-units view. Do not flatten all 70 lessons into the first screen.

## 10. Authoring and Verification

Primary curriculum sources:

- [`course-design-a1.md`](course-design-a1.md): syllabus, vocabulary progression, and roadmap.
- `scripts/build_unit_1_lessons.mjs`: reproducible Unit 1 lesson authoring.
- `scripts/build_a1_units_2_7.py`: reproducible Units 2-7 lesson authoring from the approved course canvas.
- `backend/lessons/unit_1/`: canonical lesson content.
- `backend/lessons/unit_2/` through `backend/lessons/unit_7/`: canonical Units 2-7 content.
- `mobile/src/generated/`: embedded Preview lesson snapshots.

Required checks for curriculum or shared lesson changes:

1. Run `python scripts/validate_lesson_cards.py` using the project Python environment.
2. Run the backend lesson-structure tests.
3. Run `mobile/scripts/verify-preview.ps1` for mobile changes.
4. Build the web frontend when shared web lesson code or public media changes.
5. Inspect representative phone layouts, including the longest phrase and cards with two and four choices.
6. Inspect new or normalized images and video frames visually.

Existing automated guardrails cover lesson order, vocabulary contracts, five-stage structure, valid assets and answers, unique visible choices, family-category overlap, exact negative listening contrasts, complete identity prompts, bidirectional recognition, hidden-text listening, single-image speaking, interactive Use cards, media loading, pronunciation lifecycle, and horizontal phrase-option layout. Extend these checks when a new reusable rule is approved.

## 11. Release Rules

- Follow `AGENTS.md` for the exact release workflow.
- Preview is the default destination after an OTA-compatible mobile change passes verification.
- Never publish or promote to Production without explicit user approval after Preview testing.
- Native dependency, Expo configuration, permission, native module, or app-version changes require a new build rather than an OTA update.
- Keep generated lesson snapshots, audio manifests, and committed media synchronized with the canonical lesson files.

## 12. Decision Log

- 2026-08-18: Unit 1 standardized to ten lessons using the five-stage shell.
- 2026-08-18: Existing action clips normalized to a consistent 16:9 frame; selective motion retained as a teaching confirmation.
- 2026-08-18: New Unit 1 audio pre-generated and bundled rather than deferred to first use.
- 2026-08-19: Portrait phrase-answer tiles standardized as stacked horizontal, single-line, auto-sized rows.
- 2026-08-19: Repository guardrail memory established and made mandatory through `AGENTS.md`.
- 2026-08-19: Image-choice ambiguity rules expanded to cover full-prompt truth, family-category overlap, negative contrasts, and identity context.
- 2026-08-19: Unit 1 action cards standardized on one paused-video surface, full-size single-card clips, and versioned video URLs.
- 2026-08-19: Completion-card audio standardized on silent blank pauses; literal placeholders are prohibited at every TTS boundary.
- 2026-08-19: Unit 1 new-vocabulary introductions standardized on yellow text with one brief, reduced-motion-safe emphasis animation.
- 2026-08-19: Negative posture cards now require the negated posture to be visibly absent, with a validated asset contract for `They are not sitting.`
- 2026-08-19: Action-video players standardized on edge-to-edge cover with clipped overscan and independently versioned video caches.
- 2026-08-19: Active lesson headers standardized on a compact `UNIT n | LESSON n.n` context line above the stage label.
- 2026-08-19: Wrong-answer feedback now pairs encouragement with one concise Spanish learning hint beneath it across web and mobile lessons.
- 2026-08-21: Learner-facing cold-start and lesson loading standardized on one reduced-motion-safe animated mascot surface with no backend server-status language.
- 2026-08-21: Action-video normalization standardized on CRF 20 from original raw sources; re-normalizing compressed lesson exports is prohibited.
- 2026-08-22: Graded pronunciation failures standardized on persistent feedback and learner-initiated Retry; no-speech recovery may auto-replay for at most three rounds before requiring Retry.
- 2026-08-22: Pronunciation acceptance standardized on the backend's versioned learner-level and exercise-type policy instead of a single product-wide percentage.
- 2026-08-22: Course audio standardized on provider-neutral semantic roles shared by web and mobile, with ElevenLabs Premium primary, OpenAI fallback, and no hash-selected voices.
- 2026-08-22: New course still images standardized on one 3:2 landscape canvas so prompt and choice surfaces do not change apparent size between cards.
- 2026-08-22: School scenes standardized on pupils with backpacks and architectural context rather than an explicit English `SCHOOL` sign.
- 2026-08-22: Place and transport imagery standardized as answer-text-free except for the hospital's single `H`; banks require an obvious ATM-use cue instead of generic architecture.
- 2026-08-22: Completion-audio QA expanded to reject unexpected trailing speech or gibberish after blank-marker sanitization.
- 2026-08-22: The A1 roadmap standardized on seven units with ten lessons each; every unit ends in a no-new-language spiral review and an integrated mission.
- 2026-08-22: Course browsing standardized on an all-units overview followed by a single-unit lesson view with an explicit return action; the 70 lessons must not be flattened into the initial menu.
- 2026-08-22: Embedded A1 Preview lessons standardized on bundled still images with an automated snapshot-to-Metro completeness check, so OTA curriculum releases cannot point at undeployed remote assets.
- 2026-08-23: A1 course browsing standardized on 77 globally unique 3:2 title images across all 70 lessons and 7 units; duplicate picture content is prohibited even when saved under different filenames.
