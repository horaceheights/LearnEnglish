# Persistent Course Audio

Learner playback for persistent-audio clients is read-only. Render mounts the paid persistent disk at `/var/data/course-audio`, and verified ElevenLabs clients request only immutable IDs from `/api/audio/assets-v2/{asset_id}.mp3`. They never fall back to a text-to-speech route on a cache miss.

The shared Render backend temporarily retains the legacy course-audio routes solely for the already-shipped Production app. This is a migration compatibility window, not a fallback for Preview: Preview uses immutable assets, while Production continues using its established routes until a separately approved Production release migrates it. Remove the legacy routes only after every active Production client has moved to immutable IDs.

## Canonical bindings and approved takes

Every course-audio asset ID is derived from its canonical lesson and card position, semantic purpose, approved text, playback mode and variant, exact image reference (or stable rendered-card reference for text-only cards), audio profile, speaker role, and per-card revision. Changing any of those fields creates a different immutable ID. Web and mobile request that ID directly, so an audio clip cannot drift from the image/card it was approved for.

The reviewed repository source is `backend/approved-course-audio/`:

- `registry.json` separates logical takes from card bindings.
- `takes/<sha256>.mp3` stores each distinct MP3 by its SHA-256 content hash.
- Multiple card asset IDs may bind to one logical take and reuse the exact bytes only when the pinned voice, spoken text, mode, and variant are compatible. Each card still owns its independent image-bound asset ID and audit record.

The approved A1 cast is conservative:

- Nichalia is the neutral teacher voice for teacher, question, and answer narration.
- Ana always uses Sarah.
- A pictured or otherwise explicitly known man who speaks the authored line uses Liam. Brian remains only in unbound audit history and is never an active A1 route.
- Assign a character voice only when canonical media or authored dialogue establishes the speaker. A person merely shown or described in the third person is not automatically the speaker.
- Object-only, third-person, true narration, and genuinely unknown-speaker cards remain neutral. Every identifiable conversation turn uses its gender-consistent character voice. A multi-speaker exchange is authored and stored as ordered per-speaker turn assets, each bound to the exact image shown for that turn. Web and mobile advance the image only when that turn begins and advance the lesson or open the microphone only after the final turn ends. Never stitch a conversation into one mixed audio file, force the exchange into one voice, or neutralize an identifiable speaker.

Provider voice IDs and exact request settings remain in the versioned audio profile, not in lesson content. Lesson authoring records only the semantic speaker role.

## Runtime seeding and validation

At service startup, the backend validates the exact versioned Preview catalog and idempotently installs reviewed takes onto the persistent disk in a background worker so legacy Production traffic remains available during the first seed. It may also import eligible reviewed legacy-manifest audio for neutral, non-completion assets. Named-character audio and completion prompts may never claim voice-unknown legacy provenance. Existing immutable disk files are never replaced.

The catalog is exported from the exact published Preview commit, rather than from the live Production lesson loader. This keeps Preview's image/audio bindings stable without changing the Production curriculum on the shared backend. Historical superseded registry bindings remain audit history but are not active catalog assets.

The cache-busted `elevenlabs-v2` catalog reuses exact approved ElevenLabs takes first. An explicitly approved operator migration may render each remaining contract once with the pinned ElevenLabs Premium profile and immediately persist the resulting bytes and provider receipt. Learner requests never start generation, and provider-unknown legacy files are never admitted into this catalog.

Each installed MP3 has an immutable JSON receipt beside it. The receipt binds the audio SHA-256 and byte count to the canonical asset ID, profile, semantic and speaker roles, revision, purpose, text, mode, variant, image reference, provider/model/voice settings, stored-media probe, processing history, timestamps, approval, and any available provider request, trace, and character-cost metadata. A missing receipt, undecodable MP3, checksum mismatch, profile mismatch, registry mismatch, or canonical-contract mismatch makes the asset invalid rather than available.

Render makes a persistent disk available only at runtime, not during build or pre-deploy, so seeding belongs in application startup. See [Render persistent disks](https://render.com/docs/disks) and the [Blueprint disk fields](https://render.com/docs/blueprint-spec).

## Inventory and reviewed repository source

Use the admin inventory with the `X-Admin-Key` header:

`GET /api/admin/audio/assets`

It returns separate legacy and `elevenlabs_v2` inventories. Treat any missing, invalid, or provider-error entry in the v2 inventory as a release blocker. Reviewed repository takes enter through the versioned `backend/approved-course-audio/` catalog, registry, and content-addressed MP3 files; migration-generated takes are persisted once with their provider receipts. Learner requests never call a speech provider.

## Bounded offline rendering

`scripts/render_course_audio_assets.py` is operator-only and dry-runs by default. Select exact assets or lessons, `--all-named-speakers`, or `--all-missing-after-reviewed-seed`; inspect the reported asset, unique-take, provider-request, staged-fragment, and estimated-character totals before spending credits. Paid execution requires `--execute`, `--promote`, and a positive `--max-character-cost` ceiling.

The renderer makes one paid attempt per planned request. Paid execution requires `--promote`; discarding a paid response is not an allowed mode. It performs no automatic provider retry and no provider fallback. Each billed direct-provider response is written immediately to the local ignored `.render-staging` request cache before MP3 validation, normalization, stitching, or a later fragment can fail, so the same operator checkout can resume without buying valid exact bytes twice and retains invalid bytes as provider-refund evidence. Staging keys include both the pinned profile model and any deliberate per-fragment model. Completed approved takes and bindings are written after every take. The budget is checked before every unstaged fragment and again against the provider-reported cost before another fragment can be purchased. Receipts preserve the total audited character cost while separately recording the incremental cost newly charged during a resumed run. If a request fails or returns the wrong provider, stop, inspect the staged fragments and partial registry state, and decide explicitly whether another paid attempt is justified. A migration-only configured backend source may be used only while that compatibility path exists; normal future rendering uses the pinned provider profile directly.

A completion whose blank covers the entire spoken line has no learner-visible fragments. Its deterministic silence is encoded locally with zero character cost and no provider request. Different completion contracts retain distinct logical take records even when they reference that same SHA-addressed silent MP3.

## Replacing a rejected take

Never overwrite an installed asset. Increase that card's audio revision (or deliberately introduce a new profile), rebuild canonical and mobile lesson payloads, approve the replacement take, and bind it to the new asset ID. The old binding is superseded. Do not globally delete the old content-addressed MP3 when another approved binding uses the same exact bytes; any later garbage collection must first prove that the blob has no live approved reference.

A Preview release is blocked until the matching backend route and persistent disk are deployed, all 4,794 catalog assets are present, `missing == 0`, `invalid == 0`, provider errors are empty, receipts match the current profile and revisions, and regenerated mobile payloads contain the same IDs as the backend. Do not publish a mobile client that requests `/api/audio/assets-v2/` before this backend gate passes.

Do not publish Preview from a task branch. After inventory coverage is complete, follow the protected `release/preview` GitHub Actions workflow described in the release guardrails.
