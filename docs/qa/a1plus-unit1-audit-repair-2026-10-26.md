# A1+ Unit 1 audit repair — qualified QA

The repair candidate addresses the source, teaching and local-preview defects below. It is **review-only**, with `nativeImportReady: false`; it has not been installed or published. V13 remains an explicit media gap, and generated replacements do not constitute human approval.

Sources: [original consolidated audit](http://127.0.0.1:8770/audit-2026-10-24-original-guardrails/consolidated-audit-report.html), [local repair review](http://127.0.0.1:8771/repair-review.html), [versioned snapshot and reproduction](../product/content-plans/a1plus-unit1-audit-repair-2026-10-26/README.md), [change ledger](../product/content-plans/a1plus-unit1-audit-repair-2026-10-26/repair-content-ledger.json). The original audited source is preserved. The repaired normalized source SHA-256 is `fbba411138f55793f8891245cf979c35ec0bcaa433e25b1298432284bf2e97bb`.

## Content findings

“Repaired” below describes the authored candidate and automated/shared-behavior evidence. It does not certify every image, recording or native rendering.

| Audit | Qualified result |
| --- | --- |
| V1 — Spanish questions replace Listen direction | Repaired banks express comparable complete English meanings under shared instructions. None of the 90 ordinary text Listen banks has the original multiple-verbatim-heard alternatives. Approved reports, inferences, useful questions and proposals remain; semantic review is still required. |
| V2 — Spanish setup reveals the key | Answer-revealing setup was neutralized. Independent review found five additional examples, followed by 13 similar corrections. Mission `1.12-15` now uses neutral `m25` rather than visible socked feet; human media review remains pending. |
| V3 — Untaught “don't” | `1.7-R05` uses “I do not” with a taught third-person “doesn't” report; `1.12-07` uses “No, I do not.” |
| V4 — Guided task without a scaffold | `1.9-28` now practices the taught proposal “Let's meet at five.” with two fixed words and two blanks. “Why not?” remains retrieved in other stages and the mission. |
| V5 — Generic, empty or misleading feedback | Shared choice and construction teaching covers the revised candidate, including reports, missing information, frequency and temporal inference. Tests check 179 distractors and 772 incorrect word orders; feedback does not claim inferred words were literally heard. Source hint strings remain review expectations, not a runtime bypass. Human copy review remains pending. |
| V6 — Missing phrase-to-image recognition | `1.5-R06/R07` now pair complete written prompts with two independent record images. The local portrait sample shows the records stacked with legends visible; full native crop review remains pending. |
| V7 — No larger answer banks | Five ordinary text banks now have three meaningful alternatives. Every distractor is tested. Image banks retain two alternatives. |
| V8 — Unsupported mission | The approved shared conversation-decision contract represents 13 decisions followed by four consecutive written-answer gates. All 433 source cards project; no invented scene geometry is used for decisions. Complete native parity and integration remain pending. |
| V9 — Silent written recognition prompt | `1.7-R05` binds the exact first-person written prompt to its own recording, with the distinct third-person response retained after success. |
| V10 — Missing translations | All 117 relevant surfaces have complete authored card translations: 90 constructions and 27 written recognition prompts. No new Listen translation surface is introduced. |
| V11 — Blank canonical Listen prompt | The shared compiler emits “Listen and choose.” |
| V12 — Whole prompt replayed as the answer | The three duplicate responses were removed. Shared mission behavior also accepts a decision with no authored response and does not invent one. |
| V13 — Shower images show empty settings | **Open:** both Ana `08safe` and Sofia `r09` still fail to depict the action. The ledger records the unresolved replacement attempts. Teaching copy avoids claiming the picture proves showering. |
| V14 — School work shown as studying | A replacement school-work candidate `t28` is bound. Human semantic and crop approval remains pending. |

The 11 ordinary lesson counts and ordered IDs remain unchanged: 33, 33, 33, 39, 35, 40, 36, 46, 35, 23 and 63. The mission changes from 21 cards to 17; the ledger accounts for each absorbed beat. The resulting source has 12 lessons, 433 cards and 83 external images. No timed `frames` remain.

## Local preview fidelity

These results concern the local review player. [Saved checks](../product/content-plans/a1plus-unit1-audit-repair-2026-10-26/evidence/local-preview-checks.json) include sampled Chrome sessions at 390×844 and 844×390, with no console errors or horizontal overflow in the sampled landscape flow. The recording control remains explicitly ungraded; microphone permissions and speech grading were not tested.

| Audit | Candidate behavior and evidence |
| --- | --- |
| P1 — Generic construction retry | Uses the shared construction correctness and hint resolver; a sampled incorrect order shows a contextual explanation and Retry. |
| P2 — Side-by-side image alternatives | Two image alternatives are stacked full-width; record diagrams were sampled in portrait. |
| P3 — Fixed answer position | Alternatives shuffle once per visit and remain stable across retries. Identical order on consecutive two-option visits is a valid random result. |
| P4 — Translation timer resets on replay | Learn uses the visit's original translation deadline. Replay after the deadline keeps Spanish hidden in the sampled card. |
| P5 — Missing vocabulary emphasis | Exact lesson vocabulary labels/chunks feed the shared highlighting function; a sampled new phrase is yellow. |
| P6 — Missing encouragement | Feedback includes the encouragement line above the specific teaching message. |
| P7 — Missing error indication | Incorrect feedback includes the red X and accessible incorrect label; sampled Listen and construction feedback were checked. |
| P8 — Private instructions conceal app behavior | The preview uses shared app-derived instructions. The authored instructions remain preserved for review, rather than being added as mandatory runtime fields. |

Mission samples also checked prompt locking, success without a response, two ordered response clips before completion, explicit Continue, and four terminal voice gates with distinct question/response images. These samples do not prove full native parity or complete crop coverage.

## Verification and remaining boundaries

The [validation evidence](../product/content-plans/a1plus-unit1-audit-repair-2026-10-26/evidence/validation-summary.json) records the final compiler/verifier authority hashes and byte-repeatability result. Exact content preservation is checked independently of schema validity. The [scoped independent review](../product/content-plans/a1plus-unit1-audit-repair-2026-10-26/evidence/independent-content-review.json) includes selected whole-image inspections and the ambiguity repairs; it is not a complete image-review certificate.

- The earlier full backend suite passed 715 tests. The final focused rerun passed 27 tests: 16 compiler/verifier tests and 11 conversation-decision schema, tutor and mission-identity tests. These include malformed ordinary source, forged projection fidelity, duplicate/blank alternatives, exact response pairing and preservation of existing scene-mission IDs. The earlier full run is not a final-tree full-suite claim.
- The final-source choice/construction suites passed 13 tests: 174 choice cards, all 179 distractors, 90 constructions and 772 incorrect word orders. The existing 2,369 A1 ordinary wrong-choice outputs remain unchanged. The earlier broad hint suite covered 9,744 attempts across 85 lessons.
- Frontend checks passed 23 tests, and the installed release-integrity check retained 85 lessons across seven units. These confirm existing-catalog integrity; they do not install the A1+ candidate.
- Final mission/tutor regressions passed 26 tests, including correct handling of image-only choices; the compiler/verifier suite passed 16. The mobile verification chain passed its content, TypeScript and interaction checks across the preflight and focused reruns of three updated test expectations. The remaining interaction suites and test-registration guard passed. A separate production Android export passed with 113 assets including the launch bundle. Required CI reruns the complete preflight on the submitted commit.
- Authored normal audio has no missing bindings. All 124 prepared occurrences bind to 100 exact prepared takes. Automated transcription found no material lexical issues in the 20 new normal takes; the prepared-file audit retains five Luis/Louise name reviews. Its 108 selected files include its own retained audit scope and are not the same measure as the 100 current bound takes. Human listening and prosody approval remain pending.
- The canonical inventory separately lacks one player-required Spanish mission-intro recording. Its 32 other missing bindings are unused backend-derived Recognize/Listen fallback answers, not missing authored dialogue.
- Installation remains blocked on shared clock representation, exact prepared-delivery provenance, PNG/SVG offline bundling, per-turn translation treatment, the next reply after construction `1.1-U08`, and full runtime review. Authored hint/instruction strings do not require inventing new application fields; review the shared output against their intended teaching meaning.

Human review must still resolve both shower settings, assess all changed media in their real display crops, listen to exact audio bytes and approve teaching semantics. Publication is a separate protected-main workflow after the integration and review gates; this snapshot grants no release approval.
