# Lesson 1.8 separate question and answer practice

Implemented 2026-09-03 following approval of unrelated visitors asking about the established family, with permission to add slides.

All five stages contain the same ten-slide progression: father question/answer, mother question/answer, parents question/answer, children question/answer, grandparents question/answer. Question and identity answer never share a practice slide. Recognize question-form selection does not reveal an identity answer; Listen question banks contrast the pointed-at referent's gender/number. Use ends with `They ___ the ___.` for `They are the grandparents.`

The nine 1536x1024 source assets are `Lessons/Lesson1/images/a1_who_question_*.webp` and `a1_who_answer_*.webp`, mirrored byte-for-byte to frontend and mobile and bundled with literal Metro requires. The source prompts, visitor/family continuity, and referent contracts are in `docs/product/lesson-1-8-question-scenes.json`. Generated through built-in image_gen and inspected as 3:2 scenes. The pairs use entrance, kitchen, patio, garden and living-room settings with varied gestures and framing; every answer preserves its question setting. Semantic decisions remain pending for final runtime review; this does not claim human approval of newly encoded assets or Production approval.

## Verification

- Lesson structure: 59 tests pass, including five-pair order across every stage, question/answer media separation, consistent question voice, and nonambiguous Listen labels.
- Course media/card validation: passes under Preview policy with the existing pending semantic-review and renderer-signature advisories.
- Audio cast validation: passes; the new male visitor uses the established Liam profile. Answer portraits remain third-person narration.
- Versioned release integrity: passes, preserving 70 lessons and seven units of ten.
- Full backend suite: audio availability remains blocked until the new takes are rendered. No gate was weakened or skipped to publish.
- Android export and live web/device playback remain to be verified after audio completion.

## Remaining release work

No local ElevenLabs credential is configured. The bounded renderer plan for `lesson-8-who` selects 95 assets, groups them into 17 takes, reuses four existing reviewed takes, and needs 16 provider requests for 13 missing takes (178 estimated characters). Existing reusable bindings were saved without paid generation.

After `ELEVENLABS_API_KEY` is configured locally, rerun the dry-run plan, then use `scripts/render_course_audio_assets.py --lesson-id lesson-8-who --execute --promote --max-character-cost 200`. Retain the renderer's receipts and staging behavior; do not bypass the voice contract or use runtime generation. Commit the reviewed audio and export `scripts/export_persistent_audio_catalog.py --source-ref <exact-candidate-commit>`. The catalog intentionally remains at its prior version while audio is incomplete, so persistent-audio validation fails closed.

Rerun full backend tests, persistent-audio validation and mobile Preview preflight. Then follow the protected Preview PR, canonical reconciliation, backend readiness and GitHub Actions publication workflow from `mobile/RELEASE.md`. Do not merge or publish this incomplete audio candidate.
