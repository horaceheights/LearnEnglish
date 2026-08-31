# Persistent Course Audio

Learner playback is read-only. Render mounts the paid persistent disk at `/var/data/course-audio`, and the backend serves only immutable IDs from `/api/audio/assets/{asset_id}.mp3`. The legacy text-to-speech routes return HTTP 410 and must never be restored as a learner cache-miss fallback.

At service startup, the backend copies any reviewed MP3s already present in the repository's static frontend manifest onto the disk. Existing disk files are never replaced by startup seeding. Render makes a persistent disk available only at runtime, not during build or pre-deploy, so this step belongs in application startup. See [Render persistent disks](https://render.com/docs/disks) and the [Blueprint disk fields](https://render.com/docs/blueprint-spec).

Use the admin inventory with the `X-Admin-Key` header:

`GET /api/admin/audio/assets`

It returns total, available, and missing counts plus each missing asset's exact text, purpose, mode, variant, and canonical image binding. Upload only a reviewed MP3 to its listed ID:

`PUT /api/admin/audio/assets/{asset_id}` with multipart field `file`

The upload is validated, written atomically on the mounted disk, and never calls a speech provider. A Preview release is blocked until `missing` is zero and the reviewed profile version matches the client lesson payload. When replacing a rejected take, increment `CARD_AUDIO_PROFILE_VERSION` before rebuilding the lesson snapshots; overwriting an immutable ID would leave stale client or CDN copies.

Do not publish Preview from a task branch. After inventory coverage is complete, follow the protected `release/preview` GitHub Actions workflow described in the release guardrails.
