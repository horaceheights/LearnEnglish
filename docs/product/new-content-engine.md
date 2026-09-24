# New Content Engine — Agent Guide

Use this guide whenever creating or substantially revising lessons or units. The goal is a repeatable process that produces coherent, effective learning content through a shared engine.

**Status:** this is the creation contract. Shared playback, schemas, media tools, validators, and exports exist; a unified, unit-agnostic authoring engine is still incomplete. This document does not make that implementation complete.

**Scope:** follow the user's explicit task boundaries. Analysis or documentation work does not authorize implementation, paid generation, commits, PRs, or publication. Apply existing authorization without requesting it again.

## 1. Keep the engine separate from the curriculum

| Layer | Responsibility |
|---|---|
| Shared engine | Supported activities, sequencing, feedback, media/audio integration, validation, and export. |
| Curriculum configuration | Level, prerequisites, progression, unit structure, teaching rules, and coverage requirements. |
| Unit content | Learning outcomes, vocabulary, scenes, story, prompts, answers, and asset bindings. |

**For supported activities, a new unit must require content/configuration changes, not a new unit-specific program or application exception.** Unit identifiers may identify data; they must not select bespoke learning behavior. A genuinely new mechanic needs explicit approval and one reusable implementation.

Reusing mechanics does not mean copying lessons: each unit needs its own communicative purpose, meaningful progression, and appropriate story. Future levels and unit sizes belong in configuration. Unit size follows content (approved 2026-09-23): a unit has as many forward-building lessons as it needs, followed by one review and one mission. The release manifest (`mobile/release-integrity.json`) pins each unit's lesson count; a rebuilt unit updates it in a deliberate curriculum release.

## 2. Read the governing sources

| Source | What it governs |
|---|---|
| [A1 course design](course-design-a1.md) | Starting input for the current course: audience, outcomes, unit/lesson sequence, vocabulary, grammar/functions, prerequisites, and learning progression. |
| [Project guardrails](project-guardrails.md) | Approved behavior, preservation rules, interaction standards, and verification. |
| [Product roadmap](../planning/roadmap.md) | Product priorities, implementation dependencies, and the content-scaling gate. |
| [Lesson schemas](../../backend/app/schemas.py) | Supported canonical fields and structural constraints. |
| [Canonical lessons](../../backend/lessons/) | Current content consumed by the product. Inspect comparable approved lessons before authoring. |
| [Answer-choice review](../qa/answer-choice-review.md), [audio contract](../operations/persistent-course-audio.md), [Engine QA](../qa/engine-qa-checklist.md) | Detailed content, asset, and learner-experience checks. |

Identify the actual authoring source for every affected lesson and distinguish it from generated output. The older [course canvas](a1-course-canvas.json) and its generator cannot safely reproduce all newer canonical lessons. Preserve the generator's overwrite guard; reconcile conflicts before regeneration. Never regenerate from an older source merely because a document calls it authoritative. Surface conflicting standards and follow the latest explicit user decision.

## 3. Derive the content brief from the course-design documents

Start with the applicable course-design documents. For the current A1 work, use [A1 course design](course-design-a1.md) and its relevant unit/lesson requirements. Use the requested unit or lesson; when asked to create the next content, follow the documented course sequence and prerequisites within the authorized scope. Derive the brief from those curriculum requirements and approved standards. Record the source sections so each content package is traceable to its course design. The roadmap continues to govern product priorities and the content-scaling gate.

The user does not need to supply a separate content brief. The only setup question is:

> Which tools should I use to generate the audio and the images?

Ask only for tool choices that have not already been supplied for the task. Reuse existing choices without reconfirmation. Record the selected tools/providers and keep their integration separate from curriculum and activity data.

Populate the following working inputs yourself from the course-design documents and supporting standards:

| Derived input | What the agent must establish |
|---|---|
| Audience and outcome | Level, learner/support language, and what the learner should be able to do afterward. |
| Language boundary | New vocabulary and grammar/functions; already taught language; prerequisites, including supporting words. |
| Progression | Lesson sequence, standard/review/mission roles, later retrieval, and evidence of learning. |
| Experience | Story or practical goal, supported activities, meaningful variation, and difficulty. |
| Content identity | Target unit/lesson/card identities, authoring source, revision strategy, and existing content to preserve. |
| Assets and scope | Selected audio/image tools, reusable media, required new assets, approved voice profiles, existing generation authorization and limits, requested outputs, and review responsibility. |

Resolve routine authoring details within those sources and record necessary assumptions. If a required curriculum decision or prerequisite is missing, identify the specific gap and continue independent work; do not invent an approved curriculum change or turn the brief into an intake questionnaire. These are planning requirements, not new schema fields. Serialize only fields supported by the current schemas and consumers.

## 4. Follow one creation process

### A. Plan the learning before the cards

Create a compact coverage map: **target → first teaching → guided practice → assessment → later retrieval**. Count evidence from what learners must understand or produce successfully, not vocabulary metadata or distractors.

Plan within the approved practice and pacing standards (2026-09-23). The thresholds are per-course configuration in [content standards](content-standards.json):

| Standard | A1 value |
|---|---|
| Standard lesson length | 40–42 cards; reviews 48–54 |
| New items per lesson | at most 8; split large sets across lessons |
| Practice per new item | at least 5 exposures across 4 stages, including Listen or Speak |
| Later reuse | the successful path of at least 2 later lessons (final unit exempt) |
| Language boundary | no word on any card, including distractors, before it is declared |

For current A1, preserve the standard `Learn → Recognize → Listen → Speak → Use` progression and its continuous concept/story order. Lessons 1–8 build richer uses of language; lesson 9 retrieves the required coverage through fresh material; lesson 10 resolves one coherent mission. Follow the linked curriculum and [unit parity contracts](a1-unit-parity-contracts.json) for exact requirements. Do not inflate card counts with repetition or assess untaught language.

### B. Compose through supported activities

Use existing schemas and shared authoring patterns. Author unambiguous answers, coherent distractors, contextual help, and feedback that explains the actual mistake. Avoid answer leakage before assessment. Treat images, audio, and all answer options as teaching content subject to the same language boundary.

Declare mission behavior through supported metadata, never a lesson-ID condition. If an activity or teaching explanation lacks shared support, identify the engine gap. Within an authorized implementation task, solve it once in the shared layer; otherwise return the blocked portion and continue independent work. Do not hide the gap inside another unit-specific builder.

### C. Prepare and review media/audio

Reuse approved assets where pedagogically appropriate. Preserve protected originals and provenance. Plan generation before spending; stay within existing authorization and bounded costs. Keep exact asset identities, revisions, hashes, and provider receipts.

Inspect the actual image and final crop against the intended meaning. Check the heard audio, transcript, speaker, timing, and lesson binding. Semantic evidence must come from inspecting the asset, not copying the intended answer. Agent inspection must never be recorded as human approval. Learner playback uses prepared immutable audio, not paid generation at runtime.

### D. Compile and export safely

Preflight the complete affected output before installing it. Preserve existing identities and learner progress; review any identity, ordering, or revision change that affects progress or audio bindings. Keep source, canonical content, assets, and generated client exports synchronized.

Compilation/export from identical accepted inputs must be repeatable without regenerating assets or making paid calls. Review the resulting changes for unrelated lesson or asset modifications. Preserve the complete catalog: a scoped lesson export must not accidentally replace the global course index with a subset.

### E. Validate the finished learning experience

- Run `python scripts/validate_lesson_cards.py` and the applicable backend lesson-structure checks. Its default semantic-review policy is Production-strict; use the Preview policy only within the protected internal Preview process.
- Run `python scripts/audit_content_practice.py` for the practice and pacing report and `--check` for the ratchet. A rebuilt lesson must leave no findings; remove its fixed entries from `content-practice-baseline.json` with `--write-baseline`, and never add entries to hide a new finding.
- For A1 parity work, run `python scripts/audit_a1_unit_parity.py --check`. Keep incomplete rollout findings explicit; do not lower requirements to obtain a pass.
- Apply the linked answer-choice, media, audio, and [guardrail verification requirements](project-guardrails.md#10-authoring-and-verification), plus mobile verification when its exports change.
- Inspect the complete learner journey on web and mobile, in normal entry and Engine QA: meaning, listening, speaking, wrong answers, help, recovery, progress, and completion. Include real phone layouts, orientation changes, and enlarged text where relevant.

Automated validity does not establish teaching quality. Record pedagogical and semantic review separately. If verification is unavailable, identify the missing evidence and leave that gate pending; a local tooling limitation is not evidence of a product defect.

### F. Hand over an identifiable content package

Provide the content brief and coverage map; authoring source and canonical outputs; asset/audio manifests and receipts; synchronized client exports; and a concise review record tied to the exact content and asset revisions. State what passed, what failed, and what remains pending, with the next responsible reviewer/action.

Distinguish authored, automatically validated, agent-reviewed, human-approved, and published states. An internal Preview allowance does not imply Production approval. Publication follows the [release workflow](../../mobile/RELEASE.md) only within the task's authorized scope.

## 5. Use existing tools honestly

| Existing component | Role and limit |
|---|---|
| [Legacy canvas builder](../../scripts/build_a1_units_2_7.py) | Historical generation path with overwrite protection; not a universal rebuild of current lessons. |
| [Unit 3 builder](../../scripts/build_unit_3_parity.py), [Unit 7 builder](../../scripts/build_unit_7_parity.py) | Existing unit-specific assembly; inspect for reusable patterns, not as templates for proliferating custom programs. |
| [Engine plans](../../scripts/content_engine/plan.py), [recipes](../../scripts/content_engine/recipes.py) | Imports live lessons into plans (content plus recipe) and composes them back exactly; `scripts/content_engine_plans.py` reports how many cards come purely from recipes. Rules the legacy builders enforce are inventoried in [the harvest](content-engine-harvest.md). |
| [Authoring layer](../../scripts/content_engine/author.py) | `scripts/content_engine_author.py BRIEF --out DIR` turns a brief (ordered items: English, Spanish, picture, kind; plus a pool of already-taught items) into a draft 40–42-card standard lesson and a review sheet. It proposes wrong options of the same kind and form that pass the shared answer-bank check. Proposals are always drafts: a person reviews every bank via [answer-choice review](../qa/answer-choice-review.md) before removing `draft` and installing. Worked example: [Family Actions brief](content-briefs/example-1.6-family-actions.json); real briefs: [Unit 1 family lessons](content-briefs/unit-1/). Before proposing, the engine asks the app's own mistake-hint resolver (`mobile/scripts/mistake-hint-oracle.cjs`) and replaces any wrong option that would only get a generic hint; a photo with an action video but no reviewed poster never goes on a two-choice picture card. `extend_lesson` appends practice cards to an existing lesson in its own style (captions, slide-id prefixes) without changing any reviewed card. |
| [Parity pack helpers](../../scripts/parity_pack.py) | Shared media installation and evidence handling; not the complete authoring engine. |
| [Still renderer](../../scripts/render_course_stills.py), [audio renderer](../../scripts/render_course_audio_assets.py) | Asset generation with planning/execution controls; neither establishes learning quality. |
| [Mobile exporter](../../scripts/export_mobile_preview_lessons.py) | Packages canonical content for mobile; does not design lessons. |

Check each tool's supported arguments and output scope before use. There is no verified single command that performs this entire process today.

## 6. Prove the engine is ready

The implementation is ready for broader expansion when an unfamiliar unit using supported activities can pass this process through content/configuration alone, without a new unit-specific script or application changes. Demonstrate this across units with different language goals and stories.

The proof must include meaningful coverage, reviewed assets, equivalent web/mobile behavior, preserved existing lessons and progress, and repeatable compilation/export from accepted inputs. Remaining implementation work is to reconcile authoring sources and connect shared composition, generation, validation, and packaging into that reusable path. A completed guide, renamed scripts, or a successfully parsed lesson is not sufficient evidence.
