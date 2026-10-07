# Reconoce image/text correction

The user confirmed Unit 1's two visual interactions as the standard for every standard lesson: visible English above image choices, or a photo above written English choices. An audit of all 813 Recognize cards found 18 audio-input cards across five lessons. This correction preserves all 81 lessons, stable card IDs and all Learn, Listen, Speak, Use and mission cards.

| Lesson | Corrected cards | Visual evidence |
| --- | --- | --- |
| 3.3 Am, Is, and Are | R1, R3, R5, R7 | Complete written question/answer exchanges select two different actions; the following image-to-text cards remain intact. |
| 4.8 Do you...? | R1–R6, R9–R10 | Written exchanges select explicit thumbs-up/down replies; reverse cards show the question and gesture with written short replies. |
| 4.10 What Time Is It? | R1 | The already approved woman pointing at the man's watch selects the time question. Her female voice plays the question after selection. |
| 4.11 Unit 4 review | R7–R10 | Fresh, explicit yes/no reply gestures and marked Monday-first numeric calendar columns replace listening-only evidence. |
| 5.3 Drinks | R9 | Water is visibly distinguishable from juice and milk; all options retain the same person, action and morning context. |

Question audio remains pronunciation support. Image-to-text cards never pronounce the answer before selection. The previous audio-only exception for 3.3 is superseded by this explicit user decision; discrimination by listening remains in Listen. Shared authoring rejects new audio-only Recognize cards and a whole-course validator checks every visual pairing and preselection answer leakage, including ordered audio turns.

The exact existing [content plans](../product/content-plans/) are updated to reproduce the installed lessons. Older approval fields retain the historical authoring record; this document records the current correction. [18 answer-bank reviews](recognize-answer-bank-review-v1.json) pin the revised contrasts without globally accepting other banks. Existing cast pins change only where these cards separate question and response; picture-by-picture voice records preserve who actually speaks.

The user selected OpenAI image generation and ElevenLabs audio. Five images were generated with the built-in image tool, using original photographs as references where applicable. [Image provenance and complete prompts](../product/recognize-visual-images-v1.json) identify the source PNGs, normalized WebPs and exact hashes. Original images and unaffected bindings remain preserved. Audio uses 139 exact approved takes across the five lessons, with zero new provider requests or billed characters; new immutable card bindings reuse these takes.

Verification evidence is recorded below as checks complete. Human semantic approval and installed-phone testing remain pending; automated layout checks do not claim to replace either. Preview is the authorized release destination.

- Whole-course image/text contract: passed for all standard lessons; six focused backend regressions pass.
- Native production-header tests: eight real written exchanges fit narrow portrait, enlarged text and landscape, before selection, during retry and after correct selection. Existing silent-written and answer-replay tests also pass.
- Original-media preservation: 981 protected assets, 878 existing scoped exceptions, zero errors; no old image bytes replaced.
- Practice coverage: no new findings (91 existing advisory findings).
- Course media upload: five new images uploaded, 2,809 existing objects preserved.
- Web regression suite: 23 tests passed. A temporary local QA route loaded real canonical lesson data from the API into the production `LessonPlayer`, using its existing test mode to avoid saving learner progress. Browser checks inspected 3.3 R1, 4.8 R4, 4.11 R9 and 5.3 R9, verified loaded CDN photographs, and exercised wrong/correct selections for both directions. The temporary route was removed afterward.
- Web layout limitation, outside this content correction: the shared web player still scrolls for the three long drink responses at 390 × 844 and for ordinary picture/text cards at 740 × 360. No web layout or native renderer implementation changed. Native viewport tests and installed-phone review are tracked separately; browser inspection is not an Expo device check.
- Complete backend suite: 569 tests passed. Whole-course retry teaching checks cover 8,764 wrong attempts; image-choice semantic IDs retain the action or reply contrast without displaying captions.
- Unit-parity audit: ready across all seven units. All five exact authoring plans reproduce their installed canonical lessons, and comparison with the task base confirms every card outside Recognize is unchanged.
- Cloudflare verification: all 6,388 active audio contracts and 2,814 media objects passed checksum/probe/receipt checks, with zero missing or invalid assets. The inventory preserves all 64,289 historical object descriptors and adds only 60 immutable objects (30 recording bindings plus receipts). No new recordings were synthesized. The audio catalog is pinned to content commit `9c97af0c32ef2e82f572d9840356b0431c887a52`; the subsequent semantic-option-ID correction leaves all audio contracts identical.
- Complete local Preview preflight passed: TypeScript, all named mobile interaction suites, whole-course native Yoga portrait/landscape layouts (including feedback and enlarged text), media/cast/audio checks and Android production bundle export. The generated catalog fingerprint is `90f5cd83fd8c99ecdfc6dfd001751ee3f816d80b` and preserves 81 lessons in seven units. Protected GitHub CI and main-only publication provide the release verification.
