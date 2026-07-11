import json
import os
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.course_audio import cache_path_for  # noqa: E402
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


def expected_audio_items() -> set[tuple[str, str, str, str]]:
    items: set[tuple[str, str, str, str]] = set()
    for lesson in LESSONS.values():
        for card in lesson.cards:
            if card.stage == "Pronunciation Practice" or lesson.id == "lesson-3-pronunciation":
                for option in card.options:
                    prompt = option_practice_prompt(option)
                    if not prompt:
                        continue
                    items.add((prompt, "pronunciation_slow", "en-US", "split-ing"))
                    for word in words(prompt):
                        items.add((word, "pronunciation_slow", "en-US", "split-ing"))
                continue

            prompt = card.audio_text or card.prompt
            if prompt:
                items.add((prompt, "prompt", "en-US", "prompt"))

    for phrase in FEEDBACK_PHRASES:
        items.add((phrase, "feedback", "en-US", "feedback"))

    return items


def main() -> int:
    frontend_cache = ROOT / "frontend" / "public" / "audio-cache"
    manifest_path = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
    model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    voice = os.getenv("OPENAI_TTS_VOICE", "coral")
    output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()

    frontend_cache.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    missing: list[dict[str, str]] = []

    for text, mode, lang, variant in sorted(expected_audio_items()):
        audio_path = cache_path_for(text, mode, lang, variant, model, voice, output_format)
        key = "\n".join([text.strip(), mode, lang, variant])
        if audio_path.exists() and audio_path.stat().st_size > 0:
            destination = frontend_cache / audio_path.name
            if not destination.exists() or destination.stat().st_size != audio_path.stat().st_size:
                shutil.copy2(audio_path, destination)
            manifest[key] = audio_path.name
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

    referenced_files = set(manifest.values())
    for audio_file in frontend_cache.glob("*.mp3"):
        if audio_file.name not in referenced_files:
            audio_file.unlink()

    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
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
    raise SystemExit(main())
