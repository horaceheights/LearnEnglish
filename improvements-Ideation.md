# Project Health Review — 2026-09-22

**Temporary** — archive when done. Not part of the course pipeline.

**Review status:** Earlier contributions below are preserved as proposals, not verified facts or approved changes. The [Codex independent review](#codex-independent-review--2026-09-22) checks them against `main` at `6b9284eb91ba`; read its corrections before acting on rows 1–26. This document does not change the roadmap, curriculum, or release guardrails.

---

## Agent prompt (read this first)

```
Review the SpanGlish codebase independently taking into consideration the questions below "Human Questions" as well. read the findings below then go and do deep research see where you agree and where you disagree and add your very own ones too. Map each finding to a roadmap stage from docs/planning/roadmap.md (P0–P9). Add your section at the bottom. Focus on structural/code quality issues. Be concise: one line per finding with the file, the issue, and the roadmap stage. Be aware I am not a developer just a systems Engineer when using dev stuff jargon. finally if your suggestions are unique add them to the "Unique suggestions" section below.
```

---

## 🧑 Human Questions

- is our codebase well architected for production grade?
- Are we using latest modern frontend and backend features to make this app have most Pro for user Experience?
- is our UI to simple that can make a user feel they are getting premium and a serious app?
- is our A1 design and coverage good we may need to add a A1+ level and do we really need to fixate to 7 units 70 lessons? we need to be flexible to make sure, users are getting enough practice, there is good progression etc. we need to go beyong then just covering the minimum for A1
- can the docs and scripts can be or need to be consolidated for better performance and possible ambiguity? I noticed many are named after specific unit lessons, they need to be totatlly generic and agnostic, repeateable etc.
- Cawe make gihub action workflows consoliadted, unambigous, more efficient? if need be

---

## ❓ Open Questions (agent ambiguity)

- Is `main.py` too large or just well-organized for its scale?
- ORM vs raw SQL — judgment call?
- Frontend scratchpad — clean up or leave?
- Generation spec — new file or extend `course-design-a1.md`?

---

## ✅ Unique suggestions

| # | Finding | Proposed by | Roadmap stage |
|---|---------|-------------|---------------|
| 1 | `main.py` (624 lines) needs modular route splitting | OpenCode | P2 / engine infra |
| 2 | `tracking.py` (~1000 lines) mixes DB, models, and business logic | OpenCode | P2 / engine infra |
| 3 | FastAPI `@app.on_event` lifecycle is deprecated | OpenCode | P2 / engine infra |
| 4 | No documented step-by-step lesson generation workflow | OpenCode | P1 / Content architecture |
| 5 | DB schema evolves via inline `ALTER TABLE` — no migration framework | OpenCode | P2 / engine infra |
| 6 | `APP_API_KEY` unset silently disables all API auth | OpenCode | P0 / Reliability |
| 7 | `image_url()` cache-busting in `data.py` uses fragile hardcoded dates | OpenCode | P2 / engine infra |
| 8 | Frontend is an undocumented scratchpad with no clear purpose | OpenCode | P1 / Content architecture |
| 9 | `scripts/` has 116 files — many are unit-specific one-off repairs with numbered variants (`build_a1_four_card_repairs_a.py` through `qa1`) | OpenCode | P2 / engine infra |
| 10 | Frontend `LessonPlayer.js` is 1566 lines — same monolith problem as `main.py` | OpenCode | P2 / engine infra |
| 11 | Hardcoded version dates in frontend (`LESSON_IMAGE_VERSION = "20260920-action-continuity-v3"`) — same fragile pattern as `data.py` | OpenCode | P2 / engine infra |
| 12 | Mobile uses mixed module formats (`.mjs` and `.cjs`) — inconsistent standards | OpenCode | P2 / engine infra |
| 13 | Frontend imports from `../../mobile/src/` — web and mobile are structurally coupled | OpenCode | P2 / engine infra |
| 14 | 3 GitHub Actions workflows could share common steps | OpenCode | P1 / Content architecture |
| 15 | Many docs are unit/lesson-specific rather than generic and reusable | OpenCode | P1 / Content architecture |
| 16 | `backend/app/course_audio.py` (1,619 lines, the largest backend file) mixes TTS provider calls, ffmpeg audio processing, a 330-line hardcoded syllable dictionary, and caching in one module — a bigger monolith risk than `main.py` | Copilot | P2 / engine infra |
| 17 | `main.py`'s `_rate_limit_hits` dict grows in memory forever with no cleanup/TTL — a long-running server slowly leaks memory | Copilot | P0 / Reliability |
| 18 | `conversation.py` and `course_audio.py` silently fall back to defaults when a Gemini/TTS provider call fails, without logging the real error — makes production problems hard to diagnose | Copilot | P2 / engine infra |
| 19 | `google-genai>=2.3.0` is the one unpinned dependency in `backend/requirements.txt`; every other dependency is pinned to an exact version | Copilot | P2 / engine infra |
| 20 | Backend has 43 test files but no coverage tool (e.g. `pytest-cov`) wired in, so the real percentage of tested code is unknown | Copilot | P0 / Reliability |
| 21 | Frontend has no component or end-to-end UI tests, only mission/pronunciation logic unit tests, despite being the main QA/preview surface for the whole course | Copilot | P1 / Content architecture |
| 22 | Inconsistent module format (`.mjs` vs `.cjs`) is workspace-wide, not just mobile: `frontend/lib` mixes both, `scripts/` mixes both, and one stray `.mjs` file sits among 84 `.cjs` files in `mobile/tests` | Copilot | P2 / engine infra |
| 23 | No production user-authentication system exists yet; today's "auth" is one shared app-embedded key by design during the compatibility rollout — a bigger production-readiness gap than any single file's size | Copilot | P1 / Content architecture |
| 24 | `.github/workflows/*.yml` repeat the same ~8 setup steps three times each; roughly 190 of ~230 total lines are duplicated with no shared composite action | Copilot | P1 / Content architecture |
| 25 | `scripts/` (106 Python files) has no README or taxonomy; roughly two-thirds are numbered one-off unit/lesson repair variants (e.g. `build_a1_four_card_repairs_a.py` … `_e.py`, `_qa1.py`) mixed in with the reusable `audit_*`/`validate_*` tools | Copilot | P1 / Content architecture |
| 26 | `docs/qa/` holds 57 files flat with no folder or naming convention separating ~40+ dated one-off snapshots from the handful of durable, reusable guidance docs | Copilot | P1 / Content architecture |
| 27 | `backend/app/main.py::_client_ip` trusts the first forwarded address and rate limits live in one process; establish trusted proxy handling and test the deployment boundary before relying on these limits for paid-provider protection | Codex | P0 / Reliability |
| 28 | `backend/app/tracking.py` accepts a missing production `DATABASE_URL` and opens a local SQLite file; fail startup for this production misconfiguration and document a tested database restore procedure | Codex | P0 / Reliability |
| 29 | `backend/tests/test_tracking.py`, `test_lesson_results.py`, and `.github/workflows/preview-integrity.yml` test storage with SQLite without a PostgreSQL test job; exercise production database migrations and concurrent result updates | Codex | P0 / Reliability |
| 30 | `mobile/src/api.ts::jsonRequest` trusts parsed JSON with `as T`; validate critical responses at runtime and check them against the backend contract so an incompatible response cannot silently become learner state | Codex | P2 / Shared engine |
| 31 | `.github/workflows/preview-integrity.yml` and its verification scripts omit the existing `frontend/tests` suites and a web build; add a required web check alongside mobile/backend checks | Codex | P0 / Cross-platform verification |
| 32 | `LessonScreen.tsx::recordAttempt`, `LessonPlayer.js`, and `tracking.py::create_attempt` lose failed attempt uploads and assign a fresh server ID on each submission; add a durable device queue and duplicate-safe event IDs before adaptive analytics | Codex | P6 → P3 / Reliable learning history |
| 33 | `backend/app/schemas.py::LessonCard` has optional `slide_id`, while `tracking.py::CardAttemptCreate` stores card position without content revision or concept IDs; add stable activity/concept identity before comparing mastery across edits | Codex | P1 → P3 / Content and mastery |
| 34 | `docs/product/course-design-a1.md` defines topics and progression but no CEFR outcome-to-assessment matrix; record what learners can do independently, including delayed checks, before claiming complete A1 mastery or defining A1+ | Codex | P1 → P3 / Learning foundation |
| 35 | `README.md`, `docs/operations/deploy.md`, and `course-design-a1.md` retain obsolete authoring/deployment guidance beside newer guardrails; identify current procedures and mark superseded instructions explicitly | Codex | P1 / Documentation foundation |
| 36 | `backend/app/conversation.py` logs raw failed model output, and `main.py` returns provider exception text to callers; use redacted diagnostics and safe errors before broader conversation use | Codex | P0 → P8 / Diagnostics and conversation |
| 37 | `mobile/src/screens/LessonScreen.tsx` combines playback, recording, persistence, scoring, and navigation in 3,739 lines; extract tested responsibilities incrementally while preserving lifecycle order | Codex | P2 / Shared engine |
| 38 | `docs/qa/engine-qa-checklist.md` and `docs/planning/roadmap.md` need measured experience targets for lesson/audio start, recovery, and responsiveness on a reference phone; establish baselines before performance work | Codex | P0 → P6 / Experience quality |

---

## 🔍 Challenged Findings

*Findings above that a new agent disagrees with or wants to push back on. Include the reasoning.*

- **#1 (`main.py` needs modular route splitting) — partially disagree.** Verified line count is 507, not 624, and it is not the codebase's worst monolith. `course_audio.py` (1,619 lines, row 16 above) mixes far more unrelated concerns — TTS provider calls, ffmpeg audio DSP, a 330-line hardcoded syllable table, and caching — in one file. If only one file gets split first, it should be `course_audio.py`, not `main.py`.
- **#6 (`APP_API_KEY` unset silently disables all API auth) — disagree with the framing.** This is a deliberate, documented staged-rollout switch (see `docs/operations/deploy.md` and the 2026-08-26 entry in `project-guardrails.md`), not an accidental gap: per-route rate limits stay active even while the key is unset, and a startup log line warns clearly. The real risk is a process one — someone forgetting to turn enforcement on before wide launch — not a silent code defect. Worth keeping on the P0 list, but as a launch-checklist item rather than a bug.
- **#10 (`LessonPlayer.js` is 1566 lines — same monolith problem as `main.py`) — disagree.** Actual size is 2,207 lines, larger than reported, but it is not the same shape of problem. It reads as sections (constants, small UI helpers, a `useSpeech()` hook, pronunciation utilities, the component) rather than a file mixing unrelated route handlers and business logic. It is also not the shipped learner app — the frontend is a QA/admin/preview harness (see `frontend/scripts/vercel-ignore-build.sh` and `frontend/app/admin`, `/test-scenes`, `/pronunciation-poc` routes); mobile is the production client. Splitting it is reasonable maintenance work, but it is lower urgency than `course_audio.py`.
- **#12 (mobile uses mixed module formats — inconsistent standards) — confirmed but overstated.** `mobile/tests` is 84 files, 83 of them `.cjs`, with exactly one stray `.mjs` file — that reads as one inconsistency, not a systemic mobile problem. The real mixed-format pattern spans the whole workspace: `frontend/lib` mixes `missionExperience.mjs` with `missionPresentation.cjs`/`missionTargetInteraction.cjs`, and `scripts/` mixes two `.cjs` and two `.mjs` files. This should be one workspace-wide module-format decision (see row 22), not a mobile-only fix.
- **#8 (frontend is an undocumented scratchpad with no clear purpose) — partially disagree.** It is not fully undocumented: `frontend/scripts/vercel-ignore-build.sh` explains the `mobile/src` coupling in comments, and `frontend/tests` has focused suites for mission/pronunciation contracts. The real gap is narrower — there is no top-level README stating plainly "this is a QA/admin/preview harness, not the shipped app" — which is still worth fixing so a newcomer does not mistake it for the product.

---

## ✨ New Findings

*Findings from a new agent that weren't in the original list. These get promoted to the top table after confirmation.*

Copilot's new findings were added directly to the **Unique suggestions** table above (rows 16–26) per this round's agent-prompt instruction, rather than staged here first. Summary of what's new (not already covered by rows 1–15):

- `course_audio.py` as the real largest-file risk, not `main.py` (row 16).
- Unbounded in-memory rate-limit tracking dict (row 17).
- Silent error-swallowing fallbacks in `conversation.py`/`course_audio.py` that hide real provider failures (row 18).
- One unpinned dependency (`google-genai`) among otherwise exact-pinned requirements (row 19).
- No test-coverage tooling on the backend despite 43 test files (row 20).
- No component/E2E tests on the frontend (row 21).
- Module-format inconsistency reframed as workspace-wide, not mobile-only (row 22).
- Missing production user authentication as a bigger production-readiness gap than any file-size issue (row 23).
- Quantified GitHub Actions duplication: ~190 of ~230 lines repeated across 3 workflows (row 24).
- Quantified scripts/ one-off ratio: ~2/3 of 106 files are numbered lesson-specific repair variants (row 25).
- Quantified docs/qa/ ratio: 57 files flat, ~40+ are dated one-off snapshots (row 26).

---

**Deep details?** Inspect `scripts/` (116 files), `frontend/components/LessonPlayer.js` (1566 lines), `.github/workflows/`, `mobile/src/`, `docs/qa/`, `docs/product/`.

---

## 🤖 Copilot Review — 2026-09-22

Method: read `docs/planning/roadmap.md` (P0–P9) and `docs/product/project-guardrails.md` in full, then dispatched parallel deep-dives across `backend/app`, `frontend`, `mobile`, `scripts/`, `docs/qa`+`docs/product`, and `.github/workflows`, and verified the specific line counts, dependency pins, and key claims directly (not taken on faith from the first pass).

### Answers to the Human Questions (plain language, no dev jargon assumed)

- **Production-grade architecture?** Mostly yes for where the product is today (pre-wide-launch): current, well-pinned dependencies, decent baseline security (safe key comparisons, parameterized database queries, no sensitive data sent to Sentry). Three real gaps before it's "production-grade" at scale: (1) database changes are made by hand instead of through a repeatable migration tool, so it's easy to make an unsafe change later; (2) there is no real user login system yet — today's "auth" is one shared key baked into the app, which is an intentional interim step already tracked on the roadmap (P1), not a bug; (3) one backend file (`course_audio.py`) does too many unrelated jobs, making it the single riskiest file to change without breaking something else.
- **Using modern frontend/backend features for a "Pro" feel?** Yes on framework choice — the backend runs current FastAPI/SQLAlchemy, the web frontend runs the newest Next.js/React, and mobile runs a current Expo/React Native version. One dated pattern: the backend starts/stops background work using an approach FastAPI itself has since replaced with a newer one (cosmetic to users, real to maintainers). Bigger gap: nothing in the app is written in a statically typed language (TypeScript), so nothing catches a mismatched data shape before it reaches a real user — worth prioritizing before adding more features, given how content/data-heavy this app is.
- **Is the UI too simple to feel premium?** Not answerable from code structure — this is a visual/design judgment call, not a structural code-quality issue, so I'm intentionally not guessing here. Recommend a dedicated design/UX pass with real screenshots instead of folding it into a code-quality review.
- **Is A1 coverage/7-units-of-70 too rigid; need an A1+ level?** This is a curriculum decision, not a technical limitation — nothing in the engine hardcodes "70" in a way that blocks growth. The roadmap already documents this as a deliberate sequencing choice (see "Content-scaling gate" in `docs/planning/roadmap.md`): more content is intentionally paused until the reusable engine is solid, specifically so a future A1+ tier or larger course doesn't multiply today's inconsistencies. Once that gate clears, the docs describe the system as ready for "rapid, large-scale course creation" — so this looks structurally feasible later, and is a product sequencing question for you to decide, not a code blocker.
- **Can docs/scripts be consolidated into generic, repeatable tools?** Yes, confirmed and quantified: `scripts/` has 106 Python files and roughly two-thirds are one-off, single-lesson repair variants (numbered `_a` through `_e`/`_qa1`) with no index telling them apart from the ~15-20 genuinely reusable tools. `docs/qa/` has the same shape: 57 files flat, ~40+ are dated one-off snapshots mixed in with a handful of durable guides, no folder or naming convention to separate them. This is real, solvable clutter — not urgent, but worth a cleanup pass (P1).
- **Can GitHub Actions workflows be consolidated?** Yes, confirmed and quantified: the 3 workflow files total ~230 lines, and roughly 190 of those lines are the same ~8 setup steps (checkout, install dependencies, run tests, etc.) copy-pasted three times. This can be pulled into one shared, reusable step template, which also reduces the chance the three workflows quietly drift out of sync with each other over time.

### Findings (file — issue — roadmap stage)

- `backend/app/course_audio.py` — largest backend file at 1,619 lines, mixes TTS providers, audio processing, and a hardcoded syllable table — bigger split priority than `main.py` — **P2**
- `backend/app/main.py` (507 lines, not 624) — deprecated `@app.on_event` startup/shutdown hooks instead of FastAPI's current `lifespan` pattern — **P2**
- `backend/app/main.py` `_rate_limit_hits` dict — grows unbounded in memory with no cleanup — **P0**
- `backend/app/tracking.py` (925 lines) — schema changes via inline `ALTER TABLE`, no migration framework (e.g. Alembic) — **P2**
- `backend/app/conversation.py`, `course_audio.py` — provider failures fall back silently instead of logging the real error — **P2**
- `backend/requirements.txt` — `google-genai` is the only unpinned dependency — **P2**
- `backend/tests/` — 43 test files but no coverage tool wired in; real coverage is unknown — **P0**
- `frontend/lib/api.js`, `mobile/src/config.ts` — confirmed the embedded `APP_API_KEY` is an intentional, documented abuse-deterrent value (not a leaked secret or broken auth); real risk is only in leaving enforcement off past launch — **P0**
- `frontend/components/LessonPlayer.js` (2,207 lines, not 1,566) — large but internally organized, not a mixed-concerns monolith like `main.py`; lower split priority — **P2**
- `frontend/`, `frontend/app/admin`, `/test-scenes`, `/pronunciation-poc` — no top-level README stating the frontend is a QA/admin/preview harness, not the shipped app — **P1**
- `frontend/tests/` — only mission/pronunciation logic tests; no component or end-to-end UI tests — **P1**
- Module format (`.mjs` vs `.cjs`) — inconsistent across `frontend/lib`, `scripts/`, and one stray file in `mobile/tests`; needs one workspace-wide convention — **P2**
- `scripts/` — 106 files, no README/taxonomy, ~2/3 are numbered one-off lesson repairs — **P1**
- `docs/qa/` — 57 files flat, ~40+ dated one-off snapshots mixed with durable guidance, no separating convention — **P1**
- `.github/workflows/*.yml` — ~190 of ~230 total lines duplicated across 3 workflows, no shared composite action — **P1**
- No production user-authentication system yet (already tracked on roadmap P1) — bigger production-readiness gap than any single file's size — **P1**

Disagreements with the original list are detailed above in **Challenged Findings**; new items are in the **Unique suggestions** table (rows 16–26).

---

## Codex independent review — 2026-09-22

**Assessment:** SpanGlish has substantial foundations: canonical lesson data, immutable media receipts, shared interaction logic, strict mobile TypeScript, durable result recovery, and protected releases. Broad production readiness still needs learner-specific access control and stronger operational evidence. Prioritize those and actual learning outcomes ahead of cosmetic modernization or splitting files solely by length.

**Method and limits:** Independently inspected the fetched `main` snapshot `6b9284eb91ba`, the roadmap, relevant guardrails/course design, API/auth/storage, both lesson players, tests, authoring tools, and all three workflows. Checked official framework, GitHub, OWASP, and CEFR references linked below. Ran the four web test files: **18 passed, 0 failed**. This was a source/document review, not a live security test, installed-device UX assessment, full release verification, or CEFR certification. Suggestions remain unapproved; P0–P9 below refer to the existing roadmap, not new stages.

### Answers to the human questions

| Question | Recommendation | Roadmap |
|---|---|---|
| Production-grade architecture? | Keep the present mobile/web/API structure; a rewrite or microservices would add work without resolving the main gaps. First prove that one learner cannot read/change another learner's data, production storage cannot silently fall back to a disposable file, and recovery works on PostgreSQL and real devices. | P0, P1 |
| Modern enough for a professional experience? | Yes in architecture, but “all latest” is inaccurate: web declares Next.js `^15.5.15` and React `19.0.0`; mobile declares Expo `~57.0.12`, React Native `0.86.2`, and TypeScript `~6.0.3`. Next.js 15 is Maintenance LTS, while 16 is Active LTS. Maintain supported patches and compatible native packages; prioritize response validation, playback reliability, accessibility, and measured speed. [Next.js support policy](https://nextjs.org/support-policy), [Expo upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). | P0, P2, P6 |
| Is the UI too simple to feel premium? | Simplicity suits a beginner course. Existing help, animation, results, and offline recovery are meaningful product work. Test five journeys—start/resume, listen, make a mistake, speak, finish—on small/large phones with larger text and reduced motion; judge readability, consistency, response time, and clear next actions. Visual appeal still needs observation of the actual app with learners. | P0, P1, P4 |
| Is A1 sufficient; do we need A1+ or more lessons? | The syllabus has a coherent progression, fresh reviews, and applied missions; those are strengths, not evidence that learners retain or transfer every skill. Map outcomes to assessments first. Keep 70 as the current release baseline, then let measured gaps justify more practice or a revised course shape. A1+ can be a clearly defined product extension, not an assumed seventh CEFR reference level. | P1, P3; conversation delivery P8 |
| Consolidate docs and scripts? | Yes: one indexed current authoring procedure, reusable operations, and separate historical evidence. Keep unit-specific stories, target coordinates, receipts, and regression fixtures specific. Fewer files alone do not improve runtime performance; reducing conflicting instructions and repeated maintenance is the benefit. | P1, P2 |
| Consolidate GitHub Actions? | Share dependency setup and common verification while retaining separate integrity, Preview, and Production entry points. Preserve protected-main checks, exact commit identity, Preview/Production review policies, environment gates, and explicit Production approval. Reuse improves maintenance; caching and avoiding redundant work improve execution time. [GitHub reuse guidance](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations). | P0 safeguards; P2 tooling |

### What I agree with and what needs correction

| Earlier claim | Verified finding and decision |
|---|---|
| #1, #2, #10, #16: file sizes establish refactor priority | Current counts: `main.py` **624**, `tracking.py` **997**, `course_audio.py` **1,756**, web `LessonPlayer.js` **6,084**, mobile `LessonScreen.tsx` **3,739**. Several earlier measurements are stale. Split by independently testable responsibilities and regression history, not by a line-count threshold; start with the risky behavior being changed. **P2.** |
| #3: deprecated FastAPI lifecycle | Confirmed: `main.py` uses `@app.on_event` and initializes the database during import. Move resource initialization/cleanup into a tested lifespan boundary; separate controlled schema migrations from ordinary startup. [FastAPI recommends lifespan](https://fastapi.tiangolo.com/advanced/events/). **P2.** |
| #5: migrations; open question “ORM vs raw SQL?” | Agree on versioned migrations and restore rehearsal. SQLAlchemy is already used with parameterized SQL; adopting its object-mapping layer is optional and would not itself solve migrations, access checks, or concurrent updates. Preserve the existing duplicate-safe result merge. **P0/P2.** |
| #6, #23: app key/authentication | An unset app key produces a warning, and admin routes still require their separate key. However, enabling the embedded app key does **not** establish learner ownership: `/api/users/{user_id}`, its delete/reset routes, and session/result routes accept caller-supplied identities without an authenticated learner. Make authentication **and** per-record authorization launch criteria, with learner-A/learner-B denial tests. This sharpens #23 rather than adding a duplicate suggestion. [OWASP guidance](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/). **P0/P1.** |
| #7, #11: manual media version strings | Confirmed in `backend/app/data.py` and frontend media code. Move toward manifest-derived revisions when touching this path; retain current invalidation until byte/hash checks prove replacement behavior. A date in a URL is not itself a defect. **P2/P6.** |
| #8: frontend purpose is undocumented | Disagree: root `README.md` explicitly calls it a testing/admin preview application. Keep it as an intentional web validation surface, with parity checks and a clear support scope. Do not discard it as a scratchpad. **P1/P0.** |
| #12, #22: mixed module formats are a defect | Disagree with blanket standardization. Mobile currently has **74 `.test.cjs` and 8 `.test.mjs`** suites; its runner explicitly handles both and rejects unlisted suites. Formats can serve different Node/compiler needs. Change only demonstrated interoperability problems. **P2, low priority.** |
| #13: web importing mobile modules is inherently wrong | Sharing pure lesson logic prevents behavioral drift. The naming/ownership boundary is awkward, so a small shared package is reasonable once exports, types, and tests are defined; do not fork logic or move native dependencies into web. **P2.** |
| #14, #24: ~190 of ~230 workflow lines are duplicated | There are **305 total lines** across files of 66/118/121 lines. Dependency setup and verification repeat, but release authorization and publication differ intentionally. No measured duplicate-line ratio supports the old estimate. **P2, with P0 release safeguards.** |
| #15, #25, #26: all lesson-specific material should become generic | There are **115 direct files in `scripts/` (106 Python)** and **66 direct files in `docs/qa/`**. The claimed two-thirds repair ratio is not verified. `scripts/parity_pack.py` already centralizes installation/receipt checks for unit builders; build on it. Preserve specific educational evidence and check imports before moving scripts. **P1/P2.** |
| #4: no documented generation workflow | Too absolute: `course-design-a1.md`, `docs/operations/persistent-course-audio.md`, and tool documentation cover significant parts. The gap is one current, linked end-to-end procedure; the course design still describes older canvas regeneration while guardrails prohibit overwriting newer canonical content from that exporter. **P1.** |
| #17: rate-limit memory leak | Confirmed and narrower: timestamps expire only when the same key is reused; inactive address/path keys remain. Bound/expire those entries and add tests, then address trusted client identity and multi-process enforcement in #27. No production memory measurement was taken. **P0.** |
| #18: conversation errors are silent | Disagree for `conversation.py`: synthesis failures log warnings; parsing failures log errors including raw output. Some `course_audio.py` fallback catches lack diagnostics. Add redacted, structured fallback events instead of indiscriminately logging provider responses; #36 addresses the existing exposure. **P0/P2/P8.** |
| #19: one unpinned backend requirement | Correct: `google-genai>=2.3.0` is open-ended. Exact top-level pins still do not lock indirect dependencies. Add reproducible resolution and a reviewed update/security-check process; do not pin indefinitely without updates. **P0/P2.** |
| #20, #21: test confidence | There are **45 backend test files** and **4 web test files**. Coverage instrumentation would expose gaps, but a percentage is not proof of correctness and does not require switching from `unittest` to pytest. Web tests pass locally; several inspect source strings, so add actual browser/native journeys alongside them. Mobile already has simulated native-layout tests. **P0.** |
| “Nothing uses TypeScript” | False: **71 `.ts`/`.tsx` files under `mobile/src`**, `strict: true` in `mobile/tsconfig.json`, and `tsc --noEmit` in Preview verification. The concrete remaining gap is unchecked network data (#30), not a wholesale TypeScript conversion. **P2.** |
| “Nothing blocks growth beyond 70” | Incomplete: `mobile/release-integrity.json` and its verifier enforce **70 lessons / seven units / ten each**, as do the current product and release rules. Expansion is possible through an approved, coordinated contract migration; removing the gate casually would weaken protection against accidental course loss. **P1.** |

### Curriculum proposal: prove depth, then expand

Create a coverage matrix linking each intended learner outcome to its teaching lessons, prerequisites, fresh assessment, permitted help, and observed result. Sample outcomes should include exchanging personal information, understanding a short practical message, making a simple request, and producing a short written message. A taught phrase, recognition choice, and independently produced response are different evidence.

CEFR includes reception, production, interaction, and mediation; its A1 descriptors cover supported interaction and simple written production. The app's image recognition, construction, and pronunciation practice provide useful foundations, but repeating a displayed answer does not establish independent interaction. That is an assessment gap to investigate, not a finding that particular lessons are missing. [CEFR Companion Volume, sections 2.6, 3.2 and 3.3](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4).

For an initial learner pilot, compare an unfamiliar task immediately after learning and again about a week later; record accuracy, help, retries, and ability to respond without the answer shown. This is a proposed evaluation design, not a CEFR-prescribed schedule or an already-approved pass policy. Use the results to choose supplementary practice, richer existing units, or an explicitly scoped A1+ bridge. New response mechanics still need approval under the shared-engine guardrails.

**Keep the current 70-lesson release contract during this review.** If expansion is chosen, first define stable course/unit/lesson/activity IDs, course versions, prerequisites, progress migration, and variable unit sizes; then update the catalog, browser, audits, snapshots, and release manifest together. Preserve completed learner work and full-catalog checks. This reconciles flexibility with today's protection against publishing incomplete content.

### Concrete next work, in order

| Priority | Bounded deliverable | Evidence required to call it done |
|---|---|---|
| P0 / P1 | Specify learner identity and ownership rules; implement them across profile, progress, session, result, deletion, and admin paths | Two test learners cannot read or mutate each other's records, including guessed IDs; intended admin actions and account recovery remain possible. |
| P0 | Harden storage and paid-provider protection (#17, #27–29, #36) | Missing production database configuration fails clearly; backup restores into a test database; PostgreSQL migration/concurrent-sync tests pass; limiter expiry/trusted-proxy tests and redacted-error tests pass. |
| P0 | Add required web verification (#31) and finish the existing physical-device audit | Existing web suites/build run in CI; a representative lesson completes through wrong answer, retry, speech, interruption, offline recovery, and saved result on the required clients. Record manual gaps honestly. |
| P1 / P2 | Publish a scripts index and one current authoring runbook; share workflow setup | Each tool identifies reusable vs historical status, inputs/outputs, read-only vs write/paid behavior, and replacement if retired; a clean checkout reproduces one reviewed content change with all release guards intact. |
| P1 / P3 / P6 | Pilot the outcome matrix plus durable, versioned learning events (#32–34) | Delayed assessment evidence exists; offline events survive restart and repeated upload without duplicate attempts; edited activities cannot silently inherit the wrong mastery history. |

Runtime refactors (#1, #2, #10, #16, #37) should accompany these bounded changes, preserving audio/cancellation/resume behavior through focused tests. Establish the experience baselines in #38 during device QA, then optimize observed delays. Do not add an ORM rewrite, repository-wide module-format conversion, or more visual effects to the critical path without a demonstrated benefit.

### Remaining open questions resolved

- **How large should `main.py` be?** No fixed limit; separate request handling, lifecycle, access policy, and storage when it makes behavior safer to test and change. **P2.**
- **ORM or raw SQL?** Retain the current parameterized SQL unless a concrete feature benefits from object mapping; prioritize migrations and production-database tests. **P0/P2.**
- **Clean up the frontend?** Maintain its documented QA/admin purpose, eliminate obsolete routes only after usage review, and enforce its shared lesson behavior in CI. **P0/P1.**
- **Where should the generation specification live?** Keep educational rules in `course-design-a1.md` and approved standards in `project-guardrails.md`; add a linked operational runbook/index for commands and retain machine-readable schemas/manifests as executable contracts. Avoid another competing curriculum specification. **P1.**
