# Lesson 4.10 day context: authoring and cast review

The user approved implementing the revised HTML proposal on 2026-10-05.
The learning sequence introduces morning, afternoon, evening and night on
separate clock-free images before combining them with whole-hour time.
The lesson retains its identity, all hours 1–12, complete questions and answers,
and a.m./p.m. practice. Routine and activity-at-time language is excluded.

This record documents Codex agent inspection of revision 4's independent day
foundations, restored contextual clocks, and exact changed answer banks. It does
not mark image pixels human-approved, confirm audible quality, certify installed
device behavior, or establish that the requested two-shot conversation is ready.

## Source pixels inspected

The four new 3:2 derivatives were inspected as complete frames. No visible clock,
time label or written day-part answer appears in any foundation image.

| Image | Actual visible cues | Agent voice observation |
| --- | --- | --- |
| `a1_photo_u4_day_morning_v1.webp` | A low golden sun over distant hills, trees, warm sky and a small window/bed edge; no clock. | `It is morning.` describes the scene; no person is speaking. Narration. |
| `a1_photo_u4_day_afternoon_v1.webp` | A high bright sun, blue sky, scattered clouds and tree tops; no clock. | `It is afternoon.` describes the scene. Narration. |
| `a1_photo_u4_day_evening_v1.webp` | Pink/purple dusk sky, lit streetlamp and warm building/string lights. Several people stand outside; no pictured person is identified as saying the day-part line. | `It is evening.` is narration. Incidental people do not turn the line into a character utterance. |
| `a1_photo_u4_day_night_v1.webp` | A large moon, stars and a dark blue sky; no clock. | `It is night.` describes the scene. Narration. |

A low sun alone cannot prove sunrise rather than sunset, and darkness alone
cannot distinguish a.m. from p.m. These photographs model the named day parts
with the lesson's explicit introductions; they are not astronomical evidence of
an exact time. The bright-afternoon/dusk and moonlit-night/dusk contrasts retain
distinct sky and lighting cues at the inspected full 3:2 framing.

The protected original contextual pictures were also inspected. The bedside
alarm clock in `a1_scene_morning_45a21e4.webp` reads 7:00 beside the low sun.
`a1_scene_afternoon_7a10f39.webp` shows a 3:00 clock over a sunny park, blue sky
and river; `a1_scene_night_1be2a44.webp` shows a 9:00 clock over moonlit hills.
The latter two clocks are visibly composited over their backgrounds. They supply
useful contextual practice; they are not photographs of a clock belonging to
the man in the asking scene.

All source-clock derivatives used in the reviewed banks were inspected: hours
1, 2, 3, 4, 5, 6, 8, 10, 11 and 12, plus 3:00 AM, 7:00 PM and 9:00 AM.
Their minute hands point at 12 and the shorter hands indicate the stated hours.
The AM/PM derivatives have numeric readout plates; their neutral wall background
does not independently show a day part. In particular, the current 7:00 PM image
supports a contrast against 7:00 AM through notation; it lacks the requested dusk
background for the final conversational media.

### Inspected image SHA-256

| Image | SHA-256 |
| --- | --- |
| `a1_photo_u4_day_morning_v1.webp` | `c79cf27518cbc33ec3a2d1153c8a0397733a5e6aa6d093509d4d08c2f43f40d0` |
| `a1_photo_u4_day_afternoon_v1.webp` | `56f3abb562d960865a417966f712824b1e4e88a1fe41cd1bfa8d3249800a90cc` |
| `a1_photo_u4_day_evening_v1.webp` | `d0fe09405053dcd0d64618b8ca497ed68af5f79e1ad20c76a8ccc496fab10bdd` |
| `a1_photo_u4_day_night_v1.webp` | `bcf79a7e6d6cc1914f817b2773c873fe960d969ba285265063983d7f8df7957c` |
| `a1_scene_morning_45a21e4.webp` | `7ae01da400643ae88ad7be93ac7ab9b9b39c57228a6a59f1e8b0bd555b76b523` |
| `a1_scene_afternoon_7a10f39.webp` | `15556d341aa3d1f094cc74667f75916741cb5804fc961363043016d024b45ce3` |
| `a1_scene_night_1be2a44.webp` | `2dfc065642b47489660069f5fccfdf6951c33f1b88c394ac9d5b085acdcfb8a2` |
| `a1_photo_u4_what_time_luis_v1.webp` | `c8d16bdf6df5765052d5aa435043c39e9cc3a66b5875504a98c3c9f79857c221` |

## Exact answer-bank review

Every changed bank below was read with its complete options, option order,
correct ID, prompt, audio text and image references. The declared language was
checked against the current lesson vocabulary, earlier morning/It is frames,
and known numbers. Sentence alternatives remain complete and comparable in
length; image alternatives are all caption-free. Each pair changes only the
day period, the hour, or AM/PM. No structural or pedagogical exception was needed.

The 27 inspected banks are DR1–DR4, R2–R10, DA1–DA4 and A1–A10. Sixteen
actually changed/new fingerprints were saved individually in
`docs/product/answer-choice-contracts.json`: DR1–DR4, R4/R8/R10, DA1–DA4 and
A6–A10. Fingerprints bind the backend-normalized model, including its
`/lesson-assets/` URLs. Eleven inspected banks and R1 already matched their
existing contracts and were preserved. Unrelated records and registry ordering
were retained. The contract records exact authoring structure; it does not
approve the images for Production.

| Banks | Correct choice | Other choice | Evidence inspected |
| --- | --- | --- | --- |
| DR1 / DA1 | Morning (`dr1-morning` / `da1-morning`) | Evening | Low golden-sun foundation versus dusk streetlamp scene. DR uses two complete `It is ...` sentences; DA uses two unlabeled images. |
| DR2 / DA2 | Afternoon (`dr2-afternoon` / `da2-afternoon`) | Morning | High bright-sun foundation versus low golden-sun foundation. |
| DR3 / DA3 | Evening (`dr3-evening` / `da3-evening`) | Afternoon | Dusk sky and switched-on lights versus high bright sun and blue sky. |
| DR4 / DA4 | Night (`dr4-night` / `da4-night`) | Evening | Moon/stars/dark sky versus dusk sky with building lights. |
| R2 | `It is one o'clock.` | `It is two o'clock.` | Source-clock derivative reads 1:00. Correct ID `it-is-one-oclock-r2`. |
| R3 | `It is two o'clock.` | `It is one o'clock.` | Source-clock derivative reads 2:00. Correct ID `it-is-two-oclock-r3`. |
| R4 | `It is three o'clock in the afternoon.` | Same hour in the morning | Restored 3:00 clock over sunny park. Correct ID `it-is-three-oclock-in-the-afternoon-r4`. |
| R5 | `It is four o'clock.` | `It is one o'clock.` | Source-clock derivative reads 4:00. Correct ID `it-is-four-oclock-r5`. |
| R6 | `It is five o'clock.` | `It is one o'clock.` | Source-clock derivative reads 5:00. Correct ID `it-is-five-oclock-r6`. |
| R7 | `It is seven o'clock in the evening.` | Same hour in the morning | 7:00 PM plate supports the PM-versus-AM contrast. Correct ID `it-is-seven-oclock-in-the-evening-r7`; final dusk contextual scene is pending. |
| R8 | `It is nine o'clock at night.` | Same hour in the morning | Restored 9:00 clock over moonlit hills. Correct ID `it-is-nine-oclock-at-night-r8`. |
| R9 | `It is three a.m.` | `It is three p.m.` | Source-clock derivative and 3:00 AM plate. Correct ID `it-is-three-am-r9`. |
| R10 | `It is three p.m.` | `It is three a.m.` | Restored sunny 3:00 scene; afternoon is PM. Correct ID `it-is-three-pm-r10`. |
| A1 | Six o'clock | Three o'clock | Unlabeled 6:00/3:00 clock images; correct ID `it-is-six-oclock-a1`. |
| A2 | Eight o'clock | Three o'clock | Unlabeled 8:00/3:00 clock images; correct ID `it-is-eight-oclock-a2`. |
| A3 | Ten o'clock | Three o'clock | Unlabeled 10:00/3:00 clock images; correct ID `it-is-ten-oclock-a3`. |
| A4 | Eleven o'clock | Three o'clock | Unlabeled 11:00/3:00 clock images; correct ID `it-is-eleven-oclock-a4`. |
| A5 | Twelve o'clock | Three o'clock | Unlabeled 12:00/3:00 clock images; correct ID `it-is-twelve-oclock-a5`. |
| A6 | Three o'clock in the afternoon | Three o'clock in the morning | Heard exchange and restored sunny 3:00 scene versus 3:00 AM plate. Correct ID `it-is-three-oclock-in-the-afternoon-a6`. |
| A7 | Seven o'clock in the evening | Seven o'clock in the morning | Heard exchange and 7:00 PM plate versus bedside 7:00 sunrise scene. Correct ID `it-is-seven-oclock-in-the-evening-a7`; final dusk scene is pending. |
| A8 | Nine o'clock at night | Nine o'clock in the morning | Heard exchange and restored moonlit 9:00 scene versus 9:00 AM plate. Correct ID `it-is-nine-oclock-at-night-a8`. |
| A9 | Three a.m. | Three p.m. | Heard exchange and 3:00 AM plate versus restored sunny 3:00 scene. Correct ID `it-is-three-am-a9`. |
| A10 | Three p.m. | Three a.m. | Heard exchange and restored sunny 3:00 scene versus 3:00 AM plate. Correct ID `it-is-three-pm-a10`. |

DU1–DU4 were also inspected. Each completes `It is ___.` using two day words
matching the DR/DA contrasts and the exact pictured day. The stored audio model
is the full sentence. These are supported completion interactions and do not
belong to the ordinary answer-bank fingerprint registry.

## Cast observations and pending conversation source

The four day frames use teacher/co-teacher narration, alternated consistently
across their stages. Clock-only statements are narration unless the authored
exchange identifies an off-camera respondent. The existing time exchanges
explicitly assign Luis to the question and the female character to the answer;
the absence of the female character in a clock close-up does not by itself
authorize replacing her reply with a neutral narrator.

The supported speaking-voice audit currently selects first/second-person and
social utterances, not these third-person day/time statements or `What time is
it?`. It reports zero 4.10 rows. A course-wide run reports zero unreviewed,
mismatched, misnamed or stale rows, but cannot establish the new day/time cast
observations above. No orphan records were added to
`docs/qa/speaking-voice-review-v1.json`, and the shared audit scope was preserved.

The inspected `a1_photo_u4_what_time_luis_v1.webp` shows a man facing a woman
and pointing at his bare wrist. No visible watch can supply the requested next
close-up. A photograph of someone pointing to a visible clock, with another
person present and a clear day-period background, remains unresolved. Its reply
must crop that same source clock, with matching hour and preserved relevant day
cue. The final source/crop hashes, correspondence test and affected cast/media
bindings must be reviewed after the actual source is available. This record
does not treat the present bare-wrist scene and unrelated clock pictures as a
completed two-shot pair.

## Verification boundaries

Source-plan equality, day-before-hour practice, all-hour coverage, time-only
language, synchronized 3:2 day images, source-clock provenance and AM/PM tile
tests are automated separately. Protected originals are required on legitimate
successful contextual practice paths; the tests do not force their unrelated
filenames into the final conversational Learn close-up.

The inspected revision contains 70 cards (18 Learn, 14 Recognize, 14 Listen,
12 Speak and 12 Use). At this checkpoint the LF-normalized canonical lesson
SHA-256 is `540de6d7a18b35be2e3c297bddc08ebe9728aa33806b315051bc074dcd3028ac`;
the authoring-plan SHA-256 is
`2b4f45bd41a3150d382c14d715dc9560fb1e6dcdb282ded653460ace2c6887ed`.
Later scene changes require review against their new exact bindings.

`python -m unittest backend.tests.test_time_lesson_contract
backend.tests.test_answer_choice_contracts` passed all 21 tests.
`python -m scripts.answer_choice_guardrail` passed 1,565 exact banks across the
complete 81-lesson catalog after the individually reviewed normalized contracts
were saved. The supported course-wide speaking review reports zero issues.

Browser/device verification, audio listening, immutable storage verification,
required CI, backend readiness and publication are recorded by the integrating
task after final media is available. None is implied by the answer-bank or cast
observations in this note.

## Implementation checkpoint

The independent day-foundation implementation is preserved in an isolated task
branch. The full 81-lesson mobile catalog was exported and compared with
`origin/main`: only 4.10 differs. Its aggregate Git blob is
`843905e820d6f5ad3df072b12281ddc538974991`; the release manifest preserves all
seven units and 81 lessons. The immutable audio catalog references the authored
course snapshot `2f29291df1847db89315faef85704d973a140297`.

Four missing recordings were prepared with the existing ElevenLabs settings;
17 approved takes were reused. Publishing installed 126 new immutable bindings
and preserved all 63,547 previously recorded historical object descriptors.
The media publication added only the four day images and preserved every prior
media object. Actual CDN downloads matched SHA-256 and byte lengths for all 136
active 4.10 audio/receipt pairs and the four day images. These byte/provenance
checks do not claim human listening review.

The local web app was inspected at 390 by 844 and 844 by 390. Morning,
afternoon, evening and night appear in that order, each with a distinct loaded
clock-free image and full sentence. All four images loaded at 1536 by 1024.
Landscape retained a vertical scroll surface with no horizontal overflow.
This is browser observation, not installed-device certification.

Completed automated checks at this checkpoint:

- All 498 backend tests, source-plan parity, practice ratchet and Preview card
  validation pass.
- All 1,565 answer-bank contracts pass; cast and persistent audio validation
  pass for the complete course.
- Preservation audit passes for 981 protected assets with no errors.
- Release integrity passes for the complete 81-lesson, seven-unit catalog.
- Mobile TypeScript, the Android production bundle export and all 20 frontend
  tests pass.
- The full mobile Preview interaction suite passes, including native viewport
  and rotation tests, 584 ordered constructions, 4,022 reachable construction
  mistakes and the four configured introductory word choices.

The universal construction audit retains its existing ordered-card checks.
Only the four exact approved introductory targets are allowed through
`approved_use_choice_targets`; their blanks, competing words, completed
sentences and concrete wrong-choice explanations are checked separately.

The two-person pointing photographs, exact source-clock close-ups, final
conversation background cues and corresponding provenance checks remain
required. No existing source supplies that shot. The earlier user instruction
prohibits image services; automatic approval review also rejected opening an
external stock-photo page for that reason. No image-generation service was
used. On 2026-10-06 the user requested applying the approved lesson rework. The
day-part foundations and restored contextual time practice may proceed to
protected Preview while the connected two-shot media remains a recorded
follow-up. Existing question photographs are temporary, and neither passing
engineering checks nor Preview publication marks that media requirement complete.
