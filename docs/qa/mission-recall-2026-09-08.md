# Mission 1.10 — recall camera cuts, audio variety and phone layout

Scope: M12 seated-boy correction; fourteen noun-based action cues; four question-only speaking gates with new visitor-pointing shots; graded-text containment; native phone-landscape instruction collapse. No other lesson content, target anchors, cue shuffling, grading thresholds or standard Speak imitation changed.

## Evidence

- Native Yoga reproduces the shipped inherited `flex:1` instruction collapse; explicit `flex:0` fixes it. Automated regression includes 130% text and four-line feedback.
- Actual native mission presentation components, with a browser RN adapter and deterministic recording states: all four gates × seven phases × two font scales passed at 393×852, 740×360 and 568×320. Safe-area padding is reserved. The engine state is simulated, not a device microphone test; the portrait header is represented by reserved space.
- All eighteen listening scenes passed the landscape adapter bounds/overlap checks at 740×360 with 130% text and 48dp controls.
- Native result layout also runs against real Yoga with two-line answers and feedback at both text scales.
- Web presentation checks use the actual component and scoped-CSS compiler, with a plain image adapter and simulated speech phases. Answer text is absent before grading; the source image changes between question and response.
- TypeScript, mission curriculum/interaction contracts, audio binding tests and frontend tests run separately from visual checks. Full release preflight and protected CI remain mandatory before publication.

## Images and sound

Four new question shots use the built-in image generator. Exact prompts, generation provenance and image hashes are in [mission-recall-image-generation.json](mission-recall-image-generation.json); identity/outfit/location continuity was inspected against the existing closer guest images. This is agent-assisted review, not human semantic approval.

Seventeen new immutable ElevenLabs takes supply eighteen image-bound assets: fourteen action phrases plus three distinct `Who` questions (the plural question has two scene bindings). One paid request per take, no retries; the render had a 400-character ceiling and a 361-character audited upper bound, not a provider-reported invoice total. Historical takes and receipts are preserved.

Each take was decoded and submitted once to the existing pronunciation assessment endpoint without learner identity. All seventeen recognized texts matched the authored phrase exactly. Sixteen passed its A1 learner rubric. `The grandfather is drinking.` was recognized exactly (confidence 0.9856) but flagged at word/phoneme level (sound accuracy 73.6, completeness 50, no missing words). This is a listening-review flag, not evidence that words were omitted. No grading thresholds were relaxed and no automatic paid replacement was purchased. Provider recognition is not a substitute for subjective listening.

## Required Preview device acceptance

On the exact published commit, check Android portrait and landscape including rotation mid-question, real microphone permission/recording/retry, and post-grade progression. Confirm the question ends before the closer shot/recording cue, no answer plays upfront, the answer and one feedback message fit after grading, and all replay/navigation controls remain accessible. Listen especially to the flagged grandfather/drinking cue. Human media decisions remain pending; this work does not authorize Production.
