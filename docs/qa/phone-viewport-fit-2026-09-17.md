# Phone viewport fit — 2026-09-17

The first and third user screenshots show portrait image grids extending beneath Android navigation, including hidden success text. The second shows a landscape phone retaining the stacked desktop-like lesson chrome and scrolling before the answers are visible.

## Cause and correction

The old four-image grid was sized from percentage width and 4:5 media aspect, bypassing the height budget already calculated by the card. Existing source-pattern tests preserved that percentage but never proved the resulting geometry. The old compact-header condition also excluded landscape phones wider than 760dp, and text-answer/accessibility branches explicitly opted into scrolling.

The shared grid now fits its container and equal tiles to measured remaining width/height, reserving complete feedback before media sizing. Portrait keeps its 2x2 4:5 arrangement. Image-bank Help opens in the existing options sheet instead of consuming grid height. Standard phone landscape uses a navigation/context/prompt rail and a separate activity column; images, choices, constructions and ordinary pronunciation rearrange within that space. Existing dedicated mission layouts remain in use. No curriculum, assets, scoring or audio lifecycle changes are intended.

## Automated evidence

- `lesson-viewport-native.test.mjs` executes the production card, construction, pronunciation, media-frame and rail components with native Yoga defaults and their `onLayout` updates. The surrounding safe-area/header fixture uses production screen styles, representative QA/header dimensions and source guards for actual screen routing.
- The two portrait examples run at 360x740, 390x844 and 412x915, font scales 1, 1.3 and 2, with initial/correct/wrong states and Help open/closed. The activity remains behind the separate Help sheet without resizing. Assertions check both rows, all feedback, minimum button size and every rendered box against system insets.
- All 70 generated lessons contribute 1,515 unique standard activity content shapes. At 740x360 and 915x412 and three font scales, 15,474 initial/wrong scenarios check complete content, stable measurements and absence of activity scroll surfaces.
- Fourteen longest ordinary Speak prompts cover model, ready, recording, grading, retry, success and unavailable-service presentations at three font settings (294 scenarios). Existing dedicated mission tests continue to cover mission scenes and voice gates.
- Rotation retains the owned pronunciation audio player and partially placed construction answers in the native fixture. A mutation restoring the previous percentage-width grid must fail the portrait visibility check.
- The new suite is mandatory in `verify-interaction-paths.ps1`. Renderer signatures include the new rail and layout helper, so previous human visual approvals do not silently carry over to changed framing.

These are layout and regression checks, not proof of Android font rendering or live microphone behavior. Audio/network/effects are inert in the Yoga harness; text widths are conservative estimates. Backend verification passed all 326 tests. Full Preview preflight also checks existing interactions, TypeScript, release content/media/audio and the production Android bundle.

## Installed-device review — pending

No authorized Android debug device was available. The installed emulator reported an unauthorized ADB connection and was stopped; it is not counted as visual verification. Review the exact CI Preview commit on the user's phone, including all three reported screens, long phrase choices, full and partial construction retry, Speak recording/recovery, rotation, enlarged text and both Android navigation orientations. Verify the entire bottom feedback and image borders, replay/navigation controls, readable image subjects and absence of activity scrolling. Human crop/media approvals remain pending under the normal Preview policy.
