# A1 still-media semantic audit — 2026-08-29

## Status

The all-unit still-media implementation and agent-assisted pre-approval QA pass is complete. It is not human semantic approval. The corrected course remains intentionally blocked from release until a human reviewer records approval for every semantic contract in `a1-media-semantic-approvals.json`.

- Course topology: 70 lessons in seven units of ten.
- Learner-facing still uses bound by the runtime inventory: 3,375.
- Semantic contract rows covering those usages: 1,734.
- Distinct final rendered still files: 912.
- Mobile course-browser crop contexts: 147 (70 lesson rows, 70 continue cards, and seven unit cards).
- Two-choice pre-play action-poster contexts: 74; the two Lesson 1.7 still-only comparison usages intentionally do not use a poster override.
- Human approval registry: 0 approved, 1,734 pending, 0 rejected.
- Release result: blocked by the pending approvals; there are no structural, parity, dimension, missing-file, or runtime-contract validation errors.

This registry covers lesson prompt stills, correct options, distractors, Speak model stills, final client-resolved variants, the dedicated two-choice still posters actually shown before video playback, and every real mobile course-browser unit/lesson/continue crop. Action video semantics remain covered by the separate motion and frame-inspection rules in `project-guardrails.md`; approving a poster still never approves its video.

## Incident and root cause

Lesson 2.10 exposed one blue pen while the authored answer choices claimed unrelated quantities and colors, and one white car while the prompt claimed two colored cars. These were not isolated bad filenames.

The shared Unit 2–7 builder passed the correct answer's scene description into every option renderer. Distractors therefore inherited correct-answer semantics even when their labels, IDs, and intended answers differed. Reused concept metadata could then hide the contradiction by keeping only the first description associated with a filename.

The builder is now option-authoritative. Every option uses its own concept or explicit per-option scene contract, incompatible reused contracts stay independently reviewable, and a full runtime context binds the prompt, audio, answer, complete distractor set, selected role, source filename, actual final rendered filename, render profile and framing signature, and exact file hash.

## Repairs

- Unit 1: all final client-resolved prompt and option stills passed an agent-assisted labeled pixel QA pass. Contact-sheet generation now uses manifest contracts, resolves the actual final variant, and separately renders real browser crop shapes; this pass did not grant human approval.
- Unit 2: replaced the rejected near red book, six white bags, two blue cars, three green books, and four yellow pens assets with exact literal scenes. The distant book was also rebuilt so the book remains unmistakable at card size while retaining a long-distance cue. The Unit 2 menu image now uses the verified two-blue-cars asset.
- Units 3–5: rebuilt 186 high-risk semantic assets, followed by 18 contextual-review corrections for Canada identity, seven-day meaning, affirmative cues, priced drinks, person-specific quantities, and visually distinct `want` versus `like` scenes.
- Unit 6: rebuilt the high-risk transport, route, access, signal, schedule, help, and spatial-relation scenes, including the final contextual corrections for ordered transport, open versus blocked walking, named-place relations, left/right reference pairs, and literal walking.
- Unit 7: rebuilt the high-risk identity, action, weather, clothing, meal, need, and polarity scenes, including the final contextual corrections for Ana continuity, parents in a family scene, town-map help, and active reading and writing.

## Fail-closed guardrail

`project-guardrails.md` now requires a human visual review of every lesson still and every final client-resolved still variant against the complete teaching contract. A filename, prompt, generator description, manifest entry, dimensions check, or source approval is explicitly insufficient.

Approval is bound to the complete runtime contract and the cryptographic hash of the exact final bytes. It also binds a role/layout-specific render policy, normalized implementation-source signature, fixed browser viewport where applicable, fit, and focal position. Any prompt, audio, answer, distractor-set, role, source, crop, pixels, renderer, viewport, fit, focal position, encoding, variant, or hash change returns the contract to pending. Missing, pending, rejected, stale, or hash-mismatched approval blocks validation and release.

Two-choice action options resolve to the dedicated first-visible-frame poster path used by both clients. Sixteen poster files now have canonical lesson-media copies, byte-identical mobile/web publication copies, literal Metro requires, and separate approval contracts. Ten Unit 1 title files that previously existed only in the mobile bundle also now have canonical sources.

Routine Preview verification now runs `mobile/tests/lesson-media-semantics.test.cjs`. The Python validator also checks all 70 backend lessons against the embedded mobile course, literal Metro requires, final 3:2 resolution, byte-for-byte mobile/frontend parity, full runtime contexts, and the approval registry.

## Verification performed

- Focused Python contract, approval-registry, option-authority, thumbnail-framing, action-poster, and byte-sync tests: pass.
- Runtime contract tests, including prompt-variant resolution and fail-closed mismatch handling: pass.
- Mobile TypeScript check: pass.
- Complete `verify-interaction-paths.ps1` suite: pass, including semantic media, 77 unique unit/lesson title images, 793 normalized option/model images, 758 prompt cards, and 408 prompt assets.
- Lesson structure suite: 25 checks pass; the remaining audio-boundary check could not import the optional local `av` package in this worktree's borrowed Python environment and is unrelated to still media.
- Full `validate_lesson_cards.py`: all implementation checks pass; its only expected failure is the 1,734 pending human approvals.

No approval entries were marked approved by automation or by this repair pass.
