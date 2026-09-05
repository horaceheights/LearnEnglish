from __future__ import annotations

from array import array
import hashlib
import json
import math
from pathlib import Path

import av


ROOT_DIR = Path(__file__).resolve().parents[1]
MOBILE_SFX_DIR = ROOT_DIR / "mobile" / "assets" / "sfx"
WEB_SFX_DIR = ROOT_DIR / "frontend" / "public" / "sfx"
MANIFEST_PATH = ROOT_DIR / "docs" / "product" / "static-sfx-manifest.json"
EXPECTED_SFX = (
    "mission-finale-v1.mp3",
    "page-restored-v1.mp3",
    "page-turn-v1.mp3",
    "ready-cue-v2.mp3",
    "tile-place-v1.mp3",
    "try-again-v1.mp3",
    "voice-stamp-v1.mp3",
)
LEGACY_MOBILE_SFX = (
    "ready-cue.wav",
    "success-chime.wav",
    "try-again.wav",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audio_metrics(path: Path) -> tuple[float, float, float]:
    decoded_samples = array("h")
    frame_samples = 0
    sample_rate = 48_000
    resampler = av.AudioResampler(format="s16", layout="mono", rate=sample_rate)

    def append_frame(frame: av.AudioFrame) -> None:
        nonlocal frame_samples
        frame_samples += frame.samples
        decoded_samples.frombytes(bytes(frame.planes[0])[: frame.samples * 2])

    with av.open(str(path)) as container:
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                append_frame(converted)
        for converted in resampler.resample(None):
            append_frame(converted)

    if not decoded_samples or not sample_rate or not frame_samples:
        raise AssertionError(f"{path.name}: no decoded audio samples")

    duration_seconds = frame_samples / sample_rate
    peak = max(abs(sample) for sample in decoded_samples) / 32_768
    rms = math.sqrt(
        sum(sample * sample for sample in decoded_samples) / len(decoded_samples)
    ) / 32_768
    peak_dbfs = 20 * math.log10(max(peak, 1e-12))
    rms_dbfs = 20 * math.log10(max(rms, 1e-12))
    return duration_seconds, peak_dbfs, rms_dbfs


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest_assets = {asset["file"]: asset for asset in manifest["assets"]}
    if set(manifest_assets) != set(EXPECTED_SFX):
        raise AssertionError("Static SFX manifest and required asset inventory differ")

    hashes: set[str] = set()
    for filename in EXPECTED_SFX:
        mobile_path = MOBILE_SFX_DIR / filename
        web_path = WEB_SFX_DIR / filename
        if not mobile_path.is_file() or not web_path.is_file():
            raise AssertionError(f"Missing static SFX copy: {filename}")

        mobile_hash = sha256(mobile_path)
        if mobile_hash != sha256(web_path):
            raise AssertionError(f"Mobile/web SFX bytes differ: {filename}")
        if mobile_hash in hashes:
            raise AssertionError(f"Two semantic cues contain identical audio: {filename}")
        hashes.add(mobile_hash)
        manifest_asset = manifest_assets[filename]
        if manifest_asset["sha256"] != mobile_hash:
            raise AssertionError(f"{filename}: checksum differs from its production manifest")

        byte_count = mobile_path.stat().st_size
        if not 5_000 <= byte_count <= 250_000:
            raise AssertionError(f"{filename}: unexpected byte count {byte_count}")

        duration, peak_dbfs, rms_dbfs = audio_metrics(mobile_path)
        if not 1.8 <= duration <= 2.2:
            raise AssertionError(f"{filename}: expected a compact 2-second source, got {duration:.3f}s")
        if not -30 <= peak_dbfs <= 0.5:
            raise AssertionError(f"{filename}: implausible peak level {peak_dbfs:.1f} dBFS")
        if not -60 <= rms_dbfs <= -3:
            raise AssertionError(f"{filename}: implausible RMS level {rms_dbfs:.1f} dBFS")
        if abs(peak_dbfs - manifest_asset["peak_dbfs"]) > 0.2:
            raise AssertionError(f"{filename}: peak level differs from its reviewed manifest")
        if abs(rms_dbfs - manifest_asset["rms_dbfs"]) > 0.2:
            raise AssertionError(f"{filename}: RMS level differs from its reviewed manifest")

        print(
            f"{filename}: {duration:.3f}s, peak {peak_dbfs:.1f} dBFS, "
            f"RMS {rms_dbfs:.1f} dBFS, sha256 {mobile_hash[:12]}"
        )

    for filename in LEGACY_MOBILE_SFX:
        if (ROOT_DIR / "mobile" / "assets" / filename).exists():
            raise AssertionError(f"Obsolete synthesized SFX is still shipped: {filename}")

    print(f"Static SFX validation passed for {len(EXPECTED_SFX)} distinct ElevenLabs cues.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
