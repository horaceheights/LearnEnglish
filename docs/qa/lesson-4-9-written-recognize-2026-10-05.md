# Lesson 4.9 ordered practice and written recognition

The approved correction keeps the stable lesson ID `lesson-4-8-days-and-time`. Reconoce R1–R10 opens with the complete written question and retains it during selection, retry and feedback. Monday, Tuesday and Wednesday each receive sentence and image matching; Thursday through Sunday continue in order with three sentence alternatives. Prompt speech is explicitly silent. Correct answers display and play their authored `Today is ...` response using existing approved recordings. The user subsequently approved aligning Escucha, Habla and Usa to the same question-to-weekday progression.

Seven matching calendar photographs show the complete Monday-first month `05 / 2023`, dates 1–31, and one blue loop around the appropriate first-week box. The new sources, generation prompts, encoded bytes and date mapping are pinned in `docs/product/weekday-calendar-board-v1.json`. No weekday names or answers appear inside the photographs. The separate Spanish reference box and the extra idle instruction under the answer bank were rejected and removed from the review HTML.

Shared web/native presentation distinguishes an intentionally silent written Recognize card from an absent audio contract. Its English remains readable and translatable, its choices unlock without waiting for nonexistent speech, and answer replay becomes available only after a correct choice. Other authored card modes retain their established behavior.

## Evidence

- Structure, weekday, practice and authoring suites: 100 passing tests, including exact plan recomposition, preserved Learn/Reconoce content, all-section question-to-weekday order and Sunday coverage, identical three-client image copies and a connected blue-loop check against the actual generated pixels. Practice and A1 parity checks pass; the practice ratchet reports 91 existing findings with none introduced by this correction.
- Native header and card checks exercise the production TSX with Yoga in portrait and landscape, initial/retry/correct states, translation and enlarged text. Mobile TypeScript, focused silent-recognition and all 12,648 help combinations pass.
- Frontend tests and optimized production build pass.
- Refreshed review HTML: all ten ordered cards, no reference box or idle instruction, persistent question through wrong/correct choices, completion and widths 360/390/680/800/1360 pass in headless Chrome. This HTML is a review artifact, not evidence of an installed native app.
- Scoped audio, cast, answer-bank, media-preservation and release-integrity checks pass. Ten new post-correct Reconoce bindings and 22 additional bindings for the reordered stages reuse existing recordings; no speech-generation requests were made. The course retains 81 lessons.

Full backend, complete Preview preflight, committed-source catalog checks and Cloudflare inventories must pass before integration/publication. Human semantic and device review remain pending; no automatic result is recorded as human approval. Renderer-only signature warnings are allowed in Preview and continue to block Production.

## Aligned section progression

The original audit found Escucha jumping between weekdays, Habla putting the question last, and Usa putting it last while omitting Sunday. The user explicitly approved correcting all three. The allocation remains 42 cards: 8 Learn / 10 Recognize / 8 Listen / 8 Speak / 8 Use. Learn and the approved Reconoce sequence remain unchanged.

- Learn: written question, then Monday–Sunday.
- Recognize: written question with Monday matching in both directions, then Tuesday and Wednesday in both directions, then Thursday–Sunday sentence matching.
- Listen: heard question distinguished from the already taught name question; Monday–Wednesday word-to-picture recognition; Thursday–Sunday complete question/answer exchanges with comparable sentence alternatives. Prompt English is hidden while listening is tested, and all eight Listen cards omit a target-revealing picture above the choices; image alternatives remain on the three word-to-picture cards.
- Speak: question first, then the seven `Today is ...` answers, with written pronunciation models visible.
- Use: guided question `What day ___ ___ today?`, guided Monday–Wednesday answers, then full Thursday–Sunday constructions. The question-first decision explicitly overrides increasing target length at the opening question-to-answer transition, while retaining four guided and four full constructions. Full target audio and available written words use the established construction behavior.

Existing approved media outside Reconoce is reused. No unit- or lesson-specific playback branch is introduced. The engine-wide authoring rollout remains deferred until this lesson is reviewed in Preview.
