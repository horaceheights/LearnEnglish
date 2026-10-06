# Instruction typography correction

The reported Lesson 4.10 Recognize card displayed `¡Escucha y elige!` at learning-phrase size. The shared classifier accepted its legacy English `Listen and choose.` cue only in Listen, even though localization later produced Spanish in Recognize. Instruction weight also preceded the phrase weight, allowing the phrase style to overwrite it. Visual verification missed both problems.

Directions now use shared 14 dp semibold (600) styling in both stages, before and after localization. Instruction copy bypasses vocabulary highlighting and animations. English learning phrases retain their responsive size, weight, native fitting and audio. Image-to-phrase/word directions explicitly say that the choice corresponds to the image; their accessible labels use the same copy. Landscape instructions grow to their actual wrapped height, rather than clipping the longer direction in a fixed 44 dp text box.

The earlier instruction test contained a literal backspace instead of a regular-expression word boundary. It silently failed to detect English instructions. The repaired guardrail checks actual displayed copy and spoken text independently, includes positive instruction fixtures, and permits actual English learning questions.

## Verification

- Shared instruction guards pass for 751 Listen, 363 empty-prompt Recognize and 622 Speak cards across the complete 81-lesson course. The adaptive phrase guard covers 2,284 authored headers.
- All 12 Spanish-header and native Yoga viewport tests pass. New cases render actual Lesson 4.10 R1 and DR1 instructions, both legacy cue forms, portrait 360 x 800, enlarged text at 390 x 844, and landscape 915 x 412. They check compact size, semibold weight and complete fitting. The existing viewport matrix includes narrow 740 x 360 landscape, options, feedback, speaking, construction and rotation.
- The native harness executes production components and shared styles with conservative text metrics; this is automated geometry evidence, not a physical-device screenshot certification.
- No lesson YAML, content plan, generated course, recording identity, media binding or image bytes change in this correction. Dependencies are reused read-only from an existing checkout because the disk could not hold another full dependency tree.
- Concurrent release-readiness changes from PR #242 are reviewed and incorporated from current main. This task preserves those changes and unrelated working trees.

## Media follow-up

The screenshots also identify existing Lesson 4.10 media deficiencies. Asking scenes still need visible clocks, varied locations and appropriate day-period context, with matching close-ups. The gray-wall three-a.m. clock does not provide nighttime context. These assets are not changed or claimed complete by this typography correction. The existing prohibition on image API/services remains in effect.
