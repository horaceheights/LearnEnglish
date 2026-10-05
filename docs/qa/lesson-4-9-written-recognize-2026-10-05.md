# Lesson 4.9 written recognition

The approved correction keeps the stable lesson ID `lesson-4-8-days-and-time` and replaces only Reconoce R1–R10. The complete written question opens the section and remains visible during selection, retry and feedback. Monday, Tuesday and Wednesday each receive sentence and image matching; Thursday through Sunday continue in order with three sentence alternatives. Prompt speech is explicitly silent. Correct answers display and play their authored `Today is ...` response using existing approved recordings.

Seven matching calendar photographs show the complete Monday-first month `05 / 2023`, dates 1–31, and one blue loop around the appropriate first-week box. The new sources, generation prompts, encoded bytes and date mapping are pinned in `docs/product/weekday-calendar-board-v1.json`. No weekday names or answers appear inside the photographs. The separate Spanish reference box and the extra idle instruction under the answer bank were rejected and removed from the review HTML.

Shared web/native presentation distinguishes an intentionally silent written Recognize card from an absent audio contract. Its English remains readable and translatable, its choices unlock without waiting for nonexistent speech, and answer replay becomes available only after a correct choice. Other authored card modes retain their established behavior.

## Evidence

- Structure and weekday suites: 73 passing tests, including exact plan recomposition, non-Reconoce preservation, identical three-client image copies and a connected blue-loop check against the actual generated pixels.
- Native header and card checks exercise the production TSX with Yoga in portrait and landscape, initial/retry/correct states, translation and enlarged text. Mobile TypeScript, focused silent-recognition and all 12,648 help combinations pass.
- Frontend tests and optimized production build pass.
- Refreshed review HTML: all ten ordered cards, no reference box or idle instruction, persistent question through wrong/correct choices, completion and widths 360/390/680/800/1360 pass in headless Chrome. This HTML is a review artifact, not evidence of an installed native app.
- Scoped audio, cast, answer-bank, media-preservation and release-integrity checks pass. Ten new post-correct bindings reuse existing recordings; no speech-generation requests were made. The course retains 81 lessons.

Full backend, complete Preview preflight, committed-source catalog checks and Cloudflare inventories must pass before integration/publication. Human semantic and device review remain pending; no automatic result is recorded as human approval. Renderer-only signature warnings are allowed in Preview and continue to block Production.

## Other-section audit

Learn already opens with the question and follows Monday–Sunday. Escucha currently uses word targets Monday/Thursday/Friday/Saturday/Sunday, then exchanges Tuesday/Wednesday/Thursday/Sunday. Habla puts its question after Monday–Sunday. Usa puts its question after Monday–Saturday and has no Sunday construction. These are authored order/coverage issues, not runtime card shuffling. They are preserved by the current Reconoce-only scope and were reported to the user for a scope decision.

Usa also has a general guided-to-full and fewest-to-most-word construction rule. Any question-first construction proposal must resolve that rule explicitly rather than silently replacing it. Written target words remain available in the bank before construction; a continuously visible complete answer would change the construction task and is not inferred from a request to keep ordinary prompts visible.
