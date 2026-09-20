# Action video continuity refresh

The audit covered all 22 mapped action scenes and traced their uses in the 70 canonical lessons. Thirteen mapped keys are referenced; four active pairs needed replacement. One additional mismatched, currently unused pair was also refreshed.

| Pair | Current lesson uses | Change |
| --- | --- | --- |
| Boy and girl running | 1.3, 1.7 | New clip and first-frame two-choice poster |
| Girl sleeping | 1.3 | New clip and first-frame two-choice poster |
| Father working | 1.6 | New clip preserving the indoor workshop |
| Girl writing | 1.7 | New clip and first-frame two-choice poster |
| Children studying | Not currently referenced | New clip; existing mapping retained |

All five clips were generated from the existing fictional-character photos using the recorded Gemini/Veo image-to-video plan. Source photos remain byte-for-byte unchanged. The nine other referenced pairs already matched locally. The Lesson 1.7 grandparents/pair-running comparison remains still-only.

## Media evidence

The exact prompts, source hashes, model, duration and cost ceiling are in `../product/action-video-refresh-2026-09-17.json`. Five completed operation receipts are retained in `action-video-refresh-receipts/`; a separate network-failure receipt records the initial request that did not reach the provider. No submitted operation was retried or regenerated during the September 20 continuation. Estimated generation cost: USD 2.00 total, based on five four-second requests at USD 0.10/second; this is not a billing invoice.

Raw outputs remain under `Lessons/Lesson1/video-sources/`. Reviewed exports are silent, three-second H.264 clips at 768 by 512. Contact sheets in `action-video-refresh-frames/` show each unchanged source alongside eight decoded frames spanning the exported clip. The sleeping clip keeps the eyes closed and includes a small hand/blanket adjustment as well as breathing. Agent inspection is engineering evidence, not human semantic approval.

Live web review also exposed 29 stale objects on the media server: twelve source photos, nine previously matching clips and eight posters differed from their reviewed repository bytes. The exact 39 files belonging to the fourteen reviewed pairs were synchronized (29 updated, ten already current), preserving all unrelated upload-manifest entries. Client cache versions were advanced. The continuity audit now checks the published SHA-256 receipts as well as canonical, web and bundled native copies.

## Verification

- All 353 backend tests passed after integration with September 20 main; the expanded continuity/runtime subset then passed all 21 tests, including two new published-receipt regression cases.
- Full Preview verification passed: course and semantic contracts, immutable audio, TypeScript, native interaction/layout checks and Android production export.
- All 18 frontend tests passed; the production build compiled successfully.
- An isolated browser harness rendered the real LessonPlayer with canonical running, sleeping, working and writing cards. Clicking each correct answer selected the new CDN video and decoded moving 768 by 512 frames without video errors. The unused studying clip also played on the existing scene-review page.
- Human semantic decisions remain pending. Installed Android review must be performed on the exact published Preview; browser and export checks do not substitute for that review.

Final CI and Preview publication are recorded by the linked pull request and protected GitHub Actions runs.
