# Cloudflare default migration verification

The 2026-10-02 migration preserves the current 81 lessons, catalog SHA-256 `7708bf07cfa2aa9cc9f114ecce456a7ff3f71b5e49012d84ae8eecdff2f0c6da`, and all 6,337 current immutable audio IDs. No audio provider was called.

- The complete Render disk and shipped Production cache were archived into R2, downloaded locally and checked against SHA-256 `e228f20c3d4e0132664e51b82b62f99241f5e5939b800feb1a23d96b5b3080d3` (672,789,837 bytes, 62,994 archive members).
- The publisher validated all current MP3/receipt pairs. It installed 83 missing recordings from already-approved repository takes, then preserved 63,151 immutable audio, receipt and compatibility-cache objects in R2. Existing immutable ownership and historical bytes were retained.
- Full public-CDN verification downloaded all 6,337 active MP3s and receipts, checked their checksums, sizes, media probes, canonical image/card contracts and provider provenance, and checked all 2,742 course media files. Results: zero missing, invalid or errored audio; zero media errors.
- Browser-origin audio access returned `Access-Control-Allow-Origin: *`. Range playback returned HTTP 206 and the expected byte range.
- The optimized web production server returned HTTP 307 for an installed client's legacy video URL, retained its `?v=` parameter and redirected to Cloudflare. Following the redirect with a byte-range request returned HTTP 206 and the exact requested 32 bytes.
- Compatibility verification distinguishes v1 and v2 recordings with the same logical ID. The archive contains 2,474 such pairs with different checksums; each versioned API route must redirect to its own original object, and a missing v1 object cannot borrow a v2 recording.
- Mobile Preview verification, all interaction/release guards and Android bundle export passed. The web's 20 tests and optimized production build passed. All 478 backend tests passed, followed by three publisher recovery tests covering interrupted receipts, changed remote bytes and preservation of an existing pair. Verification includes the Cloudflare receipt, altered-object, read-only legacy-miss and protected-release gates.
- The editable Unit 4 review now uses Cloudflare for all 748 picture references and 692 audio references. Existing proposal text and saved-edit import behavior are retained.

Render's former asset/image endpoints redirect to Cloudflare. Backend startup only verifies remote storage; it never copies audio onto a disk or invokes provider generation. The Blueprint contains no course-media disk. Runtime readiness and both protected mobile publication workflows enforce the Cloudflare origin and exact versioned inventory.

Protected Preview publication and physical Render disk removal follow PR integration and verification. Production promotion remains a separate, explicitly approved release.
