# Mobile audio availability and recovery

## Scope

When weak cellular service still reports online but required course audio cannot
finish downloading, the current mobile activity pauses visibly. Fully cached
audio keeps working offline. No curriculum, audio catalog, native dependency,
pronunciation grading, or web player changes are included.

The active card waits for its immutable audio files before starting its prompt,
mission clue, recording, automatic completion, or answer interaction. Background
whole-lesson caching remains silent. Missing current-card audio shows a Spanish
notice, manual Retry and Exit; a slow request exposes the connection explanation
after four seconds. Downloads bound the complete response body to twelve seconds,
abort stalled transfers, and discard partial files. Failed batches stop scheduling
additional transfers. Foreground retries run after fifteen seconds, or immediately
when connectivity returns. Readiness is complete local files, never just NetInfo.

## Automated evidence

- `audio-connection-recovery.test.cjs` executes the production downloader, cache,
  and readiness hook with controlled network, filesystem, hook lifecycle and clocks.
  Covers successful bytes, HTTP/empty-body failures, stalled headers/body, abort,
  late completion, four-worker bound, cache deduplication and retry after failure,
  cached offline use, uncached offline pause, weak-signal pause, manual/automatic
  recovery, reconnection, stale-card completion, background/exit cleanup, and
  integration guards against scoring or advancing while required audio is missing.
- Existing offline media checks preserve cached-model ungraded Speak and local
  completion syncing. The obsolete silent cache-miss skip expectation is replaced.
- TypeScript, release integrity (70 lessons, seven units), complete mobile
  interaction verification and the Android production bundle export pass through
  `verify-preview.ps1`. Existing pending human media reviews remain Preview-only
  advisories; none were auto-approved. The new test runs in protected CI too.

## UI and flow evidence

The actual notice and readiness hook were rendered with React Native Web in the
isolated `output/audio-connection-recovery-qa` adapter. Its HTTP fixture first
returns 503, then successful complete bytes; native file storage is substituted
by an in-memory adapter. The production native cache is separately exercised
by the automated filesystem tests above.

- Portrait 393x852 and landscape 800x360 render both controls and the complete
  explanation without scrolling. Landscape and small portrait 360x640 at 1.3
  system text scale also fit; Exit closes the notice without changing answers.
- Offline-to-online recovery closes the notice automatically; the fixture retains
  activity 12 and its three saved answers. Manual Retry also recovers when the
  connectivity signal is still stale/offline.
- Browser page-error check is empty. Server requests confirm failed and successful
  transfers. No speech synthesis or pronunciation service is called by recovery.
- React review checked effect dependencies/cleanup, stale results, bounded parallel
  work, accessible controls and the compact landscape layout.

These checks do not reproduce a physical Android radio, native audio focus or
actual speech playback. The earlier sudden-audio-loss cause is not confirmed;
this change addresses required-audio availability on poor internet, not every
possible native player error.

## Exact Preview phone check

1. Enter Lesson 1.2 on good internet, then lose signal after audio has cached:
   cached prompts and answer confirmations should still play.
2. Enter an uncached activity on poor/no internet: it should explain the pause,
   remain on the same activity, and not award or skip an answer.
3. Restore internet: the activity should begin once its audio is downloaded.
   Also test Reintentar and Salir, portrait/landscape, and large system text.
4. In cached Speak while offline, the separate existing Advertencia must still
   offer Continue/Exit and explicitly ungraded local recording practice.
5. Background and reopen while waiting; ensure no duplicate progression or score.

Production remains outside this change's authorization; pending human media
reviews remain unchanged.
