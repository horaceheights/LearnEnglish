# Lesson 1.8 separate question and answer practice

Implemented 2026-09-03 following approval of unrelated visitors asking about the established family, with permission to add slides.

All five stages contain the same ten-slide progression: father question/answer, mother question/answer, parents question/answer, children question/answer, grandparents question/answer. Question and identity answer never share a practice slide. Recognize question-form selection does not reveal an identity answer; Listen question banks contrast the pointed-at referent's gender/number. Use ends with `They ___ the ___.` for `They are the grandparents.`

The nine 1536x1024 source assets are `Lessons/Lesson1/images/a1_who_question_*.webp` and `a1_who_answer_*.webp`, mirrored byte-for-byte to frontend and mobile and bundled with literal Metro requires. The source prompts, visitor/family continuity, and referent contracts are in `docs/product/lesson-1-8-question-scenes.json`. Generated through built-in image_gen and inspected as 3:2 scenes. The pairs use entrance, kitchen, patio, garden and living-room settings with varied gestures and framing; every answer preserves its question setting. Semantic decisions remain pending for final runtime review; this does not claim human approval of newly encoded assets or Production approval.

## Verification

- Lesson structure: 59 tests pass, including five-pair order across every stage, question/answer media separation, consistent question voice, and nonambiguous Listen labels.
- Course media/card validation: passes under Preview policy with the existing pending semantic-review and renderer-signature advisories.
- Audio cast validation: passes; the new male visitor uses the established Liam profile. Answer portraits remain third-person narration.
- Versioned release integrity: passes, preserving 70 lessons and seven units of ten.
- Persistent audio: all 4,923 canonical assets are available with matching catalog contracts. No gate was weakened or skipped to publish.
- Android export is enforced by the protected Preview CI gate; live device playback remains a human Preview check.

## Audio completion and release

The existing Render backend is the configured ElevenLabs source; a missing local key is not evidence that audio generation is unavailable. Its health endpoint verified the pinned model, cast, and speeds. The existing operator renderer captured 13 missing takes through `--legacy-backend-base-url https://learnenglish-fxki.onrender.com`, with a 200-character ceiling (178-character upper bound), and reused four approved takes. Exact bytes, provenance and all new bindings were persisted. No learner runtime fallback or provider change was introduced.

The final candidate must export its immutable audio catalog from its exact committed lesson payload, pass all backend and Preview gates, incorporate current canonical and Preview ancestry, and publish only through the protected GitHub Actions workflow. Device testing remains the final human review step after Preview publication.
