# Exact Preview approval and release readiness

Approved standard: 2026-10-06.

The user tests and explicitly approves the exact latest Preview group before
Production promotion. Pending image decisions, old renderer signatures and
crop-review paperwork are visible advisories in both preflights. This supersedes
the old requirement to refresh every image-review record before promotion.
No tool automatically approves or rewrites those records.

Content remains fail-closed: missing/malformed contracts or files, changed image
bytes, canonical/mobile/web mismatch, rejected decisions, ambiguous answers and
runtime teaching-context changes still block. The protected publisher verifies
current remote main, the latest Android/iOS Preview group and its immutable
commit before preflight, again before upload, and after Production publication.

## Readiness inventory

PR/main checks and Preview publication save a GitHub summary and
`release-readiness` artifact. The JSON lists only pending, rejected or
renderer-affected contracts, with complete teaching contexts, option roles,
source/rendered filenames, exact current asset hashes and stored/current
contract/render bindings. It is an informational inventory, not a visual
approval aid or approval recorder. Existing review-aid requirements remain
applicable when formally recording individual image approvals.

A failed earlier workflow check produces a blocked report even if media reviews
alone pass. A successful report says eligible after testing and approving the
exact Preview; it does not grant approval or waive the other release checks.
After OTA publication, the summary shows the verified Group ID and a link to
the Production workflow.

Local read-only report:

```powershell
python scripts/report_release_readiness.py --output-directory "$env:TEMP/spanglish-release-readiness"
```

## Fingerprint scope

Shared media frame, image-selection, layout and viewport dependencies remain
bound to affected lesson profiles. Speak renderers affect Speak model views;
sentence-construction renderers affect prompt views. An ordinary image-choice
review no longer drifts solely because an independent pronunciation or sentence
construction component changed. Course thumbnails keep their own dependencies.
Existing reviewed nonvisual lifecycle exclusions remain fail-closed.

The dependency-map change creates advisory fingerprint drift for existing
records; their signatures and human decisions are deliberately preserved.

## Regression verification

- Renderer tests change pronunciation/construction sources and assert that only
  their dependent profiles change; shared frame, viewport and image-selection
  edits still change every applicable fingerprint.
- Semantic tests accept pending decisions/render drift as visible advisories,
  refuse to hide warnings and reject changed bytes, missing files, rejected
  decisions, changed teaching contexts and malformed roles.
- Readiness tests ensure failures cannot be labelled eligible, preserve all
  review records and display complete current/stored bindings.
- Publisher tests exercise exact and stale Expo group metadata without contacting
  Expo, preserve the local-publication prohibition and require approval,
  protected main, backend readiness and post-publication verification.

Run the backend suite and `npm run verify:production`; protected CI runs the
Preview preflight and readiness report before publication.

Local verification on 2026-10-06 passed: 554 backend tests, the full Production
preflight (including TypeScript, interaction checks, 6,393 immutable audio assets
and Android bundle export), release-integrity verification of the unchanged
81-lesson/seven-unit catalog and the readiness report with zero blockers.
The final readiness-report adjustment also passed its four focused tests.
