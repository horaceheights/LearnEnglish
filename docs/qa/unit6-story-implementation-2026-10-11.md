# Unit 6 story implementation — 2026-10-11

The approved rebuild is installed in the isolated `codex/unit6-story-rebuild` branch and pushed as [draft PR #264](https://github.com/horaceheights/LearnEnglish/pull/264). It is not published. Its authoring review is available locally at `http://127.0.0.1:8770/unit-6-review.html`.

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

## Audio status and release gate

New recordings use ElevenLabs `eleven_v4`, the existing character voices and original provider bytes. The separate healthy legacy noun recording of `station` is preserved. The corrected Ana station arrival and current-destination recordings use revision 2 and exact checksums in `character-continuity-correction.json`.

The bounded renderer reused 54 already-approved render contracts, adding 195 bindings with no provider requests. Every older binding remains unchanged. There are 289 newly staged take records, including superseded authoring takes; 264 are current unique recordings awaiting listening review. None of these new takes has been approved or bound to learners. The review page can play every current card using staged or previously approved audio, but it is not the app player.

The persistent catalog and complete reviewed-audio tests must remain red until the exact pending recordings are heard and approved. Do not merge this draft or publish Preview with those failures. Settings and metadata cannot establish pronunciation quality. The governing rule is [Audio Guardrails](../product/project-guardrails.md#7-audio-guardrails): “Stage new v4 takes for listening review before binding them to learners.”

After the listener exports the review-page decisions, promote only approved exact checksums through the existing bounded renderer, repair rejected takes, export the persistent catalog, publish and verify immutable media/audio inventories, rerun required checks, and integrate current main. Preview must use the protected workflow from exact remote main. Final phone acceptance and any separately authorized Production promotion follow that same immutable Preview commit.

## Verification

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

Human image approval, listening approval and device acceptance are separate from these checks.
