import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from app.course_audio import audio_configured, cache_path_for, get_course_audio  # noqa: E402
from scripts.build_frontend_audio_manifest import expected_audio_items, main as build_manifest  # noqa: E402


async def generate_missing_audio() -> int:
    if not audio_configured():
        print(
            json.dumps(
                {
                    "error": "OpenAI course audio is not configured.",
                    "hint": "Set OPENAI_API_KEY in backend/.env or the shell environment.",
                },
                indent=2,
            )
        )
        return 1

    model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    voice = os.getenv("OPENAI_TTS_VOICE", "coral")
    output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()
    missing = []

    for text, mode, lang, variant in sorted(expected_audio_items()):
        audio_path = cache_path_for(text, mode, lang, variant, model, voice, output_format)
        if not audio_path.exists() or audio_path.stat().st_size <= 0:
            missing.append((text, mode, lang, variant))

    for index, (text, mode, lang, variant) in enumerate(missing, 1):
        await get_course_audio(text, mode, lang, variant)
        print(f"generated {index}/{len(missing)}: {text} [{mode}/{variant}]")

    print(
        json.dumps(
            {
                "expected_audio_items": len(expected_audio_items()),
                "generated": len(missing),
            },
            indent=2,
        )
    )
    return 0


def main() -> int:
    status = asyncio.run(generate_missing_audio())
    if status != 0:
        return status
    return build_manifest()


if __name__ == "__main__":
    raise SystemExit(main())
