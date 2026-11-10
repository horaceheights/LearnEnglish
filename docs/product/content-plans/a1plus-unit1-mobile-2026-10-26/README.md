# A1+ Unit 1 installed sources

`unit-preview-content.json` is the delivery source compiled into the A1+ Unit 1 installed on 2026-10-26. The image and answer-choice review records still bind its exact content hash.

Rebuilt lessons no longer come from it. Each one is authored with the A1 content engine from a brief in [`docs/product/content-briefs/a1plus-unit-1/`](../../content-briefs/a1plus-unit-1/), under the A1+ lesson standards approved on 2026-10-27:

- 1.1 What People Look Like: rebuilt 2026-11-10 from `1.1-what-people-look-like.json`, the first lesson built under the user's 2026-11-09 rule that every A1+ lesson follows up the A1 lesson with the same number (A1 1.1 Meet the People). It replaces the 2026-10-27 workday lesson (`1.1-a-day-with-real-commitments.json`), which returns with A1+ 4.10. Its seven new photos come from `docs/product/a1plus-unit-1-lesson-1-1-people-photos-v1.json` to `-v3.json`.
- 1.2 Two Mornings: rebuilt 2026-10-29 from `1.2-two-mornings.json`, the first lesson of the Unit 1 order approved on 2026-10-28 (he/she -s on A1 routine verbs). Its six new photos come from `docs/product/a1plus-unit-1-lesson-1-2-photos-v2.json` to `-v4.json`.
- 1.4 Where My Family Lives: rebuilt 2026-11-04 from `1.4-where-my-family-lives.json`. The user replaced the get-ready routines lesson on 2026-10-31 with a follow-up of A1 1.4-1.6 family and 3.7-3.8 countries (aunt, uncle, cousin, lives in, with). Its five new photos come from `docs/product/a1plus-unit-1-lesson-1-4-photos-v1.json`.

Do not recompile a rebuilt lesson from `unit-preview-content.json`; that would restore the version that predates the standards. `answer-choice-contracts.json` and `cast-contract.json` cover every installed lesson, rebuilt ones included.
