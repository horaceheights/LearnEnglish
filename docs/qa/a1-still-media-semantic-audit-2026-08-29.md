# A1 still-media semantic audit — 2026-08-29

Updated 2026-08-30.

## Status

The current candidate contains the deterministic media and contract repairs described below, but the human semantic audit is not complete. An earlier agent-assisted contact-sheet pass was incomplete and its claim that every reviewed sheet passed is withdrawn. The user's Unit 2 screenshots exposed color and quantity contradictions that the first pass missed; a corrected contract-bound review then found additional answer-critical crop failures. Under the two-stage policy approved on 2026-08-30, this candidate may enter protected internal Preview with explicit pending-review warnings so it can be inspected in the real app. It remains blocked from Production until a human reviewer records approval for every semantic contract and re-reviews the merged Preview line's complete fixed-4:5 four-card crop inventory.

- Course topology: 70 lessons in seven units of ten.
- Learner-facing still uses bound by the runtime inventory: 3,375.
- Semantic contract rows covering those usages: 1,785.
- Distinct final rendered still files: 961.
- Canonical portrait-safe four-card variants: 146 (the previous 137 plus nine new variants).
- Mobile course-browser crop contexts: 147 (70 lesson rows, 70 continue cards, and seven unit cards).
- Two-choice pre-play action-poster contexts: 74; the two Lesson 1.7 still-only comparison usages intentionally do not use a poster override.
- Human approval registry: 0 approved, 1,785 pending, 0 rejected.
- Preview publication: not published. This candidate has not yet been published to the shared Preview channel.
- Release result: eligible only for protected internal Preview with explicit pending-review warnings after exact-commit release checks pass. Production remains blocked by the pending semantic approvals and stale four-card crop-review evidence.

The review packet must be regenerated from the final candidate's exact contracts, render signatures, resolved filenames, and file hashes. Human review then restarts against that packet. No automated process, repair script, agent inspection, or blanket response to an ambiguous packet has granted approval or changed a pending contract to approved. Pending-review Preview testing, when permitted by the protected workflow, remains a review surface rather than approval and never satisfies the Production gate.

The registry covers lesson prompt stills, correct options, distractors, Speak model stills, final client-resolved variants, the dedicated two-choice still posters actually shown before video playback, and every real mobile course-browser unit/lesson/continue crop. Action video semantics remain covered by the separate motion and frame-inspection rules in `project-guardrails.md`; approving a poster still never approves its video.

## Incident and root cause

Lesson 2.10 showed one blue pen while the authored choices claimed unrelated quantities and colors, and one white car while the prompt claimed two colored cars. These were genuine image/answer contradictions, not harmless naming differences.

The shared Unit 2–7 builder had passed the correct answer's scene description into every option renderer. Distractors therefore inherited correct-answer semantics even when their labels, IDs, and intended answers differed. Reused concept metadata could then hide a contradiction by retaining only the first description associated with a filename.

A second problem existed in review evidence. The earlier sheets could label an image with prompt-level or source shorthand instead of the depicted option meaning and the effective client-resolved file. That ambiguity allowed an agent-assisted pass to report a clean result without proving the actual object, count, color, action, identity, relation, or crop. Review evidence built that way is invalid for approval.

The Unit 2 number art also contained two distinct cases that must not be conflated:

- Numbers 1–10 intentionally use gold stars. Their descriptions incorrectly called the symbols dots. The images remain unchanged; only the metadata was corrected from dots to stars.
- The number 13–18 four-card assets use dot arrays as the answer-critical count cue. Their earlier portrait variants lost those dots in the crop, so those six existing variants were rebuilt with the complete numeral and exact dot array visible.

The builder is now option-authoritative. Every option uses its own concept or explicit per-option scene contract, incompatible reused contracts remain independently reviewable, and each runtime contract binds the prompt, audio, answer, complete distractor set, option role, source filename, effective rendered filename, render profile and framing signature, and exact file hash.

## Repairs

- Unit 2 literal-scene repairs cover the near red book, six white bags, two blue cars, three green books, and four yellow pens, plus the distant book and the Unit 2 menu image. The stars in the established 1–10 number images were preserved, their descriptions now say stars, and the six number 13–18 portrait variants were rebuilt so their dot arrays survive the real fixed-4:5 crop.
- Nine additional answer-critical portrait variants were added after the corrected review exposed failures: one fully countable three-green-books crop, one `I have a book` crop retaining the speaker/`I` cue, one invitation crop retaining the music/guitar cue, and six label-free profession-action cards for cook, doctor, driver, farmer, nurse, and teacher.
- The canonical portrait-safe inventory is now 146 variants. The audit repair line accounts for 118 new deterministic variants in total: the previously recorded 109 plus those nine additional variants. Rebuilding the six existing number 13–18 files changed their bytes and hashes but did not add six new filenames.
- Units 3–5 retain the earlier high-risk semantic rebuilds and contextual corrections for identity, seven-day meaning, affirmative cues, prices, person-specific quantities, possession, professions, and distinct `want` versus `like` scenes. These remain candidate repairs pending human review on the final hashes.
- Unit 6 retains the transport, route, access, signal, schedule, help, and spatial-relation repairs, including ordered transport, open versus blocked walking, named-place relations, left/right reference pairs, and literal walking. These remain candidate repairs pending human review.
- Unit 7 retains the identity, action, weather, clothing, meal, need, polarity, and invitation-scene repairs, including Ana continuity, parents in a family scene, town-map help, active reading and writing, and the restored music cue. These remain candidate repairs pending human review.
- Unit 1 sibling distractors use an exclusive singular/plural and boy/girl matrix for `A brother`, `Brothers`, and `Sisters`; babies and generic child groups are no longer overlapping sibling distractors.
- Unit 6 card contracts require `The boy cannot cross the street.` where an adult pair is a distractor, and `The pharmacy is on the right.` where three different places appear on the right. Hidden correct IDs no longer substitute for what the learner can see or hear.

## Fail-closed guardrail

`project-guardrails.md` requires a person to inspect the exact client-resolved image at its real runtime framing against the complete teaching contract. A filename, asset ID, generator prompt, source description, manifest row, dimensions check, or agent assertion is explicitly insufficient.

Approval binds the complete runtime contract to the cryptographic hash of the exact final bytes. It also binds the role/layout-specific render policy, normalized renderer-source signature, fixed browser viewport where applicable, fit, and focal position. Any change to the prompt, audio, answer, distractor set, role, source, crop, pixels, renderer, viewport, fit, focal position, encoding, variant, or hash invalidates the prior evidence and returns that contract to pending. Missing, malformed, rejected, stale, or hash-mismatched evidence fails closed; pending evidence never becomes approval through automation.
Production remains fail-closed for missing, pending, rejected, stale, or hash-mismatched approval. The explicit Preview policy downgrades only current `pending` decisions and pending four-card crop evidence to visible warnings; missing, malformed, stale, mismatched, rejected, ambiguous, or structurally unsafe media still blocks Preview.

A valid human review aid must display the expected concept and depicted option meaning, full current contract and contract hash, source and effective rendered filenames, effective asset hash, correct/distractor role, and exact lesson/card/stage/slide prompt and audio context. The generator must reject stale runtime or render bindings and emit its inventory and sheets coherently. It must never write an approval decision, reviewer identity, review date, approval registry, or crop-review manifest as a side effect. Ambiguous shorthand cannot support approval.

Two-choice action options resolve to the dedicated first-visible-frame poster path used by both clients. Sixteen poster files have canonical lesson-media copies, byte-identical mobile/web publication copies, literal Metro requires, and independent pending contracts. Ten Unit 1 title files that previously existed only in the mobile bundle also have canonical sources.

Every effective portrait four-card variant is synchronized to canonical, mobile, and frontend publication roots. Its render profile records the real fixed centered 4:5 mobile crop alongside the web 3:2 frame. Missing copies or byte differences are validation failures rather than optional publication gaps.

## Verification record and remaining work

- The generated runtime inventory currently resolves 1,785 contracts across 3,375 uses to 961 distinct files, and the approval registry contains exactly 1,785 pending decisions with zero approved or rejected decisions.
- Deterministic repair coverage now includes the exact number 13–18 dot arrays, the nine added answer-critical portrait variants, and byte parity across canonical, mobile, and frontend copies.
- Structural, parity, dimension, hash-binding, runtime-contract, TypeScript, frontend-build, lesson-structure, and release-integrity checks are necessary implementation evidence. They do not prove semantic correctness and cannot approve an image.
- The earlier claims that all 147 browser crops, all labeled action posters, and all 17 four-card sheets passed are historical agent-assisted observations only and are not accepted as complete review evidence. In particular, the old four-card result was disproved by the subsequent number, book-count, speaker-cue, music-cue, and profession-action findings.
- The previous four-card crop-review manifest and review packet are stale because contracts, variants, bytes, and hashes changed. Automation has not rewritten that human evidence.
- Before review resumes, regenerate the full review packet from the final merged candidate, verify its inventory and sheets were produced together, and confirm every label describes the exact option and effective file shown. Record human decisions only after that review.
- Before protected Preview publication, rerun the applicable full candidate checks on the exact remote commit. No Preview publication has occurred as part of this audit or repair work.
- Preview verification must use the explicit pending-review policy so current pending decisions and crop evidence remain visible warnings while every malformed, missing, stale, rejected, ambiguous, parity, structural, ancestry, or release-authority failure remains blocking.

No approval entry was marked approved by automation, by an agent inspection, or by this documentation update.
