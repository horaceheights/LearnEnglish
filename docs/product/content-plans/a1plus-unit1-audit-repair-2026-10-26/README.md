# A1+ Unit 1 audit repair — review snapshot

This folder preserves the repaired candidate for review and reproducible inspection. It does not install A1+ into the course catalog. `nativeImportReady` remains `false`; image/audio approval and native integration are unfinished.

The [original consolidated audit](http://127.0.0.1:8770/audit-2026-10-24-original-guardrails/consolidated-audit-report.html) remains unchanged. The [local repair review](http://127.0.0.1:8771/repair-review.html) opens the candidate while its local server is running. These are local review addresses, not public deployments. See the [qualified QA results](../../../qa/a1plus-unit1-audit-repair-2026-10-26.md) for V1–V14 and P1–P8.

## Retained material

- `preview-lessons-1-4.json`, `preview-lessons-5-8.json` and `preview-lessons-9-12.json`: exact final authored source arrays.
- `unit-preview-content.json`: exact assembled source, including relative media paths, immutable audio checksums, prepared-delivery receipts and source metadata. Retaining this file makes compiler reproduction independent of the earlier local authoring scripts.
- `source/unit-1-plan-v9.json`: the plan used by the compiler; `repair-content-ledger.json`: before/after changes, retained mission-language coverage and open media findings.
- `preview-authoring-contract.md`: the approved authoring decisions, including separate complete spoken turns and no timed frames.
- `evidence/`: compact automated results and scoped independent/local browser review. `snapshot-manifest.json` records byte hashes of this snapshot separately from the normalized source-content hash.

The source revision is `59639855d9b9ffbe`; its normalized content SHA-256 is `fbba411138f55793f8891245cf979c35ec0bcaa433e25b1298432284bf2e97bb`. The 11 ordinary lessons retain all 416 original card IDs in order. The mission has 13 conversation decisions and four closing written-answer voice gates, for 433 cards across 12 lessons. The original total was 437; the four-card difference comes from absorbing unassessed mission beats into briefing, response and completion metadata, documented in the ledger.

Snapshot text is stored with LF line endings; normalization changes no JSON values or authored wording. Recorded hashes of earlier local review inputs continue to identify those original files, while the manifest hashes the normalized files saved here.

No audio or image binaries are versioned here. The local media root must contain the exact relative image, audio and receipt files referenced by the assembled source. Hash verification fails if a required file is missing or changed; a new recording must not silently replace an existing take.

## Reproduce the inspection package

Run from the repository root with its backend Python dependencies installed. Replace `<MEDIA_ROOT>` with the preserved local candidate media directory and `<OUTPUT_DIR>` with a disposable output directory outside the installed catalog. Forward-slash paths below also work on Windows.

```text
python scripts/compile_lesson_delivery.py --source docs/product/content-plans/a1plus-unit1-audit-repair-2026-10-26/unit-preview-content.json --plan docs/product/content-plans/a1plus-unit1-audit-repair-2026-10-26/source/unit-1-plan-v9.json --asset-root "<MEDIA_ROOT>" --namespace a1plus-unit-1 --level A1+ --output-dir "<OUTPUT_DIR>" --package-name app-bound-unit-1-package.json
python scripts/verify_lesson_delivery.py --source docs/product/content-plans/a1plus-unit1-audit-repair-2026-10-26/unit-preview-content.json --package "<OUTPUT_DIR>/app-bound-unit-1-package.json" --asset-root "<MEDIA_ROOT>"
```

Repeat the compiler command with `--check` to check byte repeatability. The compiler binds the package to the repository's actual schema and consumer file hashes; later code changes require a rebuild and verification. The verifier independently checks source fidelity, canonical projection, exact ordered audio/visual bindings, media hashes and receipt references. A schema-valid inspection projection is not an installation receipt.

The source arrays and assembled source are both frozen here. Editing an array alone does not update the assembled source, its revision, fixtures or evidence. A subsequent authoring change must deliberately refresh and verify those artifacts together.

## Open review and integration work

The two shower images, `08safe` (Ana) and `r09` (Sofia), still show settings rather than the assessed action. Replacement attempts did not produce approved images; V13 remains open. The new school-work image `t28` and other changed candidate images require human semantic and crop review. The neutral mission portrait `m25` removes the earlier shoe-action giveaway, but is also a candidate awaiting approval.

All authored normal recordings and all 124 prepared-pronunciation occurrences are bound to exact local takes. Automated transcription is lexical evidence only: the prepared-audio review retains five Luis/Louise name flags, and natural delivery, voices and prosody need human listening. The package separately reports one missing player-required mission-intro recording and 32 unused backend-derived fallback answer bindings; the latter are not requests to invent extra spoken answers.

Clocks, prepared-delivery provenance, per-turn translations, PNG/SVG offline bundling and the authored reply after construction `1.1-U08` still need shared integration decisions or implementation. Authored instructions and hint strings remain review sidecars; the local preview uses the shared instruction and teaching resolvers. Full native/web parity, human approval, catalog installation and publication are not established by this snapshot.
