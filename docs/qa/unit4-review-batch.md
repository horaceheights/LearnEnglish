# Unit 4 screenshot corrections — 2026-10-07

The user approved implementation after collecting the screenshot findings. The batch preserves all 81 lessons and seven units.

| Finding | Correction and scope |
| --- | --- |
| 4.3 Listen A1 elongated “In” | Both prompt and answer use revision 2 and the exact previously approved natural teacher take, also used in Learn/Recognize. No paid audio generation. |
| Ambiguous hints | Shared web/mobile rules explain singular/plural there is/are, singular/plural you, people/animals/things for they, and action negation without inventing preferences. |
| New words lose their yellow emphasis | Shared full-phrase matching across prompts, options, pronunciation models and construction tiles in both clients. Animation remains Learn-only; grading feedback keeps its colors. Both target alternatives are highlighted, so color cannot reveal the correct choice. |
| Oversized instructions | The shared compact Recognize role recognizes explicit Spanish phrase/word instructions. All 12 matching authored cards and 751 listening headers were audited. |
| Similar cleaning-room choices | Three replacement photographs have unmistakable kitchen, living-room and bedroom furnishings. All uses in 4.7 are updated. |
| Repeated Learn photographs | A speaker turn replaces the photograph in the existing slot. Native rendering verifies one image for both 4.11 L7 and L8 in portrait and landscape. |
| Bags outside the table | Both alternatives show their two/three bags fully beneath the table; count remains the difference. |
| Unclear affirmative/negative gestures | New review gestures include a male negative for Use U4. All reuses of the other generic negative were replaced in 4.8, 5.3 and 5.5. Cast identities and voices are retained. |
| Missing weekday markings | Tuesday, Wednesday, Friday, Saturday and Sunday review photographs have the full target box circled. Healthy existing day-lesson calendars are preserved. |
| Mission calendar numbers/pointing | Mission timetable uses Tu/We/Fr/Su; the Thursday calendar uses Mo/Tu/We/Th/Fr/Sa/Su, a full-box loop and a fingertip inside Th. |
| Recording cut off on advancement | Healthy replay waits until the clip finishes. Eight seconds without progress triggers recovery; the same watchdog no longer limits total clip length. Actual grading/playback callbacks are exercised with a virtual 25-second recording and a stalled player. |
| Artificial mission sequence | M11/M12/M16/M17 are independent answers. M12’s woman points at the two cleaners. No First/Then/After that/Finally is added to speaking answers. |

The independent-answer correction supersedes the previous use of those four connectors as apparent later practice for 4.6. Four specifically documented later-reuse findings are retained in the practice baseline; the general standard is unchanged. Genuine routine activities keep their wording.

## Media audit and provenance

- Sixteen usable images and one rejected Thursday-pointing iteration were retained in `Lessons/Lesson1/images/course-photoreal-sources/unit4-review-repair-v1/`. SHA-bound provenance and agent review are in `docs/product/unit4-review-repair-media-v1.json`. The first four entries retain reconstructed briefs rather than claiming to quote an unrecorded exact prompt.
- All 798 image-option banks were scanned for identical bytes and perceptual similarity. Forty close pairs were inspected and retain visible target differences. The audit inventory is `unit4-review-batch-image-audit.json`; changed choice contracts are recorded in `unit4-review-batch-answer-banks.json`.
- A reusable validator rejects identical image bytes disguised by different option filenames. Similarity alone is not treated as failure: matching framing is useful when count, clock hands, price or a calendar mark is the intended contrast.
- All existing media files are preserved. New image-bound audio contracts reuse exact compatible approved takes. R2 staging adds new immutable objects; Preview publication remains exclusively the protected workflow on current `main`.

## Verification

All 585 backend tests, 23 frontend tests, the complete mobile interaction suite, TypeScript and exact release fingerprint pass. CDN verification confirms 6,379 valid immutable audio contracts and 2,838 media objects with zero missing or invalid assets. The recording progression and single-photo tests execute production callbacks/components. Complete Preview preflight, including the Android production bundle export, passes; the local full frontend build is unavailable because the pre-existing shared dependency installation lacks `@clerk/nextjs`.

Agent inspection and native Yoga checks do not claim physical Android rendering or microphone testing. Human image approvals remain pending. The exact published Preview should be checked on the learner’s phone for calendar legibility, pointing, yellow text and complete recording replay before any separately approved Production promotion.
