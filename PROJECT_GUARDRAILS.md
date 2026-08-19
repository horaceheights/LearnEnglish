# SpanGlish Project Guardrails

Last reviewed: 2026-08-19

This file is the durable product and engineering memory for SpanGlish. It exists so established decisions survive context compaction and new Codex tasks. Read it before changing lessons, shared lesson behavior, media, audio, pronunciation, or release code.

The detailed A1 syllabus and Unit 1 roadmap live in `COURSE_DESIGN_A1.md`. This file defines the reusable rules that the implementation must preserve.

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
- A1 scoring is intentionally forgiving. The current target is approximately a 30 percent beginner threshold, with completeness and understandable sounds valued above matching the model's speed or intonation.
- Do not require the learner to copy the guide's exact rhythm or pitch.
- Highlight words as the learner progresses through the sentence when timing data is available.
- On failure, keep the feedback visible and let the learner choose Retry after reading it.
- Retry guidance is in simple Spanish and may explain mouth or tongue placement.
- No-speech and service errors must become friendly learner messages, never raw provider JSON.
- Azure is the current pronunciation assessment provider. Speechace is no longer the active scoring path.

### Use

- Use interactive completion, choice, ordering, or matching. Do not turn this stage into a written grammar lecture.
- Mix related forms instead of batching every `is` item before every `are` item.
- Include affirmative and negative forms only after each form has been introduced clearly.
- End with a short completion or mission activity that uses previously learned language.

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

## 4. Mobile Layout Guardrails

- Design for the usable phone viewport, including Android system bars and enlarged font settings.
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
- The intended answer must be visually unambiguous. Avoid near-duplicate scenes for reading versus studying, smiling versus talking, or standing versus sitting.
- Do not crop heads, faces, hands needed for meaning, or the action itself.
- Preserve the full subject with `contain` or an equivalent normalized frame when cropping would remove meaning.
- Use consistent aspect ratios and framing for images serving the same card role.
- Reuse established people and family members when continuity helps learners infer meaning.
- Family compositions must match previously established family members and relationships.
- Before accepting a generated image, inspect it at the actual mobile card aspect ratio, not only as a source file.

## 6. Motion and Video Guardrails

- Motion is a selective teaching aid, not decoration and not required on every card.
- Use motion when it clarifies an action or concept that can be ambiguous in a still image, such as running, walking, swimming, reading, writing, studying, talking, working, cooking, playing, eating, drinking, or sleeping.
- In multi-choice slides, keep choices as still images. After the correct choice, the selected image may play a short two-to-three-second motion confirmation.
- A single-card vocabulary introduction may play its teaching clip directly.
- Generated clips must be silent. Do not generate talking mouths unless speech itself is the lesson target.
- Normalize action clips to the shared 16:9 frame, currently 640x360, with no encoded black sidebars.
- The still and video layers must occupy exactly the same frame. Switching to video must not reveal the old image, resize the subject, or create gaps.
- Preserve the whole subject. Use a blurred side fill when source framing cannot fill 16:9 without cropping important content.
- Compress clips after generation while preserving enough clarity for the teaching action.
- To reduce generation cost, prefer one source generation containing two clearly separated actions, then trim it into two focused clips when the provider can follow that prompt reliably.
- Inspect a contact sheet or representative frames before adding a generated clip to lessons.
- Do not bulk-generate after a failed or ambiguous sample. Correct the prompt and validate one result first.
- Never retry a paid generation repeatedly without explaining the failure and likely added cost.

## 7. Audio Guardrails

- OpenAI course audio is the primary lesson voice. Browser speech synthesis is fallback only.
- Use one friendly, clear guide voice unless a card intentionally needs distinct question and answer voices.
- A1 delivery is clear and moderately slow, with understandable word separation, but not unnaturally slow.
- Pronunciation model audio may emphasize syllables, especially `-ing`, but the listener activates only after playback ends.
- When new lesson content is added, pre-generate all expected audio and update both the backend cache and static frontend audio manifest before release.
- Static audio exists to reduce first-use delay, provider cost, and robotic fallback behavior.
- Do not show internal audio-generation or scoring status messages to learners.
- Target phrases and individual pronunciation words remain tappable for audio replay where that interaction is available.

## 8. Feedback and Interaction

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

## 9. Current Unit 1 Contract

Unit 1 is `People, Family, and Actions` and contains ten lessons in numeric order:

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

## 10. Authoring and Verification

Primary curriculum sources:

- `COURSE_DESIGN_A1.md`: syllabus, vocabulary progression, and roadmap.
- `scripts/build_unit_1_lessons.mjs`: reproducible Unit 1 lesson authoring.
- `backend/lessons/unit_1/`: canonical lesson content.
- `mobile/src/generated/`: embedded Preview lesson snapshots.

Required checks for curriculum or shared lesson changes:

1. Run `python scripts/validate_lesson_cards.py` using the project Python environment.
2. Run the backend lesson-structure tests.
3. Run `mobile/scripts/verify-preview.ps1` for mobile changes.
4. Build the web frontend when shared web lesson code or public media changes.
5. Inspect representative phone layouts, including the longest phrase and cards with two and four choices.
6. Inspect new or normalized images and video frames visually.

Existing automated guardrails cover lesson order, vocabulary contracts, five-stage structure, valid assets and answers, bidirectional recognition, hidden-text listening, single-image speaking, interactive Use cards, media loading, pronunciation lifecycle, and horizontal phrase-option layout. Extend these checks when a new reusable rule is approved.

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
