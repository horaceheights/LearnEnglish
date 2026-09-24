# Content engine: rules inherited from the legacy builders

The engine replaces the unit-specific builders (`scripts/build_unit_*`, `scripts/build_a1_*`). Before any of those scripts is retired, every rule it enforces must live in a shared check, in shared engine code, or in reviewed data. This inventory was taken on 2026-09-23 from their `raise`, `throw` and `assert` statements.

## Why the builders cannot be the source

Live lessons have moved on from their builders. For example, `node scripts/build_unit_1_lessons.mjs` now rewrites 8 of the 9 Unit 1 files it owns. That's because course-wide passes such as the 2026-09-13 Completa rollout and the 2026-09-20 answer-bank fixes edited the lesson files directly. The canonical lesson files are the only true record. So the engine imports them into plans (`scripts/content_engine/plan.py`) instead of trusting any builder, and `scripts/content_engine_plans.py --check` proves that each plan rebuilds its lesson exactly.

## Content rules: already enforced course-wide

| Rule from a legacy builder | Shared enforcement |
|---|---|
| The correct answer is one of the card's options | `validate_lesson_cards.py` (`_correct_option`) |
| Each choice bank uses distinct pictures and options | `validate_lesson_cards.py` unique visible choices |
| All options answer on one semantic dimension (Unit 1's "no mixed option families") | reviewed banks in `answer-choice-contracts.json` via `answer_choice_guardrail.py` |
| Standard lessons keep Learn → Recognize → Listen → Speak → Use | `test_lesson_structure.py`, `lesson-media-semantics.test.cjs` |
| A completion card has a real blank | `validate_lesson_cards.py` grammar-card blank check |
| Constructions use 2–8 word tiles with a reviewed full translation | `validate_lesson_cards.py`, `test_lesson_structure.py`, answer-choice contracts |
| Every mission cue has exactly one target, in cue order | `validate_lesson_cards.py`, `test_mission_schema.py`, `lesson-mission-contract.test.cjs` |
| Every mission beat has a Spanish instruction and at least one target | `validate_lesson_cards.py` (`instruction_es`), `test_mission_schema.py` |
| Mission targets are at least 0.12 × 0.16 of the scene | `validate_lesson_cards.py`, `lesson-mission-contract.test.cjs` |
| Mission hero stills are fresh and unique | `validate_lesson_cards.py`, `test_mission_schema.py`, `lesson-media-semantics.test.cjs` |
| The Lesson 1.10 contract: 22 beats, M01–M22, chapter order, mechanics | `test_lesson_structure.py`, `lesson-mission-contract.test.cjs` |
| The mission's successful path covers the unit's language and adds none | `audit_a1_unit_parity.py`; `audit_content_practice.py` untaught-word rule |
| Lesson and review lengths | `content-standards.json` via `audit_content_practice.py`. This supersedes the builders' fixed counts (1.5 = 43, 1.8 = 50, 1.9 = 54, 3.9 = 8/8/18/6/8, Unit 2 = 30–40). |

## Media safety: already shared

These live in `scripts/parity_pack.py`, `scripts/render_course_stills.py` and `scripts/audit_course_media_preservation.py`, which every unit already calls:
- a paid image needs a receipt and a current pixel inspection;
- paid calls are capped by cost;
- every paid attempt, including rejected output, is reconciled;
- archived and rejected sources are never overwritten with different pixels;
- replaced media needs a reviewed preservation plan.

## Install safety: moved into the engine

`scripts/content_engine/install.py` (`scripts/content_engine_plans.py --install`) now carries the rules that lived only in unit builders:

| Rule | Where it lived | Engine status |
|---|---|---|
| Stop if the canonical lesson changed after the plan was taken | `build_unit_2_*`, `build_unit_3..7_parity.py` | Done. Each exported plan records its source file hash; install refuses on drift. |
| Never install draft or placeholder geometry | `build_unit_3..7_parity.py` | Done. Plans marked `draft` are refused. |
| Build everything, validate the course, then keep the files | every unit builder | Done. Every plan is composed before any write. The lesson validator (Preview policy) and the practice ratchet then run, and every file is restored if either fails. |
| Never crop a generated scene into compliance | `build_unit_2_mission_pack.py`, `build_unit_2_review_pack.py` | Open. Belongs to the engine's media step, still to be built. Until then, the unit's existing media flow applies. |

Unit-specific reviewed data those builders reference stays as data and is not retired: mission head and chest anchors, reviewed photo edits, preservation plans, and answer-choice contracts.

## Retired builders

| Builder | Retired | Replacement |
|---|---|---|
| `scripts/build_unit_1_lessons.mjs` | 2026-09-23, Unit 1 rebuild | Engine briefs in `docs/product/content-briefs/unit-1/` for 1.4–1.6; the canonical lesson files for the rest of Unit 1. Its rules were already enforced course-wide (see above); its mission anchors stay as reviewed data in `scripts/mission-head-anchors.json` and `scripts/mission-group-chest-anchors.json`. |
| `scripts/build_unit_2_lessons.mjs` | 2026-09-23, Unit 2 rebuild | Engine briefs in `docs/product/content-briefs/unit-2/` for the number lessons and the engine's extend mode for the other foundation lessons. The Unit 2 media-pack scripts (`build_unit_2_mission_pack.py`, `build_unit_2_review_pack.py`, `generate_unit_2_review_assets.py`, ...) stay until the engine has its own media step: they install and verify reviewed photo packs that tests still check. |
