# Larger portrait prompt images

## Request and change

The Lesson 1.1 Recognize screenshot showed a tiny boy image above three oversized
phrase buttons. The shared portrait layout reserved two text lines even when a
short sentence fit on one, leaving the image the 70dp minimum.

The ordinary prompt-image/phrase-choice layout now reserves a 140dp image target
before distributing equal answer rows, using conservative word-aware line demand.
Actual native Text auto-fit, allowed line counts, minimum font sizes, 48dp touch
targets, and the original image/frame/crop remain intact. This is content-shape
based, not keyed to a lesson. Very limited space and lengthy feedback prioritize
readable answers and the complete feedback over the image target.

Image-choice grids, compact completion tiles, pronunciation, mission interactions,
landscape layouts, and existing scroll-safe long-text cards are unchanged. The web
prompt layout already displays a large image; no web change was needed. No lesson,
audio, media, fingerprint, dependency, native configuration, or app-version changes.

## Verification

- TypeScript: passed.
- Full `mobile/scripts/verify-preview.ps1`: passed, including existing interaction,
  content, media, audio, release-integrity checks and Android production export.
- New native Yoga regression: 108 viewport/height/font-scale/feedback combinations;
  equal accessible rows, image reservation and feedback fit. Short-sentence wrapping,
  longer-answer font floor, and scope exclusions also covered. Included in preflight.
- React Native Web adapter rendering the actual `LessonCardView` and media frame:
  144 states across 393x852, 360x800, and 768x1024; representative eligible cards
  from all seven units, normal/1.3 system font scale, initial/wrong/correct states.
  All tested images/buttons remained inside the viewport, rows stayed equal and
  at least 48dp, images decoded, and the browser reported no errors.
- Screenshot-pattern frame at 393x852 grew from approximately 72dp to 165dp high;
  the three answer rows are 52dp with the existing readable font size. At 360x800
  the same card adapts to a 125dp image and 48dp rows; tablet image is 245dp high.
- The browser adapter uses a representative header/safe-area budget, not the full
  native screen, and cannot reproduce native Text font fitting. Yoga/native-style
  tests supplement it; physical phone verification remains the Preview review step.

Local before/after screenshots and the adapter remain in the ignored
`output/larger-prompt-images-qa` directory, not in the mobile bundle.

## Preview review

Open Lesson 1.1 Recognize in portrait and compare the boy image with the reported
screenshot. Try a correct and an incorrect choice, then similar image-to-phrase
cards in other units and a larger system text size. Confirm the picture is useful,
all answers remain readable, and feedback stays visible. Existing genuinely
long-text/short-viewport scroll behavior is intentionally preserved.
