# Reconoce content-preserving repair — 2026-10-07

The user requested Lesson 1.1's existing native interactions with each lesson's own content. The response-only rewrite in PR #247 removed assessed questions from 3.3 and 4.8, then added a question to 3.3 Listen A2 to compensate. This candidate reverses those content changes. It does not change either player or introduce a layout.

Initial base: `9fd3a622780019fdf764b1797621e7ba4998f0e7` (including the unrelated 3.11 ownership work). Refreshed `origin/main` `e5a043ff` was integrated at `0438fea1`, preserving its launch-bundle asset-count safeguard. Original question/reply targets and the original 3.3 Listen content are compared with `1d6a51df3a346f1fa796b29e4fd967b6cd916b05`.

## Exact correction

| Lesson | Restored separate question → reply targets | Format |
|---|---|---|
| 3.3 | What are you doing? → I am reading. | Written question and photo choices; then one photo and written replies. |
| 3.3 | What is she doing? → She is cooking. | Same existing Lesson 1.1 templates. |
| 3.3 | What is he doing? → He is sleeping. | Same existing Lesson 1.1 templates. |
| 3.3 | What are they doing? → They are running. | Same existing Lesson 1.1 templates. |
| 4.8 | Do you work? → Yes, I do. | A topic-specific asking scene with explicit reply gesture; then the same photo with reply choices. |
| 4.8 | Do you study? → No, I do not. | Same templates and continuity. |
| 4.8 | Do you play in the park? → Yes, I do. | Same templates and continuity. |
| 4.8 | Do you study in the park? → No, I do not. | Same templates and continuity. |
| 4.11 | Do you clean the table? → Yes, I do. | Separate question card before the original reply. |
| 4.11 | Do you wash your clothes? → No, I do not. | Separate question card before the original reply. |
| 4.11 | What day is it today? → Today is Monday. / Today is Thursday. | Calendar-versus-clock question, followed by existing marked-calendar reply cards. |

3.3 keeps its eight Reconoce cards and 40-card lesson. All 32 cards outside Reconoce match the original pre-repair lesson, including the restored single-reply Listen A2. 4.8 keeps all original target IDs, its eight Reconoce cards and 42-card lesson. 4.11 retains every original card and adds R7Q, R8Q and R9Q immediately before the corresponding replies, giving 57 cards. The existing valid 4.10 R1 and 5.3 R9 modality corrections remain intact.

The 3.3 images are not Lesson 1.1's boy/girl/man/woman identity portraits. The reused action images already belonged to 3.3 before this task; several originally appeared in other Unit 1 action lessons. Three new question images explicitly show the asker, addressee and separate person or group being discussed. Six new Unit 4 images establish the question's topic and an explicit yes/no reply. The shared `Lessons/Lesson1/images` directory is an asset location, not the lesson assignment.

## Media and audio provenance

Nine photos were generated with the selected OpenAI built-in image tool, one call per photo, without retries. Full-size images were inspected for action, people, speaker roles, reply gesture and framing. Source PNGs and separate versioned WebPs are preserved; original media bytes remain unchanged. See [3.3 image provenance](../product/recognize33-repair-images-v2.json), [Unit 4 image provenance](../product/recognize-unit4-question-repair-v2.json), and [Unit 4 card review](reconoce-unit4-question-repair-2026-10-07.md).

Audio reused 87 approved takes. Only the three missing 3.3 third-person questions required new ElevenLabs recordings, with the existing Liam male-character profile. The bounded run had a 55-character ceiling; the provider reported 24 newly billed characters. Three MP3s and their receipts were persisted, 107 bindings were added, and every pre-existing binding and recording byte was preserved. The local catalog has 6,380 assets across all 81 lessons. Nine candidate photos have been staged as new immutable CDN keys; all 2,822 existing media descriptors remain unchanged and each new file was downloaded to verify its exact hash and size. Audio staging added 109 new MP3/receipt pairs (218 objects) and preserved all 64,553 historical object descriptors. Every new pair passed remote hash/size checks, canonical receipt validation and MP3 probing. All 6,380 local pairs and 12,760 remote immutable HEAD checks agree. Neither the shared backend nor either Expo channel has been changed.

## Evidence and current limits

- Focused preservation tests pin the original question/reply sequence and all 32 unrelated 3.3 cards. They reject both the response-only rewrite and its Listen A2 compensation.
- Active content plans reproduce the three corrected canonical lessons. Mobile exports contain the same corrected cards; all 81 lessons and seven units remain present.
- Picture/voice inspection records identify each pictured speaker. Answer-bank exceptions preserve the original subject while contrasting actions; they do not relax the whole-course contract.
- Practice audit passes against its existing baseline: 91 known findings, none new. Pending human media-review records remain pending.
- Local audio catalog validation passes for all 6,380 assets. The catalog is pinned to content commit `0438fea125824ffe8a5f31b28bd6ccdc25fe5602`; all seven compatibility tests pass against that committed content.
- Independent review passed 43 preservation/cast/bank/voice tests and confirmed exact source/runtime hashes for all nine new photos.
- All 17 focused production-TSX/Yoga header and viewport tests pass, covering portrait, landscape, enlarged text, retries and feedback. The complete mobile interaction script, TypeScript, 23 web regressions and 19 release-authority tests also pass.
- Android export succeeds: 990 media assets plus its launch bundle, 991 total, below the 1,000-asset limit. Versioned release integrity passes with all 81 lessons and seven units.
- The complete backend run executed 576 tests; focused reruns resolved all four initial integration failures after updating the exact authored count/cast pins, pinning the catalog and synchronizing the inventory. All 13 Cloudflare tests pass. Protected PR CI will rerun the complete candidate.
- Two restored 3.3 Listen A2 audio IDs already existed in remote history; their original receipts were recovered and verified byte-for-byte. The apparent conflict was Windows versus LF serialization of otherwise identical JSON, not different speech or a provider change. Existing immutable objects were not overwritten.
- Actual native-screen evidence remains blocked: an earlier emulator ADB connection was unauthorized, and the subsequent UI screen-capture call hung without returning an image. No permission dialog was observed and no native screenshot was obtained. The task-created emulator was closed gracefully; the saved AVD was preserved. These automated component/layout results are not an installed-phone check.

No publication or human semantic approval is claimed by this record. Show the concrete native result for review before another publication.
