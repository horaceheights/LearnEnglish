# Lesson 1.1 Completa progression

Use the normal lesson entry and Engine QA, Unit 1 → Lesson 1.1 → Completa.
U1-U3 (cards 36-38) are ordinary completion. U4-U7 (cards 39-42) construct “He is a man.”, “A man. He is a man.”, “She is a woman.”, and “A woman. She is a woman.”, respectively.

- In the last four cards, initially every word is a blank. Hear the complete English model and repeat it with the speaker.
- Exactly four/six word tiles are available. The two “man” or “woman” tiles in each longer phrase are required occurrences and work in either matching slot.
- Drag to any empty slot, drop outside to cancel, and tap tiles to fill the next empty slot. Compact mobile layouts use the tap path with a scrollable picture, bank, and controls.
- Tap placed words to return them; Undo and Reset remain available.
- A partial answer is never graded. A wrong full answer keeps the construction available for repair.
- Correct completion plays feedback and advances; the last card enters the ordinary lesson completion flow. QA Auto OFF holds feedback for inspection.
- Repeat after opening help, restarting, resizing and rotating during a drag. Preserve placed words and cancel the moving tile.
- Inspect small phones, ordinary phones, landscape, both tablet orientations, narrow/wide web, safe areas, and enlarged text. Targets are at least 48dp mobile/44px web. Each word, including “woman” in both the bank and a filled slot with punctuation, stays on one line without clipping or ellipsis; tiles widen to their text and wrap as whole tiles. Recheck the reported Android phone configuration, since a desktop font did not reproduce the original split.
- Confirm the first three Completa items still speak only visible fragments around silent gaps.

Native device audio, touch dragging, and rotation still require testing on the protected Preview release; automated and browser checks do not substitute for that device review.

Implementation verification: the full Preview preflight, targeted backend/audio tests, web tests and production build pass. Browser checks exercised the real web lesson player through short-card advancement and final-card lesson completion, wrong-answer repair, interchangeable repeated words, and immutable audio delivery. The native component was inspected through a React Native Web fixture at phone and tablet sizes; Yoga bounds and shared layout tests cover font scales through 2.0. These fixture checks are distinct from installed-device testing.
