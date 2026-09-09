# Unit 1 Completa rollout

The approved Lesson 1.1 progression now applies to eligible cards in the final
four Use positions of Lessons 1.2–1.9. Earlier cards retain guided completion.
Each construction preserves its existing full English target, scene and voice,
uses one tile per word occurrence with no distractors, and speaks the complete
immutable model on entry and replay. The optional translation is complete.

| Lesson | Full construction | Guided exceptions in final four |
| --- | --- | --- |
| 1.2 | U4–U7 | None |
| 1.3 | U4–U6 | U7: ten words |
| 1.4 | U5, U7 | U4/U6: one word |
| 1.5 | U4–U7 | None |
| 1.6 | U4–U7 | None |
| 1.7 | U4–U7 | None |
| 1.8 | U7–U10 | None; six guided cards preserve the five question/answer pairs |
| 1.9 | U5, U6, U8 | U7: ten words; four earlier guided cards |

There are 28 new construction cards. The accepted bank remains 2–8 words;
repeated words retain separate interchangeable tiles. The complete course stays
70 lessons in seven units of ten. Lesson 1.10 remains unchanged.

Run `node scripts/build_unit_1_lessons.mjs --standard-only` to regenerate this
scope without rewriting the separate mission. Backend scope/audio tests and
shared placement tests cover every converted card. Native Yoga covers whole-word
wrapping, long words with punctuation, target sizes and bounded scroll panes.

For Preview review, enter each listed Completa card through Engine QA. Check
model/replay audio, a partial answer, wrong-order repair, repeated-word swaps,
Undo/Reset and final-card completion. Check 1.8's male visitor question voice and
its separate answer card, and 1.7/1.9's negative targets against their scenes.
Confirm retained guided cards still speak fragments around silent gaps.

Inspect 1.5 U7 and 1.9 U8 at small-phone, portrait/landscape and tablet sizes,
including enlarged text. “grandmother” and “grandparents.” must remain whole in
both the bank and filled slots. When measured words need more width, replay moves
beside the instruction so the construction can use the full panel width; it must
remain reachable without overlapping words. Rotate with words placed and while
dragging; preserve placements, cancel a moving tile and keep the tap path usable.

Browser fixtures exercise the actual web/native components; they do not establish
installed Android audio or touch/rotation coverage. Those checks remain part of
testing the protected Preview on the user's device.

Implementation evidence: all 268 backend tests, 14 web tests, mobile TypeScript, the production web build and seven construction/native Yoga tests passed locally. The actual web/native component fixtures completed the eight-word grandparents card across 20 phone/tablet and enlarged-text cases with whole words, punctuation, bounded sentence panes and working validation. The protected CI still runs the complete release preflight before merge and publication.
