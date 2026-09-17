# PR #155 — four photorealistic Use repairs

This is a bounded continuation of the 153 Use prompt-image corrections, not a regeneration of the curriculum. The user compared a single shared-prompt GPT/Gemini benchmark and chose GPT for subsequent stills on cost/adequacy grounds. A single sample does not establish universal provider quality or cost. Healthy Gemini stills remain intact; action videos keep their separate Gemini/Veo workflow.

## New images and observed meaning

| Lesson / card | Target sentence | Pixel inspection |
| --- | --- | --- |
| 5.4 / U7 | I do not like juice. | Woman visibly recoils, raises a refusal palm, and pushes juice away. |
| 5.5 / U7 | He wants three eggs. | Boy gestures toward exactly three separate eggs while looking toward the adult. Reuses the accepted benchmark. |
| 6.8 / U6 | The train arrives at ten at night. | Approaching train, waiting passengers, dark night sky, and a readable 10:00 PM station clock. |
| 7.9 / U3 | There are five green pens. | Exactly five separate green ballpoint pens with visible clips, tips, and click buttons. |

Each full 1536×1024 source was inspected individually. Lossless PNG sources are archived; runtime WebPs retain the entire frame at quality 92, without a crop or stretch. The juice at the right edge is suitable for the full 3:2 prompt, not approved for a 4:5 option crop. All three runtime copies are byte-identical. No old image was deleted or overwritten. Target sentences, choices, lesson order, and spoken content are unchanged.

## Generation and incremental cost

Pinned model: `gpt-image-2.5-sunburst-2026-09-08`, high quality, 1536×1024 PNG. Used the installed imagegen CLI with the existing receipt adapter. Exact prompts and production scope: `docs/product/use-photoreal-repairs-v1.json`. Source checksums, request IDs, token usage, estimated costs, and agent observations: `docs/qa/use-photoreal-repairs-v1.json`.

Three new single-attempt requests total **US$0.12714**, approximately **MX$2.16**, using the recorded planning rate of 16.9707 MXN/USD. The reused boy/eggs benchmark previously cost US$0.042915; it was not charged again. These are usage-based list-price estimates before tax, not billing-invoice reconciliation. No automatic retry, paid audio generation, or Gemini image replacement was performed in this continuation.

## Verification and remaining review

- Local verification passed: all 326 backend tests, complete `mobile/scripts/verify-preview.ps1` (content, reviewed audio, TypeScript, interaction tests, and Android export), frontend production build, and release integrity (70 lessons / seven units). Required GitHub verification and protected Preview publication are separate release steps.
- Regression tests pin the exact four cards, unchanged target sentences, original-image hashes, model settings, source receipts, reused benchmark request, dimensions, and runtime byte parity.
- The media-preservation audit reports 981 protected assets, 84 previously scoped exceptions, and zero errors.
- Audio inventory reports zero missing assets after reusing existing reviewed takes and static seeds; no new voice recording is necessary for an image-only change.
- The temporary Preview waiver for known Use sentence/image contradictions is removed; focused tests enforce failure in both Preview and Production. Missing independent image evidence still warns and must not be counted as semantic approval.
- Human semantic approvals remain pending. Agent inspection is not human approval; this does not authorize Production. The broader 153-card correction is not claimed as a fresh manual pixel review of every card.
- In Preview, inspect the four cards on portrait and landscape phones: all meaningful details visible, five pens/three eggs countable, clock readable, tiles usable, correct existing prompt/answer audio, and normal progression. This installed-device check remains for the user.
