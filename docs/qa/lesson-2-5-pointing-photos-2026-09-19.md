# Lesson 2.5 this/that photos — 2026-09-19

## Problem

The user reported that the Lesson 2.5 `That is a book/phone/chair.` photos point
at nothing. The 2026-09-12 Unit 2 photo pass had overwritten all eight
`a1_{near,far}-{book,phone,bag,chair}.webp` stills in place with third-person
photographs, breaking the approved 2026-08-29 paired-scene guardrail. The far
photos aimed the finger at empty space, and the near book printed its own answer
(`THIS IS A BOOK.`). Lesson 4.1 R7 reused that near book for a this/that contrast.

## Change

- Four first-person pairs, `a1_photo_u2_{this,that}_{book,phone,bag,chair}_v1.webp`,
  replace the eight stills in 44 Lesson 2.5 fields and Lesson 4.1 R7. In each
  pair the left hand holds the near object, and the right hand points at it
  (`this`) or at the identical far object (`that`).
- Each pair is one generated state plus an edit of that exact output which
  changes only the pointing hand. Book, phone and bag generated `that` first.
  The chair generated `this` first so the hand starts low, then turned only the
  finger. `test_lesson_2_5_pairs_retire_every_contract_violating_photo` pins this.
- The original files stay byte-for-byte. Each retirement is a
  `contract-violating-photo-retirement` record in `course-photo-reuse-v1.json`
  that pins the old pixels, what was wrong, and every bound field. The
  preservation audit passes with 470 recorded exceptions.
- Manifest contracts moved with their card fields: the 45 changed uses keep
  their authored descriptions and take the current renderer signature. Every
  other use is unchanged. The semantic registry lists the eight new files as
  pending human review.
- Audio: every card keeps the same recordings. The two registry-bound clips
  were linked under their new IDs to the exact same takes. The other 68
  affected clips resolve by text through the legacy manifest, which the new
  photos do not change.

## Generation and costs

Packs `lesson-2-5-pointing-photos-v1..v4.json` hold every prompt. Receipts,
hash-bound agent reviews and sources are in the proof records and under
`course-photoreal-sources/unit-2-lesson-v{1,4}/`. No automatic paid retries were used.

| Revision | Result | USD |
| --- | --- | --- |
| v1 | Book, phone and bag pairs installed | 0.298589 |
| v1 | THAT chair rejected: fingertip between the far chair's legs | 0.043985 |
| v2 | Chair request refused (HTTP 429, credit exhausted); no image, no charge | 0 |
| v3 | THAT chair rejected: fingertip on the far chair's seat | 0.043995 |
| v4 | Chair pair installed (THIS first, finger-only THAT edit) | 0.099478 |
| Total | Approved ceiling US$1.00 | **0.486047** |

At the recorded 16.9707 rate the total is about MX$8.25. These are pre-tax usage
estimates, not an invoice.

## Verification and limits

- Each accepted still was inspected at full size and at 360, 250 and 180 px
  3:2 phone renders, the pointing fingertip at zoom. No 2.5 card uses the
  centered 4:5 crop, which trims the left hand. Agent review is not human
  approval.
- The Preview-policy lesson validator output is identical to `main`, except
  that 45 fewer contexts carry stale renderer signatures.
- Backend, mobile interaction and preservation checks pass after the audio
  catalog export. No live Android-device test is claimed.
- The 2.5 course-browser thumbnail still uses the original near-book photo.
