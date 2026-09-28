# Lesson 7.1 body-part photo replacement

The user rejected the displaced eye/ear overlays and inconsistent sandal scene, approved the GPT eyes/ears/feet samples generated directly in chat, then requested replacement of all images in this lesson. On 2026-09-28 they explicitly confirmed preserving the current 81-lesson catalog and publishing through protected Preview.

## Installed scope

- Eight body-word photos, a separate full-body lesson thumbnail, and three wider versions for four-image choices (arms, hands and feet).
- All 59 image fields across the existing 42 cards are replaced. Head, eyes, ears and mouth use natural pointing; the limb/hand/foot pictures use focused views. No orange overlays or padded inset scenes remain in Lesson 7.1.
- The 3:2 masters remain on ordinary cards. Four-picture cards R7, A5, A7 and A8 bind the wider hand/arm/foot images through ordinary content fields, keeping both sides of the anatomy inside the existing centered 4:5 mobile crop.
- No language, card order, stage, answer ID, voice or interaction changes. All 75 changed immutable audio IDs reuse their exact predecessor take. No audio was generated and no image API was called.
- Original files and every other lesson's binding are preserved. The source brief and exact engine plan are saved alongside the media records.

## Visual and answer review

Codex inspected the full sources and the assigned 3:2 and 4:5 crops. Head gestures indicate the crown; eye gestures terminate below the eyes without hiding them; ear gestures indicate the earlobes; the mouth finger sits under the lower lip. The two hands show ten fingers; the legs show knees and calves as well as feet; the feet-only picture excludes the competing footwear action. The wider variants retain both complete targets in the portrait choices. The full-body thumbnail is separate from all teaching images.

Every changed Recognize/Listen bank retains its previous meanings and order: R1 head/eyes, R3 eyes/ears, R5 arms/legs, R7 hands/feet/legs/arms, R9 head/mouth, A1 eyes/ears, A2 ears/mouth, A4 hands/arms, A5 feet/arms/legs/hands, and A7/A8 hands/eyes/ears/arms. Text-choice cards retain their reviewed alternatives while the prompt photo changes. The exact contracts bind the canonical runtime URLs rather than the unnormalized authoring filenames.

This is agent visual inspection, not human approval of the installed runtime contexts. Source approval for eyes, ears and feet is recorded separately. Human semantic and crop approval remain pending for Preview testing; Production has not been requested.

## Reproduction and evidence

- `docs/product/lesson-7-1-body-photos-v1.json` records generation provenance, prompts (earlier sample prompts explicitly summarized), source/runtime hashes, exact image fields and unchanged audio takes. The built-in generator did not expose a model ID, API request ID, token usage or itemized price; those fields remain unknown.
- `docs/product/content-plans/7.1-body-photos-v1.plan.json` composes the exact installed lesson through the shared engine. The lesson's source brief preserves its ordinary images; the exact plan additionally records wider four-picture versions.
- `docs/qa/course-photo-reuse-v1.json` and `docs/product/course-media-change-plans.json` bind the exceptions to inspected original/replacement bytes and exact lesson fields.
- `backend/tests/test_body_part_photos.py` protects the reviewed images and scopes, unchanged language, safe four-choice bindings, three identical runtime copies, exact engine reconstruction and original audio takes.

## Verification commands

Run the backend suite, `npm run verify:preview` from `mobile`, `scripts/audit_course_media_preservation.py`, `scripts/audit_a1_unit_parity.py --check`, `scripts/audit_content_practice.py --check`, and `scripts/content_engine_plans.py --check`. The release manifest retains 81 lessons and the existing per-unit counts. Protected CI and the exact-main Preview workflow remain required; real Android/iOS playback and final human framing review occur in Preview.
