# SpanGlish Project Guardrails

Last reviewed: 2026-08-29

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
8. Treat the user's requested scope as a hard boundary. A visual-only request such as adding borders, colors, or rounded corners must not change layout, dimensions, spacing, image fit/crop/zoom, content, navigation, or interaction. If the requested result cannot be implemented without any change outside that scope, stop before editing and ask the user whether to proceed.

### Repository hygiene

- `origin/main` is the canonical integration line. The primary checkout returns to an up-to-date local `main` after recovery or task work; it must not remain parked on a stale feature branch.
- New task branches start from a freshly fetched `origin/main`. A divergent release or feature worktree is never a safe base merely because it contains a recent local change.
- Assume other coding tasks may be running concurrently. Use an isolated branch/worktree, inspect active worktrees and overlapping files before editing, and preserve unrelated changes. Before merging into or publishing from `release/preview`, fetch and incorporate the latest remote `release/preview`, then rerun release checks. If overlapping changes cannot be combined safely, stop and ask the user. Never publish a stale snapshot.
- At task start and completion, run the read-only repository hygiene audit and inspect branch divergence, registered worktrees, and dirty state.
- Once work is integrated, remove its clean worktree and retire its fully merged task branches. Dirty worktrees and unmerged branches require an explicit local-state review and a recoverable named snapshot before removal.
- Repository cleanup never changes `release/preview`, Expo channels, Production, or deployed state unless release work is explicitly requested and approved through the release workflow.
- Force-pushes, history rewrites, and silent discards are prohibited. Name the exact refs or paths before any destructive cleanup.

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
- On image-to-text object-identity cards, ask the short content question before the choices instead of showing a generic task instruction. Keep the question, visible answers, and answer audio grammatically aligned: `What is it?` pairs with `It is ...`, while `What is this?` and `What is that?` pair with `This is ...` and `That is ...`. Play the question with natural question intonation.
- Correct-answer placement must not stay in one predictable position.
- Never reveal the correct answer through a different border, fill, loading state, or layout before selection.
- Text-answer cards must not depend on images alone; learners must also recognize written language.
- On a negative image-choice card whose correct image shows one unambiguous positive action, keep the short negative sentence before selection. After a correct Recognize choice, replace the prompt with and speak the full contrast (`He is not cooking, he is working.`). Scale the completed prompt down responsively so it remains inside the two-line lesson header. In Listen, speak the same full contrast after a correct choice but keep the answer text hidden. Do not reveal the positive action before selection in either stage.

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
- Once every live pronunciation syllable is visibly recognized, leave the listening state immediately and show a neutral processing state while authoritative grading finishes. Native recording finalization must have a bounded timeout and recover to a learner-facing Retry; it may never remain on `Te escucho…` indefinitely.
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
- Completion blanks are visual UI only. Before selection, speak only the visible sentence fragments with at least 550 ms of digital silence at the blank; after selection, speak the completed answer. Never synthesize the missing answer as part of the prompt. Ending blanks use a rising elicitation tone on the visible prefix; when that prefix ends in the article `a`, quote that real word in the provider text to give it extra weight without inventing a pronunciation. Middle blanks use comma punctuation on the prefix plus the fixed silent gap before the visible suffix. Never send underscores, ellipses, `[pause]`, `[blank]`, `{blank}`, or equivalent markers to any TTS provider.

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
- When `not` is the active new concept in Lesson 1.7, keep it larger and in the shared yellow new-word treatment throughout visible teaching and recognition prompts. Outside `Learn`, the emphasis is static rather than replaying the introduction animation.

## 4. Mobile Layout Guardrails

- Design for the usable phone viewport, including Android system bars and enlarged font settings.
- After a wrong lesson choice, keep the encouragement first and place one short Spanish teaching hint directly below it. Explain the relevant rule (`is`, `are`, `not`) when available; otherwise point the learner back to the person, group, or action without adding a long instruction block. Identity-choice hints must name the exact visible mismatch, such as parents versus grandparents, instead of repeating one generic `is/are` explanation across the section.
- Essential choices, feedback, and navigation must fit without being hidden below the system navigation area.
- On portrait image-choice cards, reserve enough vertical room for the encouragement and a two-line teaching hint. When a 3:2 option stack would exceed the usable height, scale every option card uniformly from its available height while preserving the 3:2 frame; never hide the hint, distort the image, or change lesson content to make it fit.
- Four-image portrait choices remain a 2x2 grid and use one fixed 4:5 media viewport with a centered full-bleed crop. A window-like partial scene is acceptable when the answer remains unmistakable. Numbers, counts, prices, actions, spatial relationships, and other answer-critical cues must remain fully understandable; use a dedicated four-card reframe when the shared crop would hide or change them. Never stretch, distort, or convert the grid to another layout. This exception does not change one-, two-, or three-card layouts.
- Keep the stage-progress strip compact, but render the mobile unit/lesson context at 24 dp and the active section label at 30 dp on both phones and tablets. These labels remain in normal layout flow: the card area must measure the height left below them, and no one-, two-, three-, or four-card layout may overlap the header or extend beneath Android system navigation.
- Portrait phrase-answer tiles are full-width, short horizontal rows stacked at the bottom.
- Phrase tiles use one-line auto-sizing. Never split a word in half to fit a narrow tile.
- Image choices retain their established image grid or stack layout; the horizontal phrase rule does not convert image choices into text rows.
- Four image choices in portrait always use the established two-column by two-row grid. Two image choices retain their established stack. Borders, wrappers, feedback-space calculations, and other styling changes must not alter those arrangements or their card widths.
- Every text-only answer set uses at most three tiles across Recognize, Listen, and Use. Preserve the correct answer plus the first two authored distractors in their original relative order; this rule never changes image-choice counts or layouts.
- Text must remain readable and inside its container on small phones and tablets.
- A shared component change must be verified against two-option and four-option cards.
- Do not use a correct-answer visual treatment until after the learner selects an answer.
- Every learner-facing SpanGlish logo is an accessible navigation control back to home. During an active lesson, ask for confirmation before abandoning the lesson.

## 5. Image Guardrails

- Images are central to the product, but lessons must also test text and audio without images.
- Every newly created course still uses the shared 3:2 landscape canvas (1536x1024 or an exact equivalent ratio). Preserve the complete subject with a neutral or softly extended background instead of changing the ratio or cropping meaning. The content validator must reject new `a1_` lesson assets with any other ratio.
- One-, two-, and three-card option-media viewports use the established 3:2 shape. Four-image portrait grids use the approved fixed 4:5 viewport so the fixed 2x2 grid uses the available lesson area. Their 3:2 masters may use a centered, window-like crop when the concept remains unmistakable; answer-critical numerals, quantities, prices, actions, spatial relationships, and identifying object structure must remain inside the central safe area or receive a dedicated `*_four-card.webp` reframe.
- Never stretch, squash, or warp a person, object, or meaningful foreground detail to make an image fit. For square, portrait, or narrowly framed sources, extend or outpaint only the surrounding background from the original source so the subject keeps its natural proportions and detail; do not repeatedly rescale or re-encode a lesson export.
- Every learner-facing A1 course image resolves to an exact reviewed 3:2 source or 1536x1024 variant and fills its clipped viewport edge-to-edge on mobile and web. This includes unit thumbnails, lesson thumbnails, Learn visuals, Recognize prompts and choices, Listen choices, Speak model images, Use/Completa prompts, still posters, and every one-, two-, three-, or four-card layout across all 70 lessons and seven units. `contain` is reserved for non-course UI illustrations such as mascots, or as a runtime safety fallback for an unexpected unmapped asset; automated all-unit, all-section guardrails must report zero published course images relying on that fallback. Never expose internal padding, black or blurred side fill, or use a crop that removes an answer-critical head, face, hand, foot, body part, action, count, numeral, price, spatial relationship, or identifying structure. The four-card window-like crop may omit nonessential scene edges when the answer remains clear.
- Every `a1_` still referenced by an embedded mobile lesson or the unit browser must be bundled through a literal Metro `require` and verified during Preview preflight. Do not ship embedded lesson JSON that depends on a new remote image deployment.
- School scenes must be identified through the entrance, pupils, and clearly visible backpacks rather than the word `SCHOOL`. Keep the setting broadly recognizable to learners in Latin America and the United States without flags or region-specific institutional text.
- Place and transport images must communicate through visual context rather than answer text. Only the hospital asset may use a single `H`; restaurant, train, station, bank, pharmacy, library, school, and store assets must contain no venue words or answer letters. A bank scene must include an unmistakable banking action or object, such as a clearly visible customer using an ATM, rather than relying on generic institutional architecture.
- The intended answer must be visually unambiguous. Avoid near-duplicate scenes for reading versus studying, smiling versus talking, or standing versus sitting.
- Every authored scene contract must resolve to a literal depiction of that card's complete teaching concept. Never substitute a generic person, conversation, object, or other available stock image merely because the exact scene is missing. A selectable option tile depicts one answer concept only; its opposite, distractor, or comparison belongs in a separate tile, not a split-screen, grid, or second panel inside the same image. If no accurate source exists, create and review a dedicated 3:2 asset or stop the media build with an actionable error.
- Each image option owns an independent semantic contract. Its option concept and any explicit per-option scene contract are authoritative for object, quantity, color, action, identity, relation, polarity, and time; a card-level visual description may supply shared setting context only and must never replace, contradict, or override the option. In particular, the correct answer's scene description must never be copied onto distractor assets. Contract generation and validation must fail when one option's metadata claims another option's semantics.
- Lesson 2.5 `this`/`that` pairs use the same first-person room, nearby object, and matching distant object. In both states, the left hand keeps holding or gripping the nearby object. For `this`, the right hand points to that held nearby object; for `that`, the same right hand points to the matching distant object while the nearby object remains held and visible. The pointing target is the only teaching variable; never remove the nearby reference or both hands from the `that` state. Keep distant targets identifiable at mobile size, preserve a visibly stronger near/far size contrast, and stop the pointing fingertip visibly short of the distant object without overlapping its silhouette or implying touch.
- For negative action or posture prompts, the correct image must visibly exclude the negated state. Showing people talking while seated is not a valid answer for `They are not sitting`; use a clearly upright or moving scene.
- Judge every option against the complete spoken or written prompt, not its asset name or intended option ID. Every distractor must be visibly false for that complete prompt.
- A filename, asset ID, generation prompt, source description, manifest entry, or automated existence/dimension check is never evidence that an image is semantically correct. Before publication, a person must visually inspect every learner-facing lesson-card still, every final client-resolved still variant, and every mobile course-browser unit, lesson-row, and continue-card thumbnail crop at its real runtime framing against the complete teaching contract. The review must check the exact object, quantity, color, action or posture, identity or relationship, spatial relation, polarity or negation, time or schedule, and whole-scene context wherever those attributes apply. This requirement covers the correct image and every distractor independently; each distractor must be visibly false for the complete prompt rather than merely different by metadata.
- Still-image semantic approval is fail-closed and binds the complete reviewed runtime contract to the exact final rendered asset bytes through a cryptographic file hash. It also binds a role- and layout-specific render profile, its canonical framing policy, the relevant normalized mobile/web renderer sources, and any fixed viewport, fit, or focal-position values. Changing the prompt, audio, answer, distractor set, option role, source, pixels, crop, framing, renderer, viewport, fit, focal position, encoding, resolved client variant, or file bytes invalidates that approval and requires a new visual review. The implementation signature is deliberately conservative: even an unrelated edit inside a bound renderer file may return affected approvals to pending rather than risk retaining stale crop approval. Generated, composited, cropped, normalized, copied, mission, poster, and other derived still variants never inherit approval from a prompt, source image, sibling filename, or previously reviewed variant.
- A two-choice action option is reviewed against the dedicated first-visible-frame poster that learners actually see before playback, not the option's ordinary still and not the video. The poster must be a canonical lesson-media asset, resolve identically on mobile and web, and own its own hash-bound approval; the Lesson 1.7 reviewed still-only comparison remains exempt from the action-poster override.
- Course validation and release preflight must reject any published learner-facing lesson still or final client-resolved still variant whose semantic approval is missing, pending, rejected, stale, hash-mismatched, or scoped to a different runtime contract. An unreviewed generated or composite fallback is a release blocker, not an acceptable temporary substitute. Motion assets remain subject to the separate video guardrails and frame inspection in Section 6; a still-image approval does not approve a video.
- Do not use category subsets or supertypes as image distractors when both can satisfy the prompt. Brothers, sisters, and babies are children; parents and grandparents are adults; and a family scene contains children, siblings, parents, and grandparents.
- Negative image questions should use an exact two-scene contrast, preferably with the same subject visibly doing versus not doing the named action. Do not offer several unrelated scenes that all technically satisfy `not`.
- A specific identity choice cannot be driven by `Who is he?`, `Who is she?`, or `Who are they?` alone. Include the identifying answer in the audio or establish an unmistakable antecedent before showing choices.
- Do not crop heads, faces, hands needed for meaning, or the action itself.
- Preserve the full subject through a reviewed normalized 3:2 frame when cropping would remove meaning; extend or outpaint only the background rather than padding the published option tile.
- Use consistent aspect ratios and framing for images serving the same card role.
- Every learner-facing mobile lesson image uses the shared dark inset frame with rounded outer and inner clipping. This includes prompt or scene images in Recognize and Use (`Completa`), image choices, action posters, and Speak model images across every unit. Do not render a raw prompt image directly into the lesson card.
- Every Speak-stage model image uses the same inset 3:2 option-media treatment as the rest of the lesson: dark outer border, warm-neutral fallback, and rounded outer and inner clipping. Preserve the complete model subject inside that frame with a subject-preserving fit or a reviewed 3:2 variant; never reuse an option-card crop that reduces a person to only part of the head or body. Apply this through the shared pronunciation component, never as lesson-specific styling.
- Every A1 lesson and unit has its own explicit title image that represents that lesson or unit's primary learning focus. Title imagery is globally unique across the course: no two lessons, no two units, and no lesson-unit pair may reuse the same picture, including identical picture content saved under different filenames. Reserve each unit-level image for that unit's menu and header only.
- Reuse established people and family members when continuity helps learners infer meaning.
- Family compositions must match previously established family members and relationships.
- Before accepting a generated image, inspect it at the actual mobile card aspect ratio, not only as a source file.
- Every effective image used by the portrait four-card grid must appear in the versioned semantic-crop review manifest with its current content hash. New or changed assets require a regenerated 4:5 contact sheet and semantic review before that manifest is updated.

## 6. Motion and Video Guardrails

- Motion is a selective teaching aid, not decoration and not required on every card.
- Use motion when it clarifies an action or concept that can be ambiguous in a still image, such as running, walking, swimming, reading, writing, studying, talking, working, cooking, playing, eating, drinking, or sleeping.
- In multi-choice slides, show each action choice's matching still image until selection. After the correct choice, the selected surface may play a short two-to-three-second motion confirmation.
- The still poster and playing video of a video-backed option use the same shared option-media shape, inset, and rounded clipping. Do not let the motion layer bypass the option viewport standard.
- A single-card vocabulary introduction may play its teaching clip directly, but the video surface is display-only and must not expose a tap target or submit itself as an answer.
- On Android, do not rely on a paused video texture as the pre-selection image; it may report ready while remaining blank. Keep the exact matching still poster visible until correct-selection playback starts, then swap within the identical clipped frame. Retain the still for reduced-motion mode or a genuine video-load failure.
- Single-card teaching clips use the full available card width and the main visual height. Do not force them into a short 16:9 strip inside a large empty card.
- Generated clips must be silent. Do not generate talking mouths unless speech itself is the lesson target.
- Normalize action clips to the shared 16:9 frame, currently 640x360, with no encoded black sidebars.
- Action-video surfaces must fill their clipped card edge-to-edge. Use `cover` plus a slight player-layer overscan on web and native; never use `contain` for lesson action clips because it exposes black sidebars.
- Version video URLs whenever a clip is replaced or normalized so mobile and CDN caches cannot keep serving an obsolete copy with old framing or black bars.
- The still and video layers must occupy exactly the same frame. Switching to video must not reveal the old image, resize the subject, or create gaps.
- Preserve the whole teaching subject. When square or portrait source framing cannot fill 16:9 without cropping important content, center it over the shared solid warm-neutral card background (`#f2ebde`). Do not use black bars or blurred side fill.
- On exactly two-choice video cards, the pre-selection still must be a dedicated 3:2 poster derived from the first visible frame after the real player crop and overscan, so selecting the correct option never changes the subject scale or framing. This poster/video pairing is scoped only to two-choice cards; one-, three-, and four-choice cards retain their established media.
- A two-choice-only top-anchored 4:3 action crop may be generated from the original raw clip only after visual review confirms that all heads, faces, and teaching-relevant hands, tools, objects, and actions remain visible. The approved square-source variants are brother studying, children playing, father working, and parents talking. Mother cooking and girl walking retain their safer inset framing because tighter crops would hide the pan or feet. Never re-encode an already compressed lesson export to make this variant.
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
- Brian (`male-warm`) is retired from every active A1 route after full-course reverse-transcription found that 32 of 33 confirmed malformed recordings used that voice. Use-stage and conversational playback use Liam (`male-conversational`). Completion fragment generation receives at most one ElevenLabs retry using a different deterministic seed, then uses the approved OpenAI fallback for the same visible fragments before the established silent fail-safe. If OpenAI elides a visible one-word clause immediately before the blank, synthesize that word as its own visible unit and rejoin it before the fixed placeholder silence; never add a carrier word or the missing answer.
- If reverse-transcription or listening review shows that a deterministic short-word take is ambiguous, enumerate every approved `text + mode + variant + narrator` key in scope and replace each with the reviewed bundled take. A word-wide correction must cover its standalone Learn, Recognize, Listen, and Speak occurrences across web and mobile while leaving longer phrases containing that word unchanged. Pin the approved asset in automated QA; never use an unscoped text-only override.
- Do not show internal audio-generation or scoring terminology to learners. A visible neutral processing state such as `Un momento...` is allowed.
- Target phrases and individual pronunciation words remain tappable for audio replay where that interaction is available.
- Every learner-facing lesson prompt supports the established double-tap Spanish translation. New lesson prompts must not ship with the generic `Traducción no disponible todavía.` fallback. Keep the double-tap window usable with Android's completed-press timing; do not shorten it to a desktop-fast interval that turns ordinary double taps into two replay taps.
- Every ordinary course-audio boundary rejects visual answer blanks. Completion prompt audio uses a dedicated visible-fragment path: derive the exact prefix and suffix from the validated prompt contract, synthesize only those visible words, and stitch them around deterministic digital silence. The completed `answer_audio_text` is validation and post-selection audio only; it must never be submitted as the incomplete prompt. Beginning, middle, and ending blanks use this same path.
- Treat `_`, repeated underscores, ellipses, `[pause]`, `[blank]`, `{blank}`, and equivalent markers as control data, never speech content. The completion provider may receive only nonempty visible fragments with safe punctuation guidance: comma before a middle gap or a question mark for an ending elicitation. Never use device or browser speech as a completion fallback. Missing or invalid fragment audio must return a known valid silent clip rather than raw-placeholder, completed-answer, partial, or guessed speech.
- Static course-audio generation and transcript audits exclude visual-blank prompts from ordinary TTS while retaining their complete `answer_audio_text`. Preview verification must cover beginning, middle, and ending blanks across the complete course and prove that no raw placeholder or missing-answer word can reach the prompt provider.

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
- After a cold-start EAS update is successfully activated, show one popup confirming the update. The popup and the `Actualizar` menu row show only the current app version beside the seven-character Git commit (`Versión 1.6.0 · Commit 455d361`), matching Vercel and Expo. Do not expose build, Expo Update ID, or Group ID on those two surfaces, and do not show completion for an update that was downloaded but is not yet running.

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

Every Preview and Engine QA release must embed the same complete A1 catalog: Units 1-7 with exactly ten lessons per unit (70 lessons total). A targeted QA or audio update may change individual lessons, but it must never publish a partial catalog or replace the complete catalog with only the lessons under test.

Engine QA uses a compact `Unit -> Lesson -> Stage -> Card` location navigator over that complete catalog. All seven units remain directly reachable, but the hub renders only the selected unit's ten lessons before the stage and card controls; it must never restore a flattened 70-lesson stack. The last QA location is stored only in the QA namespace and restored after returning from the real lesson player or reopening the hub. Instructions and diagnostic tools remain available without displacing the primary navigator.

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

For action-video QA, inspect the pre-selection still and the first playing frames inside the real mobile choice-card crop, not only the raw source or a desktop player. A Preview release must not depend on a remote action clip that is missing or differs from the verified export; bundle the verified clip when the Preview media host cannot guarantee that exact asset.

Existing automated guardrails cover lesson order, vocabulary contracts, five-stage structure, valid assets and answers, unique visible choices, family-category overlap, exact negative listening contrasts, complete identity prompts, bidirectional recognition, hidden-text listening, single-image speaking, interactive Use cards, media loading, pronunciation lifecycle, and horizontal phrase-option layout. Extend these checks when a new reusable rule is approved.

## 11. Release Rules

- Follow `AGENTS.md` for the exact release workflow.
- Preview is the default destination after an OTA-compatible mobile change passes verification.
- Never publish or promote to Production without explicit user approval after Preview testing.
- Native dependency, Expo configuration, permission, native module, or app-version changes require a new build rather than an OTA update.
- Keep generated lesson snapshots, audio manifests, and committed media synchronized with the canonical lesson files.
- The protected remote branch `release/preview` is the sole Preview release authority. Task branches and local worktrees may verify and push changes, but they may never publish directly to the shared Expo channel.
- Preview publication runs only through the protected GitHub Actions environment. The local publisher fails closed outside that workflow; an unavailable CI credential or workflow is a release blocker, never permission to fall back to a locally authenticated Expo session.
- A release candidate must be the exact remote head of `release/preview`, descend from the approved complete-course baseline, and preserve the versioned release-integrity manifest. The manifest locks the aggregate course fingerprint, 70 unique lessons, Units 1 through 7, and exactly ten lessons per unit unless a deliberate curriculum release updates those values.
- Release verification must require the commit label and update UI, run the complete Preview preflight, serialize Preview publications so two jobs cannot race, and verify the live EAS update group against the GitHub commit after publication.
- Repository guards are defense in depth, not the release authority: a stale checkout can also contain stale scripts. Server-side branch/environment protection and a CI-only Expo token are required to prevent an old checkout from bypassing current repository checks.
- The Preview publisher injects the current seven-character Git commit into the OTA bundle so the app, Expo, and Vercel identify the same code snapshot.
- Backend access-control changes must remain compatible with every active mobile channel. Do not enforce a new client credential on the shared backend until the matching client code has reached Preview and Production; server-only admin credentials must never be committed, bundled, or given a source-code fallback.

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
- 2026-08-24: Action-video QA now includes the paused mobile card crop, and verified clips are bundled when Preview's remote media copy is missing or stale.
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
- 2026-08-24: Preview and Engine QA catalog parity standardized on the complete 70-lesson A1 course; targeted QA updates may not remove units outside the immediate test scope.
- 2026-08-24: Automatic single-card teaching videos standardized as display-only surfaces; tapping the clip must not submit or advance the card.
- 2026-08-24: Lesson 1.7 keeps `not` larger and yellow across visible teaching and recognition prompts, with animation limited to its Learn introduction.
- 2026-08-24: Negative image-choice confirmations standardized on a post-selection full contrast: spoken and visibly resized in Recognize, spoken only in Listen, with no positive-action reveal before selection.
- 2026-08-24: Square-source action videos standardized on solid warm-neutral side fill matching still-image cards; black bars and blurred side fill are no longer accepted.
- 2026-08-24: The parents-talking clip received a reviewed, parents-only matched poster/video pair: a 3:2 poster and 4:3 action crop keep the pre-selection and playing scale consistent while preserving both heads, faces, and conversational hand gestures.
- 2026-08-24: All 16 action-video pairs used by the 45 two-choice A1 cards received dedicated first-visible-frame 3:2 posters; reviewed raw-source 4:3 variants are limited to brother studying, children playing, father working, and parents talking, with every other card count left unchanged.
- 2026-08-24: Lesson option images standardized on one 3:2 media shape across every card count; backgrounds may be extended or outpainted, but subjects and meaningful foreground details must never be stretched or distorted.
- 2026-08-24: Multi-choice action media standardized on a poster-first mobile lifecycle: the matching still remains visible before selection, and motion replaces it only after correct-selection playback starts inside the same clipped frame.
- 2026-08-24: The existing A1 option-image catalog adopted that 3:2 viewport on web and mobile; unsafe action crops use reviewed 1536x1024 variants.
- 2026-08-24: Successful cold-start EAS updates standardized on a one-time confirmation popup with previous and current version, build, and update identifiers.
- 2026-08-24: Every learner-facing SpanGlish logo standardized as an accessible route home, with exit confirmation during an active lesson.
- 2026-08-24: Preview publication standardized on one canonical full-course lineage; divergent feature branches must integrate it before publishing to the shared channel.
- 2026-08-24: Preview release identity standardized on the seven-character Git commit displayed beside the app version in the update popup and `Actualizar` menu; build and Expo-specific IDs remain hidden there.
- 2026-08-24: Portrait image-choice stacks standardized on height-aware uniform scaling so wrong-answer encouragement and teaching hints remain above Android navigation without changing the 3:2 media frame.
- 2026-08-24: All mobile Speak-stage images standardized on the lesson option frame, including its 3:2 crop policy, dark inset border, and rounded clipping across every unit.
- 2026-08-24: Speak-stage framing corrected to preserve the complete model subject inside the shared 3:2 frame; portrait identity art must use a subject-preserving fit rather than the option-card top crop.
- 2026-08-24: Mobile lesson imagery standardized on one shared dark rounded 3:2 frame across prompt scenes, `Completa`, Recognize, image choices, action posters, and Speak in all seven units.
- 2026-08-24: Full-bleed A1 imagery expanded from option cards to every learner-facing course surface across all 70 lessons, seven units, five stages, prompt/choice/model/poster roles, and unit/lesson thumbnails. Automated QA inventories each role separately and requires zero course images to depend on padded `contain` rendering.
- 2026-08-24: Request scope became a hard product rule: styling-only changes may not alter layout, sizing, spacing, image fit, content, navigation, or interaction. Four-image portrait slides remain 2x2; if a requested change requires anything outside its stated scope, implementation pauses for explicit approval.
- 2026-08-24: Four-image portrait grids retained the required 2x2 layout but restored a taller, height-aware image viewport to use otherwise empty lesson space. Native image proportions and complete subjects remain preserved; all other option-count layouts stay unchanged.
- 2026-08-28: Four-image portrait grids standardized on a fixed centered 4:5 window-like crop. Partial scenes are accepted when unmistakable; answer-critical numerals, counts, prices, actions, spatial relationships, and identifying structures require the central safe area or a dedicated four-card reframe, with every effective crop tracked by a content-hashed semantic-review manifest.
- 2026-08-24: Text-only answer sets standardized on at most three tiles across all A1 units. The correct answer and first two authored distractors retain their relative order; image-choice counts and layouts remain unchanged.
- 2026-08-24: Completed live pronunciation progress standardized on an immediate transition from listening to neutral processing, with an independent all-syllables completion safeguard and a bounded native-stop recovery instead of indefinite `Te escucho…` stalls.
- 2026-08-24: A1 scene contracts standardized on literal semantic media: generic person/object fallbacks are prohibited, selectable options contain one answer concept per tile, and missing scenes require a reviewed dedicated 3:2 asset or a failing media build.
- 2026-08-25: Completion prompts resumed upfront speech using deterministic full-sentence masking. This timing-based approach was superseded on 2026-08-28 after phoneme leakage was heard at answer boundaries.
- 2026-08-28: Completion prompts standardized on visible-fragment synthesis. Missing answers and visual markers never enter the prompt TTS request; ending prefixes use rising elicitation punctuation, a final visible article `a` uses supported CMU phoneme markup for the exact English strong form `/eɪ/` ("ay") on the phoneme-capable Eleven Flash v2 model, middle prefixes use comma punctuation, and beginning/middle/ending fragments are stitched around at least 550 ms of digital silence. Fake spellings, underscores, and answer words remain prohibited. Invalid fragment generation fails to a known silent clip, and device/browser completion fallback remains prohibited.
- 2026-08-28: A full 2,330-request deployed-audio audit retired Brian from active A1 playback after 32 of 33 confirmed failures clustered on that voice. Liam now owns every Use and conversational route. Completion-fragment generation receives one different-seed ElevenLabs retry, then sends only the same visible fragments to the approved OpenAI fallback before the silent fail-safe; the omitted answer remains digital silence throughout.
- 2026-08-28: Concurrent coding work standardized on isolated task branches and worktrees, pre-edit overlap inspection, preservation of unrelated changes, and fresh `release/preview` integration plus repeated release checks before Preview merge or publication. Unsafe overlaps require explicit user direction, and stale snapshots may never be published.
- 2026-08-29: Mobile lesson headers standardized on a 24 dp unit/lesson context line and a 30 dp active-section label across phones and tablets. Landscape image frames now derive their maximum width from the measured height remaining below that header, preserving established option counts and arrangements while preventing header or Android-navigation overlap.
- 2026-08-28: Engine QA navigation standardized on a compact, restorable `Unit -> Lesson -> Stage -> Card` path. The hub keeps all seven units reachable, renders only one unit's ten lessons at a time, remembers QA-only location state, and keeps diagnostics secondary to card browsing.
- 2026-08-28: Ambiguous deterministic short-word audio standardized on enumerated exact-key bundled replacements after reverse-transcription and listening review. The corrected `One` take now covers every standalone Learn, Recognize, and Speak slide on web and mobile, is hash-pinned in QA, and does not replace longer `One ...` phrases.
- 2026-08-25: After a newer OTA from a stale divergent branch replaced the complete seven-unit Preview with an older tree, Preview publication moved to the protected `release/preview` authority. CI now owns publishing, exact course topology and fingerprints are release invariants, and local or task-branch publication is prohibited.
- 2026-08-26: Shared-backend API-key rollout standardized on a compatibility window: app-key enforcement remains disabled while `APP_API_KEY` is unset, admin endpoints fail closed, and enforcement begins only after matching client code reaches every active mobile channel.
- 2026-08-29: Course-media semantic approval became fail-closed. Every correct image and distractor must be visually reviewed against its complete teaching contract, with approval bound to the exact contract and file hash; filenames, prompts, manifests, generator metadata, and approval of source or derived variants are not substitutes, and missing or stale approval blocks release.
- 2026-08-29: Image-option contracts became independent and option-authoritative after shared correct-answer descriptions were found contaminating distractor generation. The option concept and explicit per-option scene contract now outrank shared card framing, and automated coverage prevents the target description from being reused for distractors.
- 2026-08-29: Semantic approval expanded to the 147 real mobile course-browser thumbnail framings and to the dedicated two-choice action posters actually shown before playback. Approval now includes a conservative render-policy and renderer-source signature so crop, fit, viewport, focal-position, or renderer drift returns the affected contract to pending.
