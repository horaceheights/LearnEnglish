# Units 2–7 parity implementation — in progress

User approved implementation across all six remaining units on 2026-09-13.
Unit 1 is the completed reference. This branch is **not ready for Preview**.

## Implemented foundation

- Both clients derive the voice counter from the actual authored gates, including non-final gate positions; no fixed four-gate/card-offset arithmetic.
- All six mission definitions have their own voice heading, instruction and success label. Unit 1's fallback copy and four-gate sequence remain unchanged.
- Both mission openings use the actual beat count. Mobile completion uses that lesson's final response image and phrase instead of Unit 1's family image; web completion shows the actual chapters.
- All remaining-unit listening instructions now say “Escucha la pista en inglés y toca la respuesta.” They no longer ask for an unexplained order while the engine randomizes English clues.
- Shared scope-aware target placement uses reviewed member anchors, independent of Spanish labels. Unit 2's two-car, two-person and three-person groups have distinct visually inspected endpoints pinned to their exact image bytes.
- The historical canvas exporter checks the whole batch before any write and refuses to overwrite revised canonical content or delete a renamed lesson.
- The parity contract covers every foundation lesson in Units 2–7, the approved missing Unit 3 current-action question, cumulative Unit 7 functions, fresh review-image bytes and meaningful listening/speaking coverage. `python scripts/audit_a1_unit_parity.py --check` deliberately remains red until the actual content meets it. It does not replace image/audio/device QA or award semantic approval.
- One corrected six-o'clock scene was generated, visually inspected and archived with provenance. It is **not** active yet: its question-view and immutable audio binding must be finished first.

## Still required — do not call these complete

### Unit 2 mission checkpoint — 2026-09-13

- Replaced the five-beat family/photo mission with 13 authored beats: nine scenes / 36 listening decisions, followed by four question → distinct response-shot pronunciation gates. All eight Unit 2 function checks pass. The learner prepares a park meeting using places, transport, objects, this/that, numbers, colors and combined descriptions. Unit 1 content remains unchanged.
- Generated 18 usable high-quality Sunburst stills and one rejected near/far attempt. Exact reported usage at uncached list rates totals **US$0.912899 / MX$15.492535**, before tax/discounts (Banxico FIX assumption 16.9707, 2026-09-11). Reference-image jobs cost about US$0.055, independent shots about US$0.043. No cache discount is assumed; no automatic retry or fallback was used. The declared pack ceiling was US$1.50.
- Generated and persisted 15 missing ElevenLabs takes / 21 bindings. Dry-run planned 470 characters against a 600-character operator ceiling; the provider reported 257 billable characters. Post-generation missing-asset dry-run reports zero; cast validation passes. Peso cost is not invented without the account's plan/credit valuation. Listening/transcript and device review are still needed.
- The first near/far photo was explicitly rejected because the distant phone was too small. The replacement uses a shallow first-person tabletop with four large complete objects. Pixel reviews, exact counts, generation prompts, input-reference hashes, receipts and pending human approval are saved in `docs/qa/unit-2-mission-media-v4.json`.
- Browser inspection of the shared placement code caught a real short-landscape defect despite a passing containment test: an overhead row shrank the photograph and group rays crossed the counting evidence. Explicit `subject_kind: object` now opts those scenes into side controls on short landscape, keeping the image 273px wide at a 650×190 scene slot instead of 189px. A group uses one edge pointer while retaining every member anchor as scope evidence. Both clients use the same geometry; legacy Unit 1 markers are untouched. Portrait and landscape QA-tool checks have no browser errors. This tool is **not** an end-to-end app or audio/device test.
- Known art-review detail: helper identity, hair and teal shirt are consistent; kickoff shoes are dark while the final outdoor question shots use white shoes. This non-assessed variation is disclosed, not marked human-approved.
- Canonical Unit 2, its embedded snapshot and the complete 70-lesson snapshot are synchronized. New stills are byte-identical in canonical/web/mobile locations and included in Metro. Mission runtime contracts were refreshed; semantic registry synchronization uses the existing Preview-only stale-signature allowance for untouched older rows. All human approvals remain pending; Production is not eligible.
- Verification at this checkpoint: 97 targeted backend tests pass; 31 shared geometry/presentation, cue, native Yoga, portrait/landscape and Unit 1 regression tests pass; all 27 authored scene/size geometry checks pass; mobile TypeScript and optimized web build pass. Runtime WebP counting and near/far exports were visually checked after encoding. A complete release test, exact-commit Preview publication and physical-device QA have **not** happened.
- **Unit 2 is not complete:** Lesson 2.9 still reuses 16 earlier image files and retrieves 28/43 declared vocabulary entries. Its missing exact entries include bike, blue, cars, eight, hospital, house, nine, pen, restaurant, seven, store, street, table, ten and two. Author the fresh review next, then continue Units 3–7. The all-unit parity gate deliberately stays red.
- Reproduction: `scripts/render_course_stills.py` is dry-run by default; `scripts/build_unit_2_mission_pack.py --write` requires hash-bound visual reviews; `node scripts/preview_unit_two_mission_targets.cjs` builds the local geometry QA surface. All are operator tools, never learner-triggered paid calls.

1. Finish the Unit 2 review/device gates above and expand the five remaining mission stories using the unit-specific functions in `docs/product/a1-unit-parity-contracts.json`. Units 3–7 still have only 8–12 listening decisions and one speaking task each. Add genuine decisions, not duplicates or a higher displayed counter.
2. Author the expanded scenes before placing targets: clear clocks/prices/schedules, established identity and ownership through dialogue, distinct correct/distractor evidence, complete uncropped people. Preserve useful new photography; replace the blurred-inset and ambiguous scenes.
3. Teach “What are you doing?” in Unit 3 before review/mission assessment, and reconcile the approved early Unit 2 place/action expansion with the older canvas's vocabulary boundary. Review the canonical foundations rather than blindly generating from that stale canvas.
4. Rebuild Lesson 9 in every remaining unit with genuinely fresh images and the approved concept progression; fix duplicated foundation cards and weak contrasts without padding. Preserve the newer universal Completa contract from the concurrent primary-checkout work.
5. Generate/bind the remaining immutable English dialogue and Spanish kickoff audio using the pinned cast, operator-only declared cost ceiling, no automatic paid retries, truthful receipts and review. The Unit 2 mission batch above is persisted; no new video batch has run in this task.
6. Finish the still/video pairing audit and replacements. The known father-working workshop still / construction-site video mismatch and padded drinking clip are not fixed by this branch. Do not delete old-looking files without tracing source/poster/variant references.
7. Refresh manifests, semantic contracts, snapshots, persistent audio catalog and fingerprints from the finished canonical lessons. Run full backend/web/mobile gates, browser QA, real Expo portrait/landscape and low-signal playback/recovery checks.
8. Fetch/reconcile current main immediately before pushing/merging. Use PR → protected main → CI Preview only. No local EAS publication and no Production without explicit approval after exact-commit Preview testing.

## Isolation and concurrent edits

Task branch: `codex/units-2-7-unit1-parity`, based on `52dbcbeb5fc82b47cc3b79538687cfe0edfd9da3`.
Primary checkout has extensive ongoing edits to all 63 non-mission lessons, shared UI and audio/media catalogs on `feat/lesson-1-1-completa-sentence-standard`. They were not imported, staged, reverted or overwritten. The task worktree is `.codex-task-worktrees/units-2-7-unit1-parity`.

Do not publish this older base over that work. Regenerate catalogs/snapshots only after safely combining the final canonical changes. Do not remove this dirty/in-progress worktree or unmerged branch as cleanup.

## Verification so far

- Mobile TypeScript (`tsc --noEmit`): pass.
- Web optimized build: pass using the existing pinned dependency installations (the shared frontend installation lacks `html2canvas`; the existing mobile installation supplies it through process-local `NODE_PATH`). No dependency versions or primary-checkout files were changed.
- Backend lesson structure/snapshot, schema, exporter protection and parity-audit unit tests: 83 pass.
- Web/mobile mission, native Yoga, portrait/landscape, cue, voice, Unit 1 target preservation and shared-presentation regression group: 49 pass.
- Current parity inventory: all six units correctly report unfinished coverage and reused review media. This is an acceptance failure, not a passed rollout.
- Full end-user/device QA, new media/audio integration and protected Preview release: not done.
