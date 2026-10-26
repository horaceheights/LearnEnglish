# A1+ Unit 1 mobile integration checkpoint

This task is authorized to implement Unit 1 and publish it through the protected main-branch Preview workflow. The local verification catalog now contains all 85 unchanged A1 lessons and 12 A1+ lessons, in separate courses. The candidate remains local; no task branch has been pushed, no pull request opened, and no Preview published. The frozen October 26 audit-repair snapshot remains unchanged.

## Exact listening approval

The user confirmed: “I have listened and approve this exact batch” for the local media review page at `http://127.0.0.1:8782/media-review.html`, batch `9cef93ee`.

- `audio-review-manifest.json` preserves all 360 distinct recordings and their source card references. Its UTF-8/LF SHA-256 is `9cef93eed5196982ee92612d321fd5dbbb23b2483c9e1dd28d60e673623e9704`, the hash displayed by that page. Windows CRLF serialization of the original review file has byte hash `4c96e3c13bc84c6907b984ab8d5fa68b0de60a7b5fc3167dbdbf96828bb52f76`; these contain identical JSON values.
- `audio-listening-approval.json` records the explicit user response and each exact recording checksum, transcript, speaker role and delivery. This is listening approval, not image approval or Production approval.
- `scripts/prepare_reviewed_delivery_audio.py` prepared and validated 803 canonical bindings to those 360 unchanged recordings through the existing approved-take resolver. All 259 normal recordings retain their original provider records; the 100 prepared pronunciation receipts and one supplemental mission introduction retain their source records separately. Unknown trace IDs stay null.
- The approved recordings are now bound in the local verification catalog. Image packaging changes audio asset identities without changing speech: supplemental reuse requires an identical speech, voice, mode, delivery and revision contract, preserves the original receipt and records the image-only rebinding. Seven existing takes retain their original approval dates and provenance; new binding records also retain this batch's review date.

## Shower objective remains required

The user explicitly chose “Keep the shower objective; resolve its images.” Retain all eight cards that retrieve it: `1.4-L02`, `1.4-R03`, `1.4-S02`, `1.4-U02`, `1.8-L04`, `1.8-S08`, `1.11-04`, and `1.11-38`.

The user subsequently authorized: “Yes, use suitable licensed images.” The new installation source replaces the setting-only bindings with two distinct Pexels photographs of washing under running water. Originals, source URLs, license links and transformation records are preserved in `docs/product/content-plans/a1plus-unit1-mobile-2026-10-26/`. The photographs illustrate the action; they do not claim the pictured people are Ana or Sofía. All eight target cards remain. Agent inspection of the actual 3:2 and 4:5 centered crops found the hands, washing and running water visible; human image approval remains pending. The review photograph is distinct from the teaching photograph.

`shower-image-attempt.json` preserves the earlier generator rejection. It returned no image, and the original audited source was not overwritten. New source version: `progression-v10-licensed-actions`, normalized content SHA-256 `eba5266eb73e869279a832be922da139d8bf62fc320ae63db13c532860d8dea2`.

## Verified integration work so far

Shared schema and both clients now carry exact clock cues, per-turn translations and the prepared pronunciation delivery identity. Construction models can have an authored ordered success reply, with failed or interrupted playback retaining recovery instead of advancing. Existing cards omit the new fields by default.

- All 85 existing A1 lessons and their audio identities match the bundled catalog after JSON normalization.
- The earlier shared-engine baseline passed 728 backend tests and six exact-audio import tests. Final multi-course backend verification is recorded separately below; that earlier result does not certify the installed Unit 1 candidate.
- Mobile TypeScript check and web production build passed.
- The complete mobile interaction runner passed with Preview review policy. Existing pending media reviews remain advisories, not human approvals.
- Focused production-callback and clock tests passed, including ordered response playback and failure recovery.
- The independent package verifier passed all 433 source cards, 708 ordered source audio occurrences and 83 image assets. Compiler repeatability passed. This proves source fidelity, not completed native installation.
- Repository hygiene was audited. Pre-existing dirty, unmerged or locked worktrees were preserved; the audit reported 18 findings for separate review.

## Remaining before Preview

Complete client and release verification, publish and verify the immutable media inventory, and refresh current `origin/main` for overlap review. Commit only this task, push and merge its checked pull request. Only then invoke the protected Preview workflow from exact remote main and verify the EAS commit. No local EAS publication is allowed.

The local content validator passed for both courses, the shared feedback resolver explained all 179 wrong-choice paths, and 161 exact answer-bank contracts record the reviewed distinctions without weakening the A1 checks. Persistent audio validation passed for all 7,735 active assets. The original A1 export is byte-for-byte unchanged. The combined release contract pins 97 lessons in eight units. Full test reruns and final publication evidence are still pending in this checkpoint.

## Publication preparation

`publication-payload.json` pins 1,689 new objects (125,128,179 bytes): 83 images and 803 audio/receipt pairs bound to the 360 listening-approved recordings. Existing objects are unchanged. The destination is the existing `spanglish-media` R2 bucket at `https://cdn.learnspanglish.app`. These bytes have only been prepared locally. Automatic approval review rejected the initial CDN upload requests, citing failing checks, pending image reviews and the need for explicit payload/destination approval. No upload was performed.

Older installed clients continue to receive only A1. The new clients request catalog version 2 for registered courses, so the shared backend deployment alone does not expose A1+ to an older Production app. Additional-course cast contracts and all-course tutor, catalog, construction-feedback and phone-layout checks now cover Unit 1.

## Final local checks before CDN staging

The 740-test backend run passed 738 tests; its two remaining checks require the final immutable Git source reference and the as-yet unpublished Cloudflare inventory. The prior single-course and voice-cast failures are resolved. The complete Preview preflight passed, including the Android bundle. Extending native phone-layout coverage to all registered courses exposed and then verified fixes for one long correction and the phrase rail's actual padding. Every additional-course construction swap has a supported, specific explanation. Final TypeScript, web build, release-integrity and source-repeatability checks passed. These results do not assert a live CDN inventory or a published Preview.
