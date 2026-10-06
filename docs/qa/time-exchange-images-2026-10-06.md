# Lesson 4.10 paired image correction

The reported failure was a daylight asking photograph before a 3 a.m. answer, plus a bare wrist followed by an unrelated wall clock. The Learn exchanges and five listening dialogues now bind wider asking views to close-ups of the same visible wristwatch. Morning uses low golden light, afternoon the bright residential street, evening a lit venue at dusk, and both 9 p.m. and 3 a.m. use a dark sky. The close-ups retain these cues and add an explicit time readout; darkness alone does not establish a.m. or p.m.

These are **local photographic composites and retouches**, not new camera captures. The existing Luis/Ana source, existing day-context scenes, a CC0 camera photograph of a watch, a retained selection mask, measured wrist/dial geometry, output hashes and the reproducible offline recipe are pinned in `docs/product/time-exchange-photo-assets-v1.json`. No image API or generation service was used. The script writes to a separate output folder and refuses to overwrite versioned outputs.

The four clock-free introductory images, neutral whole-hour bank and useful original sunrise/7:00, afternoon/3:00 and night/9:00 images remain. The sunrise clock supplies the morning contrast in A7; the afternoon and night originals remain on independent practice cards. U1/U2 now use the same watch in both views, correcting the additional continuity mismatch found in the lesson-wide sweep. All 70 cards, learning phrases, voices and stage order remain unchanged. The separate instruction typography correction is already integrated in PR #243.

## Verification

- Inspected the final 3:2 pairs together at phone-sized width. The afternoon close-up was corrected to remove an accidental duplicate person in its background. The wrist close-ups show the same gold case, black face, strap, sleeve and correct hour as their asking view. Morning/dusk/night cues remain above the wrist.
- Reproduced all 14 output files from the pinned inputs: every SHA-256 matched exactly. All three repository copies match the manifest.
- Reviewed all 70 slides and all 30 distinct runtime images, including every prompt, model, distractor and dialogue image. Contact sheets cover every image and list its slide uses. The whole-lesson regression checks every binding's hour and day period, including listening options and correct-answer mapping. Neutral gray-wall clocks remain only where no day period is asserted.
- 45 backend tests passed: paired time contracts, authoring-plan parity, answer banks and audio turn sequences/assets. Negative fixtures reject a daytime question before 3 a.m., a different hour, different scene, different clock, and a 7 p.m. label on a gray-wall photograph used to teach evening. The persistent catalog source-snapshot check also passes after pinning it to the committed candidate.
- 30 mobile tests passed: sentence construction, time abbreviation tiles, construction teaching and compact Recognize, Listen and Speak instructions. The checks cover the complete 81-lesson catalog.
- Rebound 70 image-dependent audio IDs to the exact predecessor recordings. No speech was generated. New image and audio/receipt objects were uploaded immutably and downloaded to verify their checksums.
- `git diff --check` passed. The local complete-course media audit encounters omitted unrelated image files in this sparse checkout; the required CI run performs the complete checkout audit and release checks before merge.

Agent inspection is engineering evidence. No human semantic approval was added or inherited by the new images. Final phone review remains in protected Preview; Production is outside this task.
