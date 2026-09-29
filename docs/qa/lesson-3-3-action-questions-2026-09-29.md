# Lesson 3.3: complete current-action exchanges

The user approved eight Learn slides: separate question and answer cards for you, she, he and they, in that order. Every following stage must alternate those four question forms and their responses, with varied actions already learned in Unit 1. The isolated Doing card is removed. This correction preserves the complete 81-lesson catalog.

## Authored sequence

Each cell below is one question card immediately followed by one answer card. The question order is always `What are you doing?`, `What is she doing?`, `What is he doing?`, `What are they doing?`.

| Stage | You / I am | She is | He is | They are |
| --- | --- | --- | --- | --- |
| Learn | writing | reading | eating | playing |
| Recognize | reading | cooking | sleeping | running |
| Listen | cooking | drinking | working | talking |
| Speak | cooking | sleeping | swimming | studying |
| Use | cooking | running | drinking | sitting |

The lesson has 40 cards, eight per stage, and practices all thirteen familiar actions. Each complete question appears on the successful path in all five stages. Doing remains a lexical target used inside those questions; earlier words provide meaning without becoming new vocabulary. Existing later course uses of doing and the direct-address exchange remain intact.

The source brief uses shared `stage_sequences`; the exact composed plan is `docs/product/content-plans/3.3-action-questions-v1.plan.json`. Generic `learn_context_pairs` bind the eight Learn cards to their exact questions, answers and new target. The audit rejects reordered/stale pairs and answers with untaught words. No lesson-specific runtime branch or builder is added.

## Answer-bank review

Question cards in Recognize and Listen play the English question with its text hidden, then offer two or three complete written questions. Hearing the pronoun and auxiliary determines one answer; pictures are not used to claim that an action uniquely means a generic question. Recognize answer cards show the matching scene and ask the corresponding question, with action alternatives sharing the established subject. Listen answer cards vary audio-to-picture and audio-to-text decisions.

Reviewed response contrasts: R2 reading/writing; R4 cooking/reading; R6 sleeping/eating/working; R8 running/playing/talking; A2 cooking/reading; A4 drinking/cooking; A6 working/sleeping/swimming; A8 talking/running/studying. All image alternatives were inspected; the named action is visible and the distractor action is absent. Exact bank fingerprints and narrow subject-variety justifications are recorded in the ordinary contract registry. Use contains only required tiles, with four guided cards followed by four complete constructions, retaining question/answer pairs instead of sorting them by sentence length.

## Media and audio

Existing reviewed teaching photographs are reused, with original bytes preserved. Ana and Luis keep their existing reading/writing conversation views. Two new built-in ChatGPT images show Ana asking Luis directly while he cooks, followed by Luis answering with a hand on his chest in the same kitchen. Both are complete 1536x1024 scenes; no crops or generated overlays were added. Third-person lines are narration about the visible person/group, not speech attributed to that person. Ana's direct questions and Luis's first-person replies retain their configured character voices.

Generation inputs, source/runtime hashes and observations are recorded in `docs/product/lesson-3-3-action-media-v1.json`. Built-in image generation did not expose a model ID, provider request ID, token usage or itemized price; these remain unknown. ElevenLabs rendered 20 new logical takes, reused six and reported 145 character credits against a 400-character ceiling. Exact bytes and provider receipts remain in the approved audio registry; later image-bound IDs reuse those takes without regeneration.

This is agent inspection, not human semantic approval. New/changed runtime contracts remain pending for Preview review. Actual Android/iOS playback and final human framing review must be performed on the published Preview; Production was not requested.

The first/middle/final frames of the previously unused boy-drinking, boy-sleeping and girl-drinking v2 clips were inspected. Cast/action continuity matched, but all three contained blurred side panels. Their unused web/native video mappings were removed so the clear original photographs render instead. The files remain preserved; a regression check prevents these rejected mappings from returning.

## Verification

Focused tests cover exact alternation, all four question forms, action diversity, hidden question text, explicit sequence errors, contextual introduction boundaries, shared engine reconstruction, image evidence, and configurable course sizes. Whole-course practice and Preview content validation must pass, followed by the complete backend suite and `npm run verify:preview`. Unrelated course payloads must remain identical to the task base. Protected CI and exact-main Preview publication remain required.

Browser inspection traversed all eight Learn cards and the first Recognize question/answer pair, including a 390x844 viewport. The question-choice header hides the target sentence, choices remain visible, the following answer uses its matching scene, and the browser error list was empty. Local immutable audio requests returned 200 after seeding the already-approved bytes without provider calls. Real-device microphone scoring remains a Preview review step.

The concurrent location correction from main `8318ba21` was reviewed and merged. Comparing the complete generated course against that refreshed base shows only Lesson 3.3 differs; all other 80 lessons, including the new In/On recordings and explicit location nouns, remain intact. Audio registries were merged by exact asset/take keys without conflicting values, and the combined catalog was re-exported from the merged content commit. New media storage downloads were verified against the two authored cooking-image hashes.
