# Direct Completa word correction — 2026-09-17

The shared editor now serves guided `complete2` and full `complete-sentence` cards on mobile and web. Guided scaffold words and punctuation stay fixed. Each option occurrence exists in either a slot or the bank; repeated labels retain separate IDs.

Acceptance checks:

- Reproduce 1.1 U3: place `is` first, return it to the bank, then place `She` and `is` correctly.
- Move a placed word to an empty slot or onto another word to swap. Drop a bank word onto an occupied slot and confirm the displaced word returns to the bank.
- Before grading, returning one word preserves every other placement and Undo restores the entire previous arrangement. After a wrong grade, the later explicit `Reintentar` requirement supersedes immediate editing: preserve the attempt and explanation until the learner presses `Reintentar`.
- Used words disappear, including after taps. One `woman` occurrence does not consume both identical tiles in 1.1 U7. No activity Reset/Reiniciar appears.
- Outside drops, help, rotation and resize cancel movement without changing committed slots. Dragging cannot trigger a lesson page turn. Keyboard arrows/Delete and native screen-reader destination/return actions provide alternatives.
- Check 1.5 U7's eight-word bank at 320/390 px phone portrait, 740x360 landscape, 800x1280 tablet portrait and 1280x800 landscape, with default and 2x text. Whole words, visible drop targets, bounded scrolling and minimum touch sizes remain required. Test bank-to-slot and slot-to-bank gestures with the bank and chosen destination visible.

Verification completed locally:

- Shared occurrence, placement, replacement, swap, return, hole-aware grading, duplicate-word and Undo-snapshot regressions, plus native Yoga layout checks and construction-help checks.
- 43 focused mobile/web tests; 326 backend tests; mobile TypeScript; the production web build; and the complete Preview preflight including the Android export. Course integrity remains 70 lessons in seven units of ten, with the existing fingerprint.
- Real browser pointer and keyboard tests of both actual editor components: tap removal, drag return/replacement/swaps, wrong-answer repair, empty bank, duplicate occurrences, Undo, out-of-bounds release and in-drag rotation. The React Native Web fixture uses the actual mobile gesture component, native text-scale emulation, and the shared media frame; its image and icon adapters are test fixtures.
- The actual web `LessonPlayer` in its existing test mode completed all seven 1.1 Use cards, repaired a deliberately wrong first card, advanced through guided and full construction, and reached the final completion screen with the expected 6/7 first-try score. Local immutable-take/media routes supplied the fixture; missing local legacy feedback files were not treated as proof of device audio coverage.
- 20 longest-bank viewport/text-scale combinations passed. Browser fixture checks do not establish installed Android/iOS touch or audio behavior.

Protected Preview review must still exercise native touch dragging, scrolling, screen-reader actions, enlarged text and rotation on a device. Existing pending media-review advisories remain Preview warnings and are not human approvals.
