# Unit 3 possession correction — 2026-10-07

Approved scope: lesson 3.12 and its retrieval in 3.13/3.14; two-second Spanish introductions in every Learn section across all seven units. The existing 81-lesson catalog remains complete.

## Teaching progression

Learn introduces **has / have** through “He has”, “They have”, “She has”, and “We have”, then **mine / yours / ours** through “This is mine”, “This is yours”, and “That is ours”. Only the new vocabulary receives the shared yellow emphasis. Each introduction has an authored Spanish translation.

Recognize and Listen use full statements with pictured objects, including “We have books”, “This car is mine”, “This phone is mine”, “This book is yours”, and “That house is ours”. Speak rehearses those statements and finishes with “Is this phone yours?” / “Yes, this phone is mine.” Use progresses from four guided two-word completions to four complete sentences. The review retains 54 cards; the mission retains 14 beats and five voice gates, retrieving explicit belongings and **ours**.

The plans in `docs/product/content-plans/3.12-possession-v1.plan.json`, `3.13-possession-retrieval-v1.plan.json`, and `3.14-possession-retrieval-v1.plan.json` compose the exact canonical content. The answer-bank review records all 22 changed banks. All pictures are reused; pictured speaker assignments were inspected and recorded in the speaking-voice review.

## Translation behavior

The shared Learn hook now defaults to 2,000 ms for single-image cards with Spanish. All 443 current Learn cards satisfy those conditions, across all seven units. Time starts after the card is ready, pauses behind briefings/help or a background app, and does not restart on replay or rotation. Existing tap-to-translate remains available afterward.

## Audio and verification

The bounded ElevenLabs run created 24 new takes and reported 165 billed characters. It reused compatible recordings and retained superseded immutable bindings. “Mine” is regenerated inside complete phrases with the established character voice; new revisions prevent reuse of the rejected isolated pronunciation. The approved voice/model profile is unchanged.

Automated coverage includes exact plan composition, specific listening sentences, Learn target emphasis, guided-to-complete construction, review/mission retrieval, picture/voice bindings, course-wide translation timing, and construction hints for named-object possession.

Local verification passed: all 581 backend tests; the complete Preview preflight (content/media, voice cast, 6,379 persistent audio contracts, TypeScript, interaction/layout suites, and Android export); release integrity for 81 lessons/seven units; and immutable R2 MP3/receipt verification. The audio catalog is pinned to content snapshot `a5947d2eb6b9a81d66727a769aa1fecebf3b7018`. Existing pending visual-review advisories remain pending.

**Preview listening remains pending.** This environment could not audition the audio. The attempted transcription checks returned a rate limit and insufficient transcription permission; neither produced pronunciation evidence. Check the new **mine** /maɪn/ clips and picture/voice alignment on the exact published Preview before approving Production. No human audio approval or device test is claimed here.
