# Unit 4 Reconoce question-content repair — 2026-10-07

## Scope and source of truth

The user asked to undo the incorrect content simplification while retaining Lesson 1.1's existing text-to-image and image-to-text mechanics. The original targets come from canonical commit `1d6a51df`. Current Learn, Listen, Speak and Use cards are preserved exactly; no player or layout change is part of this repair.

The active authoring plans are `4.8-approved-unit4-v1.plan.json` and `4.11-time-retrieval-v1.plan.json`. The older 4.11 approved-unit4 plan remains historical; it must not overwrite the subsequent approved time content.

## Exact learning coverage

| Lesson/card | Written question target | Following original reply | Scene evidence |
|---|---|---|---|
| 4.8 R1 → R2 | Do you work? | Yes, I do. | Ana in apron at a large shop register, Luis asks; Ana thumbs up. |
| 4.8 R3 → R4 | Do you study? | No, I do not. | Luis indicates an open textbook at a library study table; Ana thumbs down without studying. |
| 4.8 R5 → R6 | Do you play in the park? | Yes, I do. | Visible park, Ana holds ball; Luis asks and Ana thumbs up. |
| 4.8 R9 → R10 | Do you study in the park? | No, I do not. | Visible park picnic table, Luis holds open textbook and notebook; Ana thumbs down without studying. |
| 4.11 R7Q → R7 | Do you clean the table? | Yes, I do. | Woman indicates table, man wipes it with cloth and thumbs up. |
| 4.11 R8Q → R8 | Do you wash your clothes? | No, I do not. | Man indicates washer and clothing basket; woman thumbs down without handling laundry. |
| 4.11 R9Q → R9/R10 | What day is it today? | Today is Monday. / Today is Thursday. | Full dated weekly calendar contrasted with a clock; existing marked Monday and Thursday reply photos. |

All four 4.8 question cards use two caption-free photo choices. R9's former third work-in-park distractor is removed; its original study-in-park correct target is unchanged. The original R9 pedagogical note incorrectly mentioned running even though its audio, answer ID and correct label all said study; this repair preserves the actual study target.

4.8 remains 42 cards and advances content revision 4 → 5. 4.11 preserves its existing 54 cards and adds three separate question cards (57 total, revision 7 → 8). New IDs R7Q, R8Q and R9Q immediately precede the corresponding original response card. No question and answer are combined in one prompt.

## Media and inspection

Six new photos were produced through six OpenAI built-in image-generation calls, with no retries or external image API calls. No audio was generated. Exact prompts, source/output paths, hashes and inspection evidence are recorded in [the provenance manifest](../product/recognize-unit4-question-repair-v2.json).

Sources are preserved under `Lessons/Lesson1/images/course-photoreal-sources/recognize-question-repair-v2/`. Runtime images use the distinct `a1_recognize_u4_*_v2.webp` names; originals remain untouched. The shared asset directory's historical “Lesson1” name does not mean these photos are Lesson 1.1 teaching content.

Each new full-size 1536×1024 image was visually inspected for topic, asker/respondent roles, explicit reply gesture, character continuity and anatomy. The exact same photograph supports each adjacent question/reply pair, preserving location and people while the task changes. The new work/study/park scenes have no added instruction text, speech bubbles or answer labels.

The negative scenes explicitly depict a negative reply; absence of an activity is never taken as evidence for “No.” The book and clothes belong to the indicated topic, not an assertion that the negative respondent is performing it. Minor texture on books and store products does not supply an English answer.

Existing unmarked calendar, Monday/Thursday marked calendars and review clock were also inspected. The weekday question selects calendar versus clock; its unmarked image does not claim to prove a particular weekday. The marked reply images visibly loop dates 5 and 8 in a seven-column June 2023 week.

## Verification and remaining review

Passed locally:
- Both canonical lessons validate through the shared Lesson schema.
- Both lessons satisfy the shared Recognize image/text contract.
- Both active plans compose exactly back to canonical content.
- Every Learn, Listen, Speak and Use card is identical to current origin/main.

Global media registration, audio binding/export, catalog contracts, full application checks and actual native-card rendering belong to task integration. Human semantic approval remains pending. Full-size agent inspection does not establish approval of the rendered phone cards or publication.
