import argparse
import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from app.course_audio import audio_configured, cache_path_for, get_course_audio, voice_for_variant  # noqa: E402
from app.data import LESSONS  # noqa: E402
from scripts.build_frontend_audio_manifest import expected_audio_items, main as build_manifest  # noqa: E402


async def generate_missing_audio(lesson_ids: set[str] | None = None) -> int:
    if lesson_ids:
        unknown_lessons = sorted(lesson_ids - LESSONS.keys())
        if unknown_lessons:
            print(json.dumps({"error": "Unknown lesson ids.", "lesson_ids": unknown_lessons}, indent=2))
            return 2
        selected_lessons = [LESSONS[lesson_id] for lesson_id in sorted(lesson_ids)]
    else:
        selected_lessons = None

    items = expected_audio_items(selected_lessons)
    model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()
    cache_model = f"openai:{model}"
    manifest_path = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
    frontend_cache = ROOT / "frontend" / "public" / "audio-cache"
    try:
        static_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        static_manifest = {}
    missing = []

    for text, mode, lang, variant in sorted(items):
        audio_path = cache_path_for(
            text,
            mode,
            lang,
            variant,
            cache_model,
            voice_for_variant(variant),
            output_format,
        )
        if audio_path.exists() and audio_path.stat().st_size > 0:
            continue
        key = "\n".join([text.strip(), mode, lang, variant])
        static_name = static_manifest.get(key)
        static_path = frontend_cache / static_name if static_name else None
        if not static_path or not static_path.exists() or static_path.stat().st_size <= 0:
            missing.append((text, mode, lang, variant))

    if missing and not audio_configured():
        print(
            json.dumps(
                {
                    "error": "OpenAI course audio is not configured.",
                    "hint": "Set OPENAI_API_KEY in backend/.env or the shell environment.",
                    "missing_audio_items": len(missing),
                },
                indent=2,
            )
        )
        return 1

    for index, (text, mode, lang, variant) in enumerate(missing, 1):
        await get_course_audio(text, mode, lang, variant)
        print(f"generated {index}/{len(missing)}: {text} [{mode}/{variant}]")

    print(
        json.dumps(
            {
                "scope": sorted(lesson_ids) if lesson_ids else "all-lessons",
                "expected_audio_items": len(items),
                "generated": len(missing),
            },
            indent=2,
        )
    )
    return 0


def main(lesson_ids: set[str] | None = None) -> int:
    status = asyncio.run(generate_missing_audio(lesson_ids))
    if status != 0:
        return status
    return build_manifest(lesson_ids)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate and bundle cached course audio.")
    parser.add_argument(
        "--lesson-id",
        action="append",
        dest="lesson_ids",
        help="Generate only this lesson and preserve the rest of the static bundle.",
    )
    arguments = parser.parse_args()
    raise SystemExit(main(set(arguments.lesson_ids) if arguments.lesson_ids else None))
