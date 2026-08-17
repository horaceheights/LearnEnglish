import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.course_audio import cache_path_for, voice_for_variant  # noqa: E402
from app.data import LESSONS  # noqa: E402


ACTION_WORDS = {
    "running",
    "walking",
    "swimming",
    "eating",
    "drinking",
    "reading",
    "writing",
    "sleeping",
    "sitting",
    "standing",
    "playing",
    "working",
    "cooking",
    "talking",
    "studying",
}
FEEDBACK_PHRASES = [
    "Great",
    "Awesome",
    "Yay",
    "Good job",
    "Keep it up",
    "Nice job",
    "Excellent",
    "Try again",
]


def pronunciation_prompt_from_option(option_id: str) -> str:
    parts = str(option_id or "").split("-")
    action = parts[-1]
    has_action = action in ACTION_WORDS
    people = parts[:-1] if has_action else parts

    if len(people) > 1:
        return f"They are {action}." if has_action else "They"

    person = people[0] if people else ""
    if not person:
        return ""

    return f"The {person} is {action}." if has_action else f"The {person}"


def option_practice_prompt(option) -> str:
    return option.label or pronunciation_prompt_from_option(option.id)


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text or "")


def expected_audio_items(lessons=None) -> set[tuple[str, str, str, str]]:
    items: set[tuple[str, str, str, str]] = set()
    lesson_source = LESSONS.values() if lessons is None else lessons
    for lesson in lesson_source:
        for card in lesson.cards:
            if card.stage in {"Pronunciation Practice", "Speak"} or lesson.id == "lesson-3-pronunciation":
                for option in card.options:
                    prompt = option_practice_prompt(option)
                    if not prompt:
                        continue
                    items.add((prompt, "pronunciation_slow", "en-US", "split-ing"))
                    for word in words(prompt):
                        items.add((word, "pronunciation_slow", "en-US", "split-ing"))
                continue

            prompt = card.audio_text if card.audio_text is not None else card.prompt
            if prompt and prompt.strip():
                variant = "question" if prompt.strip().lower() == "what is it?" else "prompt"
                items.add((prompt, "prompt", "en-US", variant))
            if card.answer_audio_text:
                items.add((card.answer_audio_text, "prompt", "en-US", "answer"))

    for phrase in FEEDBACK_PHRASES:
        items.add((phrase, "feedback", "en-US", "feedback"))

    return items


def main(lesson_ids: set[str] | None = None) -> int:
    frontend_cache = ROOT / "frontend" / "public" / "audio-cache"
    manifest_path = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
    model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()
    cache_model = f"openai:{model}"

    if lesson_ids:
        unknown_lessons = sorted(lesson_ids - LESSONS.keys())
        if unknown_lessons:
            print(json.dumps({"error": "Unknown lesson ids.", "lesson_ids": unknown_lessons}, indent=2))
            return 2
        selected_lessons = [LESSONS[lesson_id] for lesson_id in sorted(lesson_ids)]
    else:
        selected_lessons = None

    if manifest_path.exists():
        try:
            existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing_manifest = {}
    else:
        existing_manifest = {}

    manifest: dict[str, str] = dict(existing_manifest) if lesson_ids else {}
    audio_sources: dict[str, Path] = {}
    missing: list[dict[str, str]] = []

    for text, mode, lang, variant in sorted(expected_audio_items(selected_lessons)):
        audio_path = cache_path_for(
            text,
            mode,
            lang,
            variant,
            cache_model,
            voice_for_variant(variant),
            output_format,
        )
        key = "\n".join([text.strip(), mode, lang, variant])
        existing_name = existing_manifest.get(key)
        existing_path = frontend_cache / existing_name if existing_name else None
        if existing_path and existing_path.exists() and existing_path.stat().st_size > 0:
            manifest[key] = existing_name
        elif audio_path.exists() and audio_path.stat().st_size > 0:
            manifest[key] = audio_path.name
            audio_sources[audio_path.name] = audio_path
        else:
            missing.append(
                {
                    "text": text,
                    "mode": mode,
                    "lang": lang,
                    "variant": variant,
                    "expected": audio_path.name,
                }
            )

    # Never replace a known-good static bundle with an incomplete one. This can
    # happen after an audio-profile change before the new cache is generated.
    if not missing:
        frontend_cache.mkdir(parents=True, exist_ok=True)
        for audio_name, audio_path in audio_sources.items():
            destination = frontend_cache / audio_name
            if not destination.exists() or destination.stat().st_size != audio_path.stat().st_size:
                shutil.copy2(audio_path, destination)

        if not lesson_ids:
            referenced_files = set(manifest.values())
            for audio_file in frontend_cache.glob("*.mp3"):
                if audio_file.name not in referenced_files:
                    audio_file.unlink()

        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "scope": sorted(lesson_ids) if lesson_ids else "all-lessons",
                "manifest_entries": len(manifest),
                "static_files": len(list(frontend_cache.glob("*.mp3"))),
                "missing_expected": len(missing),
                "missing": missing,
            },
            indent=2,
        )
    )
    return 1 if missing else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the static course-audio manifest.")
    parser.add_argument(
        "--lesson-id",
        action="append",
        dest="lesson_ids",
        help="Update only this lesson and preserve the rest of the static bundle.",
    )
    arguments = parser.parse_args()
    raise SystemExit(main(set(arguments.lesson_ids) if arguments.lesson_ids else None))
