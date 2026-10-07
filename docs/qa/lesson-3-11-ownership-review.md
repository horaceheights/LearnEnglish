# Lesson 3.11 ownership correction

The approved correction makes **our** include the speaker and **their** refer to another owning group. The lesson introduces only those two words, then practises them with familiar cars, houses, books and phones. Possessive apostrophe-s is deferred to A1+.

## Screenshot coverage

| User annotation | Implementation and review |
| --- | --- |
| 1. The house needs a third person pointing at the family. | A separate foreground speaker points toward the family and their house. R2 keeps the image-to-word contrast Our / Their. |
| 2. Show the translation below the Learn word for one second. | L1 shows Nuestro; L2 shows Su (de ellos). An authored 1000 ms preview starts after the picture is loaded and the card is available, then hides without collapsing its space. Manual translation and English replay remain available. |
| 2. The man should point at the car to communicate our. | The speaking owner includes his partner with an arm around her and points to the car; she holds the keys. |
| 3. The Our image pair is ambiguous; change the distractor. | R1 contrasts speaker-included owners with an outside speaker. Sentence practice contrasts the same object from both ownership perspectives, preventing a car-versus-house shortcut. |
| 4. Ana's introduces a separate singular ownership form; save it for A1+. | Remove L3 Ana's and replace the old R3 with This is our car. versus This is their car. All subsequent practice stays on our/their. |
| 5. It is Luis's phone. is the wrong form for this lesson. | R9 now practises They are our phones. against They are their phones. All 40 cards, including Listen, Speak and Use, were audited for the same scope. |

## Content and media

- Two Learn, twelve Recognize, ten Listen, eight Speak and eight Use cards. Existing lesson ID and remaining slide IDs are preserved; content revision becomes 2.
- Eight versioned photographs provide paired our/their perspectives for four familiar objects. They remain in full 3:2 frames with two picture options: the outsider's pointing gesture would be cropped from a four-picture grid.
- All 22 recognition/listening answer banks were inspected. Word alternatives stay words, sentence alternatives stay parallel sentences, and matched object pairs isolate ownership. The four guided completions and four whole-sentence constructions use the same taught words and frames.
- The car and house owner pairs, gestures, keys, two books and two phones were inspected in the generated pixels. Text and arrows are absent. Original photos remain byte-for-byte intact.
- All speaking owners and outside speakers in the new images are adult men; their lines use the existing male character voice. New audio uses ElevenLabs with immutable receipts and existing takes reused where possible.
- Review 3.13 N20 changes to They are their grandchildren. versus our/your, retaining the earlier family word’s required later reuse. U9 changes Diego’s bag to It is his bag. over the existing male owner photo. Mission 3.14 M09 changes the two phone cues to That is her phone. / That is his phone.; its existing picture and target geometry stay intact.

## Shared behavior and checks

`learn_translation_preview_ms` is optional content metadata accepted only for a single-image Learn card with authored Spanish. Both clients use the same timer hook. No lesson ID selects behavior. Only the two 3.11 Learn cards opt in.

The timer waits for image readiness, excludes hidden time, cleans up on navigation, and retains elapsed time during help or background pauses. A new card or a restarted lesson gets a fresh preview. English remains visible throughout. Assessments have no automatic translation.

Automated timer checks cover readiness, 999/1000 ms boundaries, pause/resume, replay/rotation rerenders, navigation and cleanup. Content tests bind the scope, paired media, downstream corrections and plan composition. Normal course, audio, client and protected release checks remain required.

Agent visual review is recorded separately from human semantic approval. Human review of the exact Preview on a physical phone remains pending, including whether gestures are understood immediately, portrait/landscape fit and enlarged text. This record does not approve Production.

## Authoring package

The source is `docs/product/content-briefs/unit-3/3.11-our-their-and-s.json` (historical filename retained). The shared engine composes `docs/product/content-plans/3.11-ownership-v1.plan.json`; no lesson-specific builder is added. `docs/product/lesson-3-11-ownership-images-v1.json` preserves generation prompts, source/runtime hashes and pending human review status. Exact answer-bank, media and voice contracts accompany the canonical content and mobile exports.

Local interactive browser verification was blocked when the browser tool denied access to the local QA page. No alternate browser route was attempted. Timer execution, production native header layout, web regression checks and protected CI provide the available automated evidence; an actual browser/phone interaction review remains pending.

## Local verification on October 7

- Complete mobile Preview preflight passed, including TypeScript, the interaction suite and an Android production bundle export.
- All 23 web regression tests passed. An isolated Next production build importing the actual LessonPlayer and exported 3.11 lesson compiled and prerendered successfully.
- The 572-test backend suite completed after the source archive and voice-pin corrections; its sole remaining inventory failure was checked again after CDN synchronization, when all 13 Cloudflare tests passed.
- Course practice has no new findings. Preservation verified 981 protected assets with no errors. Voice matching, lesson validation and persistent audio validation passed.
- Eight new pictures and the required audio objects were uploaded. The catalog contains all 81 lessons and 6386 immutable audio contracts. Audio generation persisted 14 takes across two bounded batches (107 provider-reported characters); existing approved takes were reused. Two historical receipts were recovered byte-for-byte after confirming identical JSON and audio hashes.
- Protected CI and exact-commit Preview publication are the remaining release gates. Physical-phone and interactive-browser review remain pending as described above.
