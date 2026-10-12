# Unit 6 story implementation — 2026-10-11

The approved rebuild is installed in the isolated `codex/unit6-story-rebuild` branch and tracked in [PR #264](https://github.com/horaceheights/LearnEnglish/pull/264). It is not published. Its authoring review is available locally at `http://127.0.0.1:8770/unit-6-review.html`.

## Scope and learner behavior

Fourteen lessons contain 572 cards: twelve teaching lessons of 42 cards, a fresh 54-card review and fourteen mission scenes. The mission contains 32 listening decisions and four closing speaking scenes. Ten existing permanent lesson IDs are preserved and four inserted lessons receive new IDs. The full course contains 85 lessons across seven units.

Places and transport lead into current destinations, complete trips, location and directions, permission, requests, tickets and schedules. Earlier family, shopping, day-part and sequencing language returns in meaningful practice. Learn introduces contextual models; later stages expand them. Only new targets receive the shared yellow emphasis. The mission ends by helping another visitor reach the museum.

The station arrival keeps Ana visible with her established voice. Distinct departure, travel, exit and arrival photos preserve her identity and destination. The library arrival, airplane and boat examples also show their travellers. The plural train example uses the inspected photograph of two people boarding. Source photos and rejected versions are preserved.

## Shared implementation

- Optional authored mission cue order preserves causal conversations, directions and stops through retries and rotation. Other scenes retain cue shuffling.
- An explicit two-person dialogue scope requires exactly two visible targets, two cues, two speaking roles and authored order. Ordinary search scenes still require four candidates.
- The shared authoring engine supports contextual models, per-item audio revisions, longer spoken models and ordered guided/full constructions. New feedback explains destination, transport, direction and schedule phrases.
- Native layout verification exposed overflow in the longest spoken route at enlarged text settings. Shared compact landscape spacing now fits the full model and all live syllables; the image, microphone state and 48dp controls remain visible across model, ready, listening, checking, retry, success and unavailable phases.
- Briefs, plans, individual exports, course export, browser descriptions, media contracts and the complete release integrity catalog agree. Three historical Unit 5 follow-up plans point to their revised Unit 6 successors, preserving the original authoring history.
- 260 earlier image uses are explicitly retired through the existing preservation contract. Original hashes and files remain unchanged; 218 earlier media-change records remain in the package history.

## Approved media and release preparation

On 2026-10-11, the user approved the current audio and images and explicitly authorized Preview publication. [The approval inventory](../product/content-plans/unit6-story-2026-10-10/user-media-approval-2026-10-11.json) pins all 264 current staged recording checksums and 155 current image checksums. Superseded takes and the rejected angled-train generation are excluded. The bounded renderer promoted those exact v4 bytes and reused existing approved takes: zero provider requests, 905 new card bindings, and every older binding preserved.

The 09:00 and 10:00 train departure images now show a right-facing front matching the arrow, with the wheels aligned to the rails. Both clocks remain exact; the two alternatives use matching geometry. Lesson 6.12 is revision 5. Canonical, web and mobile image bytes match, and its three changed answer-bank contracts were re-reviewed. The remaining six arrival/bus schedule images were inspected and retained. [Direction evidence](../product/content-plans/unit6-story-2026-10-10/schedule-direction-review.json) preserves the rejected originals and accepted checksums; the regression guard rejects stale image evidence or an unreviewed four-card crop. See [the corrected review card](unit6-train-departure-review.jpg).

All 14 plans reproduce the installed canonical lessons. The persistent audio catalog contains 6,779 assets and is pinned to content commit `94e527a5`. The review page has zero pending recordings and zero missing audio. Human media approval does not imply acceptance of an installed Preview build or approval to publish Production.

Media publication, final checks, main integration and the protected Preview workflow are being completed. Publication must come from the exact remote head of protected main; Production requires separate approval after that exact Preview is tested.

## Initial draft verification

Current `origin/main` at `19206562` was inspected and merged. Its cleanup-policy change overlapped only a separate guardrail paragraph; no curriculum or runtime conflict was found.

- Canonical content and mobile parity: all fifteen scoped validators pass; all fourteen engine plans reproduce installed content.
- Practice: zero new findings; the existing course baseline has 91 findings. Unit 6 has zero draft findings or missing images.
- Speaker review: zero unreviewed, mismatched or stale picture/voice assignments; 2,212 scalar assignments independently pinned.
- Mistake feedback: 9,324 wrong attempts checked across all 85 lessons.
- Mission geometry: 30 supported-size layouts pass touch-bound and overlap checks.
- Complete `verify-interaction-paths.ps1 -ReviewPolicy Preview`: passes, including all nine native viewport tests and the later audio/playback/recovery suites.
- TypeScript and versioned release integrity: pass (85 lessons, seven units).
- Android production bundle export: passes locally; this is a build check, not a Preview publication.
- Backend suite on the merged current-main candidate: 646 tests, 644 pass and exactly two fail closed: the persistent catalog still describes the last approved course, and 905 new asset bindings require reviewed audio. Both are the expected audio release blockers; neither test was weakened or skipped.
- Release lineage checks retain the historical `657ab194` recovery baseline while pinning the new 85-lesson candidate. All eleven lineage tests pass.
- Media upload preflight: all existing local objects match the committed inventory; 138 additional objects are confined to the new Unit 6 namespace. Upload follows the audio-approval gate.

The native test harness exercises the actual components with Yoga, including full content bounds, enlarged text, rotation, retry and feedback. Agent review of [the corrected station card](unit6-station-arrival-review.jpg) is on the HTML authoring page. Neither substitutes for exact Preview testing on a device.

The final hygiene audit reports six existing/concurrent repository findings. The primary checkout and other tasks were preserved. This task's unmerged branch and worktree remain for listening review and release completion; no worktree or branch was deleted.

The initial draft audio failures above are historical. The user approval and catalog preparation described earlier supersede the draft listening gate; current release verification is recorded below.

## Approved candidate verification

Complete local Preview preflight passes: content, media, TypeScript, phone layout and interaction tests, and Android bundle export. All 42 focused backend checks pass, including the corrected answer banks, exact source catalog, historical receipt recovery, and current inventory. Media upload includes 140 new files; audio publication contains 6,779 validated contracts. All previously published object descriptors remain unchanged. Two returning 6.2 train audio IDs already existed in historical storage; their audio and receipt JSON semantics matched, but local receipt formatting differed. The publisher now resolves returning IDs through checksum-pinned history, and the exact original receipt bytes were recovered without overwriting remote objects. Six publisher regression tests pass. Full CDN checksum verification passes: 6,779 audio assets and 3,052 media objects, zero missing, invalid or errors. Protected GitHub checks and Preview publication are next.
