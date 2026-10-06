# Lesson 4.10 — corrected watch exchanges and dialogue playback

## Approved scope

The user approved the complete replacement image set and corrected roles on
2026-10-06: the woman without a watch asks, and the man wearing the watch answers.
Approval followed in-chat display of each generated image and a paired HTML
review with matching female-question/male-answer recordings.

The built-in image editor was explicitly authorized for these corrections.
No external image API or image CLI was used. Approved natural wrist close-ups
are preserved. Rejected elongated-hand, pasted-watch, wrong-speaker and
extra-clock-hand candidates are excluded.

## Installed content and media

- 70 cards remain: 18 Learn, 14 Recognize, 14 Listen, 12 Speak and 12 Use.
- 49 image references across 35 cards use 13 versioned v2 assets, including
  all affected choices and 10 dialogue-turn references. The 9 a.m. reply is a
  listening distractor; no unused asking image was added.
- Paired pictures preserve the watch, hour, clothing and morning/day/dusk/night
  context. All whole-hour practice and clock-free day introductions remain.
- Canonical lesson, authoring plan, 14 brief models and depicted exchange roles
  agree: Sarah asks; Luis/Liam answers.
- Seven new Liam takes use the established bounded ElevenLabs workflow; the
  exact Sarah question is reused. All eight takes decode with non-silent audio
  and valid pinned provenance. The 70 new immutable bindings comprise
  29 question and 41 answer contracts.
- The full 81-lesson export is preserved; all other 80 lessons are identical.
  All 3,572 unrelated media and semantic-review rows are unchanged. The preserved
  sunrise distractor's changed choice-bank context was refreshed.
- V1 images/provenance, original contextual clocks and historical recordings
  remain byte-for-byte. Source PNGs, available exact prompts, hashes and lossless
  WebP pixel parity are recorded in time-exchange-photo-assets-v2.json.
- The first approved 3 a.m. close-up's exact generation prompt was not retained
  in the working record. Its PNG/hash are preserved; the manifest explicitly
  records the missing prompt rather than inventing one.
- The local lesson HTML and paired image/audio review show the approved set.

Chat approval covers the image set. Final phone layout/crop decisions remain
truthfully pending in the semantic registry for Preview testing.

## Dialogue playback

The old callback waited for turn images before audio, including hidden Listen
pictures. A stalled image could silence autoplay and replay despite ready audio.
It also accumulated native playlists on every replay.

Pictures now preload independently. Playback waits only for immutable audio.
Healthy playlists stay observed and reused. Android errors are retained; failed
playlists are replaced, subscribed before playback, and released because Expo's
constructor prepares the native player whereas clear/add cannot recover its
failed idle state. Obsolete events cannot poison the replacement. Navigation
still cancels pending playback.

All 19 original Listen recordings were also checked for non-silent audio.
Available Sentry reports did not establish the user's exact phone-side cause.
No physical device was connected; regression results are not device confirmation.

## Verification

- 58 focused backend tests pass: all 14 time-lesson tests, plan parity, audio
  turns, answer banks and media-copy behavior.
- 19 mobile test entries pass: five Listen dialogue orders with stalled images,
  50 replays, failed-player replay/next-card recovery, obsolete events, cleanup,
  navigation cancellation, connection recovery, answer audio, image visibility
  and compact instruction headers.
- The new dialogue suite is included in the mandatory mobile runner.
- TypeScript, complete release fingerprint and diff whitespace checks pass.
- Source PNG hashes, decoded pixel equality, three runtime copies and complete
  reference coverage are protected by the lesson tests.

## Release checkpoint

Content/audio integration is committed at `7cffa9a8ddc3fc94cc241134674d4f6100c86db2`.
The complete persistent catalog is pinned to that source. All 153 scoped R2
objects (13 images and 70 MP3/receipt pairs) were uploaded with immutable writes
and verified by full GET checksums. Historical objects remain preserved.
The exact cast audit now covers the approved role reversal; its focused tests
pass. Full local backend discovery is limited by absent unrelated assets in the
sparse checkout. Required CI runs the complete checkout before integration and
protected Preview publication.
This record does not claim Production approval or completed phone testing.
