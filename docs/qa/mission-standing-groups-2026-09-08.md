# Standing-group marker placement

## Scope

User-approved exception: in a standing pair with two individual dots and one
group capsule, move only the capsule between the chests. Keep group-only scenes
and all other markers unchanged. Authored placements: M04 children/adults,
M08 parents, M09 grandparents. No new images, audio, wording or gameplay.

## Verification

- Inspected the exact standing-pair source images and the actual modified mobile
  game component through the React Native Web QA adapter at 430x932 portrait.
- Inspected M04 at 568x320 landscape. All 18 listening scenes passed rendered
  bounds/overlap/image-fit checks at 568x320 and 844x390, 1.3x text and conservative
  24px side/bottom safe areas.
- Completed all six M04 selections through the real component: both capsules and
  all four individuals were accepted; final result correct, no lost progress.
- Shared geometry tests cover portrait, compact landscape, tablet and wide
  viewports: minimum 48dp touch areas, no face/control overlap, unchanged image
  fit, unchanged individual/group-only marker positions, exact reviewed anchors.
- Backend tests reject chest anchors on individuals or group-only targets and
  reject out-of-frame/above-head coordinates. All 62 targeted backend tests pass.
- Web production build passes; web/native use the same byte-identical placement
  helper and both suppress the relocated capsules' long head pointers.

The adapter exercises actual game layout/interaction but substitutes images,
icons and audio adapters; this is not a physical Expo device or audio listening
test. Device review remains the purpose of protected Preview. Existing pending
human media approvals remain pending; no Production approval is implied.
