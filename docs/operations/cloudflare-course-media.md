# Cloudflare course media

Cloudflare R2 bucket `spanglish-media`, delivered through `https://cdn.learnspanglish.app`, is the default for current and future course media. Render runs the API, tracking and pronunciation compute; it no longer hosts course media or seeds a course-audio disk. This migration does not change the 81-lesson catalog, recordings, cast or asset IDs.

## Publish approved content

1. Author and approve content through the existing content engine. Generate genuinely missing audio only through the bounded offline renderer; storage publication never calls a speech provider.
2. Run `python scripts/sync_media_to_r2.py --apply --env-file <existing-operator-env-file>` to upload images, videos, posters, static audio-cache and SFX. Commit `docs/product/media-upload-manifest.json`.
3. Run `python scripts/sync_course_audio_to_r2.py --apply --env-file <existing-operator-env-file>`. It reuses previously published immutable audio by downloading and validating its MP3 and receipt, then installs new reviewed repository takes. A missing recording or conflicting immutable object stops publication. Commit `docs/product/course-audio-upload-manifest.json`.
4. Run `python scripts/verify_cloudflare_media.py`. This downloads and checks every active audio/media object, receipt checksum, MP3 media probe and canonical audio contract. Both protected Preview and Production workflows run this gate too.
5. Integrate through a PR into fresh `main`, deploy the shared backend, then use the protected Preview workflow. Production still requires separate approval of the exact tested Preview.

The publisher reads existing operator credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) from the process or the explicit env file. Credentials never enter clients, receipts, inventories or Git. A new worktree can use the primary checkout's ignored env file without copying secrets. Publication is dry-run unless `--apply` is supplied.

## Keys and validation

The URL trees are `lesson-assets/`, `audio-cache/`, `sfx/`, and `course-audio/elevenlabs-v2/<immutable-asset-id>.mp3`. Each MP3 has its original `.json` receipt beside it. Audio keys are immutable. The committed inventory pins each MP3 and receipt's SHA-256, byte count and single-part S3 ETag. Operator upload validates full MP3/receipt bytes; startup verifies remote receipts and audio ETags/sizes against that pinned inventory; protected release CI independently downloads and validates the complete active inventory.

Web and mobile default directly to the CDN. Bundled offline images and corrections keep their established behavior. The API's older `/api/audio/assets/`, `/api/audio/assets-v2/` and `/lesson-assets/` URLs redirect to Cloudflare for shipped clients. The web host also redirects its legacy media trees, including the Vercel video URLs hardcoded in older Production apps; those files are excluded from new web deployments. Legacy text/completion routes are frozen read-only compatibility routes; they never generate on a miss. Retain these until a separately approved Production migration has reached all active clients.

The unversioned asset route keeps its original v1 recording at `course-audio/<asset-id>.mp3`; the v2 route keeps its ElevenLabs recording at `course-audio/elevenlabs-v2/<asset-id>.mp3`. Those recordings can have the same logical ID and different bytes. Each redirect preserves its own version, and an absent v1 object returns 404 even when v2 exists.

Verification makes at most three read attempts for a transient connection/timeout failure or HTTP 429/500/502/503/504, with 0.5 and 1 second waits. Each attempt revalidates the complete immutable object. A partial media stream starts again with a fresh checksum. Missing objects, checksum/size/ETag errors, invalid receipts and MP3 provenance/media errors fail immediately; exhausted network retries still block readiness and publication. These read retries never upload, overwrite or generate recordings.

## Render migration preservation

The initial transfer preserves the complete Render course-audio disk plus its shipped Production audio cache in `migration-archives/render-course-audio-3a9aea0-20261002.tar.gz`. Archive SHA-256: `e228f20c3d4e0132664e51b82b62f99241f5e5939b800feb1a23d96b5b3080d3`. A scoped temporary upload URL moved this archive without adding R2 credentials to Render. A local operator copy was downloaded, checksum-verified and safely extracted.

Its existing MP3/receipt files are published without modification; the 83 unavailable current clips are filled from already-approved repository takes. No provider generation is needed. Superseded recordings remain preserved. Delete the old Render disk only after verified CDN coverage, backend redirects and protected Preview publication; never delete an unverified sole copy.
