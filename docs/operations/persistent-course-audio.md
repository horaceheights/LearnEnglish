# Persistent Course Audio

Learner playback is read-only. Render mounts the paid persistent disk at `/var/data/course-audio`, and the backend serves only immutable IDs from `/api/audio/assets/{asset_id}.mp3`. The legacy text-to-speech routes return HTTP 410 and must never be restored as a learner cache-miss fallback.

## Canonical bindings and approved takes

Every course-audio asset ID is derived from its canonical lesson and card position, semantic purpose, approved text, playback mode and variant, exact image reference (or stable rendered-card reference for text-only cards), audio profile, speaker role, and per-card revision. Changing any of those fields creates a different immutable ID. Web and mobile request that ID directly, so an audio clip cannot drift from the image/card it was approved for.

The reviewed repository source is `backend/approved-course-audio/`:

- `registry.json` separates logical takes from card bindings.
- `takes/<sha256>.mp3` stores each distinct MP3 by its SHA-256 content hash.
- Multiple card asset IDs may bind to one logical take and reuse the exact bytes only when the pinned voice, spoken text, mode, and variant are compatible. Each card still owns its independent image-bound asset ID and audit record.

The approved A1 cast is conservative:

- Nichalia is the neutral teacher voice for teacher, question, and answer narration.
- Ana always uses Sarah.
- A pictured or otherwise explicitly known man who speaks the authored line uses Brian.
- Assign a character voice only when canonical media or authored dialogue establishes the speaker. A person merely shown or described in the third person is not automatically the speaker.
- Object-only, off-screen, mixed-speaker, and ambiguous cards remain neutral. Do not force a single character voice onto dialogue involving more than one speaker; segment and review that dialogue first if character casting is required.

Provider voice IDs and exact request settings remain in the versioned audio profile, not in lesson content. Lesson authoring records only the semantic speaker role.

## Runtime seeding and validation

At service startup, the backend validates the approved registry and idempotently installs reviewed takes onto the persistent disk. It may also import eligible reviewed legacy-manifest audio for neutral, non-completion assets. Named-character audio and completion prompts may never claim voice-unknown legacy provenance. Existing immutable disk files are never replaced.

Each installed MP3 has an immutable JSON receipt beside it. The receipt binds the audio SHA-256 and byte count to the canonical asset ID, profile, semantic and speaker roles, revision, purpose, text, mode, variant, image reference, provider/model/voice settings, stored-media probe, processing history, timestamps, approval, and any available provider request, trace, and character-cost metadata. A missing receipt, undecodable MP3, checksum mismatch, profile mismatch, registry mismatch, or canonical-contract mismatch makes the asset invalid rather than available.

Render makes a persistent disk available only at runtime, not during build or pre-deploy, so seeding belongs in application startup. See [Render persistent disks](https://render.com/docs/disks) and the [Blueprint disk fields](https://render.com/docs/blueprint-spec).

## Inventory and reviewed upload

Use the admin inventory with the `X-Admin-Key` header:

`GET /api/admin/audio/assets`

It returns total, available, missing, and invalid counts plus the canonical contract for unavailable assets. Treat both `missing` and `invalid` as release blockers. Upload only a reviewed, decodable MP3 to its listed ID:

`PUT /api/admin/audio/assets/{asset_id}` with multipart fields `file` and `provenance`, where `provenance` is the JSON object captured from the approved render/import workflow.

The upload decodes and probes the MP3, validates the provenance against the pinned profile, derives canonical receipt fields server-side, and installs the bytes and receipt with create-once semantics. Re-uploading the same approved bytes is idempotent; different bytes or provenance cannot overwrite an existing immutable ID. The endpoint never calls a speech provider.

## Bounded offline rendering

`scripts/render_course_audio_assets.py` is operator-only and dry-runs by default. Select exact assets or lessons, `--all-named-speakers`, or `--all-missing-after-reviewed-seed`; inspect the reported asset, unique-take, provider-request, staged-fragment, and estimated-character totals before spending credits. Paid execution requires `--execute`, `--promote`, and a positive `--max-character-cost` ceiling.

The renderer makes one paid attempt per planned request. Paid execution requires `--promote`; discarding a paid response is not an allowed mode. It performs no automatic provider retry and no provider fallback. Each billed direct-provider response is written immediately to the local ignored `.render-staging` request cache before MP3 validation, normalization, stitching, or a later fragment can fail, so the same operator checkout can resume without buying valid exact bytes twice and retains invalid bytes as provider-refund evidence. Staging keys include both the pinned profile model and any deliberate per-fragment model. Completed approved takes and bindings are written after every take. The budget is checked before every unstaged fragment and again against the provider-reported cost before another fragment can be purchased. Receipts preserve the total audited character cost while separately recording the incremental cost newly charged during a resumed run. If a request fails or returns the wrong provider, stop, inspect the staged fragments and partial registry state, and decide explicitly whether another paid attempt is justified. A migration-only configured backend source may be used only while that compatibility path exists; normal future rendering uses the pinned provider profile directly.

A completion whose blank covers the entire spoken line has no learner-visible fragments. Its deterministic silence is encoded locally with zero character cost and no provider request. Different completion contracts retain distinct logical take records even when they reference that same SHA-addressed silent MP3.

## Replacing a rejected take

Never overwrite an installed asset. Increase that card's audio revision (or deliberately introduce a new profile), rebuild canonical and mobile lesson payloads, approve the replacement take, and bind it to the new asset ID. The old binding is superseded. Do not globally delete the old content-addressed MP3 when another approved binding uses the same exact bytes; any later garbage collection must first prove that the blob has no live approved reference.

A Preview release is blocked until the complete canonical inventory reports `missing == 0` and `invalid == 0`, registry validation has no errors, receipts match the current profile and revisions, and regenerated mobile payloads contain the same IDs as the backend.

Do not publish Preview from a task branch. After inventory coverage is complete, follow the protected `release/preview` GitHub Actions workflow described in the release guardrails.
