# Units 2–7 parity implementation — in progress

User approved implementation across all six remaining units on 2026-09-13.
Unit 1 is the completed reference. The full Units 2–7 rollout remains unfinished. On 2026-09-13 the user explicitly approved publishing the saved **Unit 2 checkpoint to Preview**, subject to the normal protected release gates, so device review can happen before work continues in Units 3–7. This supersedes the earlier all-unit publication hold, not the unfinished rollout criteria or Production approval requirements.

### Staged Unit 2 Preview release preparation — 2026-09-13

- Candidate content is the saved `7c5ba94` review checkpoint plus the `f481aaf` immutable-catalog and verification alignment, including the shared mission foundations described below. No new media generation is needed for publication.
- Deliberately updated only the aggregate catalog fingerprint to `8d8e542660611870934d407e5158b5f133695e12`; preserved the approved baseline, 70 lessons, seven units of ten, release-identity files and fail-closed integrity checker.
- Unit 2 content inventory passes. Units 3–7 remain unfinished; the all-unit parity acceptance check must continue to report those gaps. Pending human image/crop reviews and physical-device audio/layout/recovery testing remain pending until performed in the actual Preview.
- Release must follow fresh `origin/main` reconciliation, complete local/CI preflight, PR into protected `main`, exact-commit shared-backend readiness and protected CI Preview publication. No local EAS publisher or Production promotion is authorized.
- Local release verification passed: all 309 backend tests, all 17 web regression tests, optimized web build, versioned release integrity and the complete `verify-preview.ps1` preflight including its Android production-bundle export. The runner now executes the new object-scene and cross-client mission-presentation suites; its pinned course-hash fixture matches this deliberate release fingerprint. Human-review warnings remain unchanged. GitHub required checks and deployed-backend/Expo verification still run after push and integration.

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
- Implementation is saved at `dfc4ae667866f7b9fcb997841c93ef11e9da85bb`. The persistent audio catalog was exported from that exact content checkpoint and validates all 4,686 immutable assets. No push, PR, merge or Preview publication has happened for this checkpoint; the all-unit rollout and final release verification remain unfinished.
- Verification at this checkpoint: 97 targeted backend tests pass; 31 shared geometry/presentation, cue, native Yoga, portrait/landscape and Unit 1 regression tests pass; all 27 authored scene/size geometry checks pass; mobile TypeScript and optimized web build pass. Runtime WebP counting and near/far exports were visually checked after encoding. A complete release test, exact-commit Preview publication and physical-device QA have **not** happened.
- At the mission checkpoint, Lesson 2.9 still reused 16 earlier image files and retrieved 28/43 declared vocabulary entries. The following review checkpoint closes those content gaps; device/audio listening QA still remains.
- Reproduction: `scripts/render_course_stills.py` is dry-run by default; `scripts/build_unit_2_mission_pack.py --write` requires hash-bound visual reviews; `node scripts/preview_unit_two_mission_targets.cjs` builds the local geometry QA surface. All are operator tools, never learner-triggered paid calls.

### Unit 2 review and media-preservation checkpoint — 2026-09-13

- New explicit user direction controls the rollout: preserve Gemini-created images unless there is a documented concrete issue. Unknown provenance is protected equally, not classified as Codex. The new baseline protects 981 currently referenced image files and their recorded canonical/web/mobile copies; 99 have Gemini-generation-script association (not provider-receipt proof). The preservation audit checks both original bytes and lesson bindings. It is not a semantic-approval mechanism or a claim that every archived file has known provenance.
- Sixteen exact-byte repetitions in Lesson 2.9 have scoped `review-reuses-earlier-image` exceptions. Only their review bindings change; all original files and earlier teaching uses remain byte-for-byte intact. This is a fresh-review requirement, not replacement because of provider or style. Other concrete replacement issues will need their own validated exception type before changing protected bindings.
- Lesson 2.9 now has 48 cards: 8 Learn, 8 Recognize, 18 Listen, 6 Speak and 8 Use. Its stations move through surroundings, object identification, near/far, quantities/colors and a closing listening number check. Twelve added audio-to-English-choice cards retrieve previously omitted places, objects and numbers; no Spanish answer choice is used to test an English clue. Near/far image contrasts use the same object with a different pointing gesture. Recognize meta-instructions no longer play as assessed English. Guided two-word completions lead into four full phrase constructions, preserving the concurrent primary-checkout direction without copying its unrelated edits.
- Successful-path inventory retrieves **43/43** declared Unit 2 vocabulary entries and all eight function patterns. Exact-byte review reuse against Units 1–2 (including the new mission) is zero. The expanded 48-card review follows the existing comprehensive-review exception in course-design-a1.md; a stale legacy 40-card ceiling was updated only for this reviewed lesson, with its intentional count pinned. Completion-audio tests now check the independent authored card-ID set instead of a brittle historical global total.
- Sixteen usable fresh review stills plus one rejected attempt cost **US$0.745476 / MX$12.6512495532**, at reported uncached list-rate usage before tax/discounts and the 16.9707 MXN/USD assumption dated 2026-09-11. The US$1.25 pack ceiling was not exceeded. Exact prompts, provider receipts, reference hashes, source hashes, individual agent inspections and the rejected source are archived. No paid retries, fallback model or cache discount were assumed. Human approval remains pending.
- Runtime WebP copies are byte-identical in all three locations. Diagnostic 180px-wide 3:2 choice pairs and 4:5 count crops were visually inspected using `scripts/preview_unit_2_review_media.py`; near/far remains distinguishable and the quantities remain countable. The two rightmost black phones have their outer ends cropped in 4:5, while all five are distinct. A near chair foot meets the master image's bottom edge. These framing details are disclosed for human review, not silently marked perfect or approved. These diagnostic crops are **not** actual end-to-end app/device screenshots.
- Audio generation reused seven existing takes and persisted four new completion-fragment takes, covering 11 missing bindings. Planned 25 characters against a declared 50-character ceiling; provider-reported total was 13 billable characters. Missing-audio dry-run is now zero for Lesson 2.9; pinned-cast validation passes. No peso charge is invented for ElevenLabs without the account's credit valuation. Actual listening and physical-device low-signal behavior are not verified by these checks.
- Canonical review, its embedded snapshot, the complete 70-lesson snapshot and Metro's image map are synchronized. Unit 2 media contracts were refreshed without changes to non-Unit-2 contracts. Semantic registry has 1,925 pending human reviews; the existing Preview-only renderer-signature allowance remains advisory, never Production approval.
- Verification: 163 targeted backend tests, 17 web regression tests, mobile TypeScript, optimized web build, pinned-cast audit and Preview-policy lesson validation pass. The media-preservation tests include original pixel protection, narrow exception validation, all 43 review vocabulary entries, stage progression, same-object near/far contrasts and no earlier/mission image reuse. Unit 2's content inventory now passes; the all-unit parity gate still correctly fails for unfinished Units 3–7. Full protected Preview release and physical-device verification have not happened.
- Review content and media are saved at `7c5ba9469026bb4441543141c351ccd9f38fd24d`. Its exact immutable source snapshot now supplies the 4,715-asset persistent audio catalog, which validates against the current canonical lessons. The compatibility test rebuilds the complete catalog from its recorded source commit and compares every asset instead of pinning a superseded release commit and totals.
- Follow-up verification: **all 309 backend tests pass**. Mobile fixture updates retain the original Unit 1 targets while accepting explicit object-group icons, pin the three revised review instruction cards and four Unit 2 mission voice gates, compare all new Unit 2 runtime image bytes with their inspection records, and preserve old asset files without requiring unused retired shots in Metro. The interaction runner now reaches the unchanged release-integrity gate and fails there because the aggregate course fingerprint remains the previous candidate (`5417263413ef9ff1a26057e5e39a01f86e9389d3` versus current `8d8e542660611870934d407e5158b5f133695e12`). Update that fingerprint deliberately with the finished canonical release candidate; do not weaken the gate or describe this preflight as passed.
- A separate local Android export succeeded (2,289 modules, 5.3 MB Hermes bundle); all sixteen new review WebP payloads were verified present in its content-addressed asset output. This is a build check only, not an installed-device test, protected release preflight, or publication. No Preview/Production channel was changed. The web optimized build and 17 web regression tests also pass.

### Unit 7 parity checkpoint — 2026-09-22

Branch `claude/unit-7-parity` on `origin/main`. Unit 7 now passes
`python scripts/audit_a1_unit_parity.py --check` (`ready: true`) alongside Units 2–6; all units 2–7 are now fully ready.

- **7.9** is rebuilt from 32 to 48 cards (8 Learn, 8 Recognize, 18 Listen, 6 Speak, 8 Use). Exact-byte reuse of
  earlier teaching pictures is zero, down from fifteen files, and the successful path retrieves 36 of the unit's
  49 declared words (73.5% >= 70% threshold). Twelve fresh review-only stills carry head/arms/hands, happy person,
  hungry person, dress/skirt, thirsty person, rainy umbrella boots, cold windy jacket, sunny hot hat,
  hobbies/music, and please repeat; the 24 review-only photographs and diagrams the unit already owned stay bound,
  preserving legacy review assets without dropped bindings.
- **7.10** is rebuilt from three stub beats to the contract's thirteen: nine listening scenes with 36 decisions
  (weather prep, clothing line, body health, feelings, navigation, table refreshments, hobbies, invitations,
  communication help) and four question-and-answer voice gates with distinct question-views and response-views
  (feelings, purchase, invitation, bathroom navigation). Every contract function is practised on the successful
  path (14/14 functions satisfied).
- The stub mission's legacy scenes cannot be kept: the approved photo edit of each pins its stub card exactly as
  inspected, so those edits are recorded as superseded and every rebuilt beat binds its own mission-only still
  generated from the kickoff cast. Each retired original stays byte-for-byte on disk.
- Media: 30 fresh stills generated and installed (12 review stills, 18 mission stills) across canonical,
  mobile, and frontend directories. Receipts, prompts, hash-bound agent inspections, and measured target
  geometry are recorded in `docs/qa/unit-7-{review,mission}-media-v1.json` and `docs/product/unit-7-{review,mission}-pack.json`.
- Audio: 51 provider requests rendered via ElevenLabs (incremental character cost: 771 characters against operator ceiling);
  all 137 assets in 7.9 and 7.10 are satisfied with 0 provider requests remaining. Catalog exported with 4,847 immutable assets.
  `validate_course_audio_cast.py` passed with code 0.
- Guardrails & Integrity:
  - `python scripts/audit_a1_unit_parity.py --check` passes with `ready: true` across all units 2 through 7 (`"ready": true` overall).
  - `python scripts/audit_course_media_preservation.py` reports 0 errors (`protected_assets: 981, planned_exceptions: 547, errors: []`).
  - `python scripts/validate_lesson_cards.py --semantic-review-policy preview` passes.
  - `docs/product/answer-choice-contracts.json` verified with 0 errors over all 70 lessons.
  - `node mobile/scripts/verify-release-integrity.cjs` passes.
  - All 108 tests in backend pytest suite (`test_lesson_structure.py`, `test_course_photo_reuse.py`, `test_course_audio_cast_audit.py`, `test_persistent_card_audio.py`) pass.

### Unit 6 parity checkpoint — 2026-09-21

Branch `claude/unit-6-parity`, stacked on `claude/unit-5-parity` (PR #186). Unit 6 now passes
`python scripts/audit_a1_unit_parity.py` (`ready: true`) alongside Units 2–5; Unit 7 still correctly fails it.

- **6.9** is rebuilt from 32 to 48 cards (8 Learn, 8 Recognize, 18 Listen, 6 Speak, 8 Use). Exact-byte reuse of
  earlier teaching pictures is zero, down from 20 files, and the successful path retrieves 34 of the unit's
  35 declared words. Eleven fresh review-only stills carry the pharmacy, bank next to grocery store, left and right
  street, far station, crossing or not, help requests, train schedules, thank you, and a taxi.
- **6.10** is rebuilt from three stub beats to the contract's thirteen: nine listening scenes with 36 decisions
  (town square, transport stop, crossing corner, help exchange, direction signs, near/far park, station clocks, café table)
  and four voice gates that ask where the bank is, direct to the station, ask for help, and say thank you.
  Every contract function is practised on the successful path.
- The stub mission's plaza, school and corner scenes cannot be kept: the approved photo edit of each pins its stub
  card exactly as inspected, so those edits are recorded as superseded and every rebuilt beat binds its own
  mission-only still generated from the kickoff cast. Each retired original stays byte-for-byte on disk.
- Media: 29 stills generated and installed (11 review, 18 mission). Receipts, prompts, hash-bound agent inspections
  and measured targets are recorded in `docs/qa/unit-6-{review,mission}-media-v1.json`.
- Audio: 24 new takes, 40 reused, 802 billable characters against a declared 1,200-character ceiling. The
  missing-asset dry run is zero, the pinned-cast validator passes and every new spoken line over a picture has a
  reviewed, gender-matched voice in `docs/qa/speaking-voice-review-v1.json`.
- The aggregate course fingerprint is re-pinned in both files that gate Preview.
- Verification: parity audit (2–6 ready), lesson validator under the Preview policy, media preservation audit with
  zero errors, answer-choice guardrail over 988 banks, pinned-cast validator, backend suite, web regression,
  and complete mobile interaction suite under the Preview policy.

### Unit 5 parity checkpoint — 2026-09-21

Branch `claude/unit-5-parity`, stacked on `claude/unit-4-parity` (PR #182). Unit 5 now passes
`python scripts/audit_a1_unit_parity.py` (`ready: true`) alongside Units 2–4; Units 6 and 7 still correctly fail it.

- **5.9** is rebuilt from 32 to 48 cards (8 Learn, 8 Recognize, 18 Listen, 6 Speak, 8 Use). Exact-byte reuse of
  earlier teaching pictures is zero, down from seventeen files, and the successful path retrieves 35 of the unit's
  40 declared words. Twelve fresh review-only stills carry bread, chicken, a fruit plate, liking and refusing fish,
  refusing milk, wanting juice, two exact prices, the café, an order handed over and an accepted offer; the
  twenty-one review-only photographs the unit already owned stay bound, so no baseline binding is dropped without
  an exception. The two dedicated four-card coffee reframes stay inside a four-option price bank, as the course
  rule requires.
- **5.10** is rebuilt from three stub beats to the contract's thirteen: nine listening scenes with 36 decisions
  (market stall, fruit counter, drinks shelf, likes, wants, needs, meals, price board, café counter) and four
  question-and-answer voice gates that ask a price, serve a drink, thank the server and place the closing order.
  Every contract function is practised on the successful path, including yes please and no thank you.
- The stub mission's market, register and café scenes cannot be kept: the approved photo edit of each pins its stub
  card exactly as inspected, so those edits are recorded as superseded and every rebuilt beat binds its own
  mission-only still generated from the kickoff cast. Each retired original stays byte-for-byte on disk.
- Media: 31 paid attempts, 30 usable. One café-counter scene was rejected after the cue check: its fourth
  customer held a cup, so his only natural line was "Thank you.", which the learner cannot tell apart from
  "No, thank you." on the same board; the replacement has him ordering tea. Reported usage totals
  **US$1.473226 / MX$25.0017** at uncached list rates before tax or discounts (16.9707 MXN/USD, dated 2026-09-11),
  against pack ceilings of US$0.75 and US$1.20. No automatic retries and no fallback model.
- Targets are measured on the real bytes and hash-bound; all 63 scene-slot layouts place every marker inside the
  frame at 48px with no overlap. Disclosed for human review: a small illegible menu board hangs far behind the
  serving-gate asker, and two servers work behind the café counter without being targets.
- Audio: 41 new takes, 28 reused, 499 billable characters against a declared 1,100-character ceiling. The
  missing-asset dry run is zero, the pinned-cast validator passes and every new spoken line over a picture has a
  reviewed, gender-matched voice. The persistent catalog is exported from `a35dd79a` (4,782 immutable assets) and
  the aggregate course fingerprint is re-pinned in both files that gate it.
- Verification: parity audit (2–5 ready), lesson validator under the Preview policy, media preservation audit with
  zero errors, answer-choice guardrail over 976 banks, pinned-cast validator, backend suite 387/387, web
  regression 18/18, and the complete mobile interaction suite under the Preview policy. Mobile TypeScript and the
  Android export still cannot run locally for the reason recorded under Unit 4; CI covers them. Human image
  review, semantic approval and physical-device QA remain pending.

### Unit 4 parity checkpoint — 2026-09-21

Branch `claude/unit-4-parity`, based on `origin/main` at `d6d49df`. Unit 4 now passes
`python scripts/audit_a1_unit_parity.py` (`ready: true`) alongside Units 2 and 3; Units 5–7 still correctly fail it.

- **4.9** is rebuilt from 32 to 48 cards (8 Learn, 8 Recognize, 18 Listen, 6 Speak, 8 Use). Exact-byte reuse of
  earlier teaching pictures is zero, down from nine files, and the successful path retrieves 46 of the unit's 54
  declared words, up from 20. Thirteen fresh review-only stills add the kitchen and bathroom, a lamp next to a sofa,
  a bag under a table, washing a face, brushing teeth, going to school and going to work.
- **4.10** is rebuilt from four stub beats to the contract's thirteen: nine listening scenes with 36 decisions and
  four question-and-answer voice gates with distinct question and response views, across guided-search,
  crowd-search, contrast-hunt, action-hunt and voice-gate. Every contract function is practised on the successful
  path, including the bathroom, breakfast, sleeping, the sequence words and both the afternoon and the night.
- The three stub room beats are re-authored, so the approved full-frame photo edits pinned to their old cards are
  recorded as superseded in `docs/qa/course-mission-photo-edits-superseded-v1.json` and each rebuilt beat binds its
  own mission-only still. Every retired original stays byte-for-byte on disk; only Lesson 4.9 and 4.10 bindings
  change, through nine `review-reuses-earlier-image` and four `mission-rebuild-retires-scene` exceptions.
- Media: 32 paid attempts, 30 usable. Two were rejected after measurement and deliberately re-prompted — a
  seven-o'clock face whose hour hand sat twelve degrees past the 7, and a four-clock wall with the same fault on its
  first dial; the replacements measure 204.6° and 211.4° against an ideal 210°. Reported usage totals
  **US$1.518101 / MX$25.7632** at uncached list rates before tax or discounts (16.9707 MXN/USD, dated 2026-09-11),
  against pack ceilings of US$1.10 and US$1.40. The `0ed6e6f6` commit message states an earlier US$1.36 estimate
  made before the receipts were totalled; this figure is the receipts total and supersedes it. No automatic
  retries and no fallback model.
- Targets are measured on the real bytes and hash-bound in the pack's agent reviews; all 63 scene-slot layouts place
  every marker inside the frame at 48px with no overlap. Disclosed for human review: the dining-room counting beat's
  four leader lines cross over the table in the portrait slot, and the man arriving home at night reads greyer than
  the father in the kickoff portrait.
- Audio: 26 new takes, 40 reused, 478 billable characters against a declared 1,000-character ceiling. The
  missing-asset dry run is zero and the pinned-cast validator passes. Every new spoken line over a picture has a
  reviewed, gender-matched voice. The persistent catalog is exported from `0ed6e6f6` (4,718 immutable assets) and the
  aggregate course fingerprint is re-pinned in both files that gate it.
- Verification: parity audit (2, 3, 4 ready), lesson validator under the Preview policy, media preservation audit
  with zero errors, answer-choice guardrail over 964 banks, pinned-cast validator, backend suite 387/387, web
  regression 18/18, and the complete mobile interaction suite under the Preview policy. Mobile TypeScript and the
  Android export could **not** run locally: `@expo/vector-icons` is absent from both checkouts' installations, which
  produces all 15 reported errors and no others. CI covers them. Human image review, semantic approval and
  physical-device QA remain pending.

### Unit 3 parity checkpoint — 2026-09-18

Branch `claude/units-3-7-parity`, based on `origin/main` at `c2f5f96`. Unit 3 now passes `python scripts/audit_a1_unit_parity.py` (`ready: true`); Units 4–7 still correctly fail it.

- **3.3** gains the approved current-action thread late in the lesson: six cards (40 in total) introduce `doing` and `What are you doing? / I am ...` on four new speaker-view stills of Ana and Luis, kept distinct from the 3.6 job question.
- **3.9** is rebuilt as a 48-card review in six stations with 43/47 declared Unit 3 vocabulary on the successful path. Fourteen fresh stills replace the eight exact-byte teaching repeats and add greeting, job and current-action scenes; the eight review-only `review-reuses-earlier-image` exceptions preserve every original.
- **3.10 `Cenas cruzadas`** is rebuilt as a 13-beat community-dinner mission in five chapters: nine listening scenes (36 decisions) alternating *who says it* and *who is described*, then four dinner-table voice gates with distinct question and response views. Every Unit 3 contract function is on the successful path. 18 mission-only stills replace the stub's blurred-inset kitchen and dining scenes; new `mission-rebuild-retires-scene` exceptions retire those bindings with pixel evidence, and the 2026-09-17 edit of the stub's doctor gate is recorded as superseded in `docs/qa/course-mission-photo-edits-superseded-v1.json`.
- **Pre-flight image check.** The two stills generated but left unbound on 2026-09-17 were deliberately retired (ambiguous grandparents; bank ATM outside the portrait crop) and stay unbound. The unused Ana/Luis photographs are near-identical sibling takes of the 3.1 teaching scenes, so they were not used as review material even though they pass the byte check.
- **Media.** 38 paid still requests: 36 installed and 2 rejected with hash-bound reasons (a nurse rendered with Sofia's face; a finale question shot that moved indoors). Reported usage US$2.014 at uncached list rates, within the declared US$0.40 / US$1.25 / US$1.50 pack ceilings. Receipts, prompts, hash-bound agent inspections and measured crowns are in `docs/qa/unit-3-{lesson,review,mission}-media-v1.json`. Disclosed, not assessed: Diego wears his blazer in the job question shot and his white coat in its answer shot; tiny sportswear swooshes appear in the ages scene.
- **Audio.** 36 new ElevenLabs takes and 35 reused; 502 provider-reported characters against a 1,100-character ceiling. Mission clues first used the neutral narrator; on 2026-09-18 the user asked for gender-matched voices, so each *who says it* clue is now voiced by the person who says it (Ana, Luis, Diego, Sofia or a male or female guest) and *who is described* clues stay neutral. Missing-audio dry run is zero and the pinned cast validates.
- **Tooling.** `scripts/parity_pack.py` and `scripts/refresh_parity_media_manifest.py` are unit-agnostic for Units 4–7; `scripts/build_unit_3_parity.py --base-ref origin/main --check` re-derives the installed lessons. The still renderer gains a narrowly scoped `approved-parity-scene` change control, and the manifest refresh keeps committed render signatures for unchanged uses instead of absorbing this machine's renderer.
- **Verification.** Parity gate, media preservation audit, Preview-policy lesson validator, pinned-cast validator, release integrity, mobile TypeScript, the complete mobile interaction suite (Preview policy) and the backend suite pass; the geometry of all nine scenes was checked across seven slot sizes with the shared placement function. Human image approval and physical-device audio/layout/recovery QA remain pending.

1. Expand the four remaining mission stories (Units 4–7) using the unit-specific functions in `docs/product/a1-unit-parity-contracts.json`, following the Unit 3 pipeline. They still have only 8–12 listening decisions and one speaking task each. Add genuine decisions, not duplicates or a higher displayed counter.
2. Author the expanded scenes before placing targets: clear clocks/prices/schedules, established identity and ownership through dialogue, distinct correct/distractor evidence, complete uncropped people. Preserve useful new photography; replace the blurred-inset and ambiguous scenes.
3. Done for Unit 3: “What are you doing?” is taught in 3.3 before 3.9 and 3.10 assess it. Still open: reconcile the approved early Unit 2 place/action expansion with the older canvas's vocabulary boundary. Review the canonical foundations rather than blindly generating from that stale canvas.
4. Rebuild Lesson 9 in Units 4–7 (3.9 is done) with genuinely fresh images and the approved concept progression; fix duplicated foundation cards (six in 4.9, six in 5.9, seven in 6.9, one in 7.9) and weak contrasts without padding. Preserve the newer universal Completa contract from the concurrent primary-checkout work.
5. Generate/bind the remaining immutable English dialogue and Spanish kickoff audio using the pinned cast, operator-only declared cost ceiling, no automatic paid retries, truthful receipts and review. The Unit 2 mission batch above is persisted; no new video batch has run in this task.
6. Finish the still/video pairing audit and replacements. The known father-working workshop still / construction-site video mismatch and padded drinking clip are not fixed by this branch. Do not delete old-looking files without tracing source/poster/variant references.
7. Refresh manifests, semantic contracts, snapshots, persistent audio catalog and fingerprints from the finished canonical lessons. Run full backend/web/mobile gates, browser QA, real Expo portrait/landscape and low-signal playback/recovery checks.
8. Fetch/reconcile current main immediately before pushing/merging. Use PR → protected main → CI Preview only. No local EAS publication and no Production without explicit approval after exact-commit Preview testing.

## Isolation and concurrent edits

Task branch: `codex/units-2-7-unit1-parity`, based on `52dbcbeb5fc82b47cc3b79538687cfe0edfd9da3`.
Primary checkout has extensive ongoing edits to all 63 non-mission lessons, shared UI and audio/media catalogs on `feat/lesson-1-1-completa-sentence-standard`. They were not imported, staged, reverted or overwritten. The task worktree is `.codex-task-worktrees/units-2-7-unit1-parity`.

Never overwrite or discard that unrelated uncommitted work. The approved staged checkpoint is integrated only against freshly fetched `origin/main`; the 153 dirty primary-checkout paths remain outside this release. If concurrent work reaches main first, combine it safely and regenerate the final catalogs/snapshots before publication. Do not remove any dirty/in-progress worktree or unmerged branch as cleanup.

## Verification so far

- Mobile TypeScript (`tsc --noEmit`): pass.
- Web optimized build: pass using the existing pinned dependency installations (the shared frontend installation lacks `html2canvas`; the existing mobile installation supplies it through process-local `NODE_PATH`). No dependency versions or primary-checkout files were changed.
- Backend lesson structure/snapshot, schema, exporter protection and parity-audit unit tests: 83 pass.
- Web/mobile mission, native Yoga, portrait/landscape, cue, voice, Unit 1 target preservation and shared-presentation regression group: 49 pass.
- Current parity inventory: all six units correctly report unfinished coverage and reused review media. This is an acceptance failure, not a passed rollout.
- Full end-user/device QA, new media/audio integration and protected Preview release: not done.
