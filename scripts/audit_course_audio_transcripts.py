import argparse
import json
import os
import re
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.course_audio import sanitize_course_audio_text  # noqa: E402
from app.data import LESSONS  # noqa: E402


def normalized_words(text: str) -> list[str]:
    number_words = {
        "0": "zero",
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
        "5": "five",
        "6": "six",
        "7": "seven",
        "8": "eight",
        "9": "nine",
        "10": "ten",
    }
    return [
        number_words.get(token, token)
        for token in re.findall(r"[a-z']+|\d+", text.lower())
    ]


def selected_use_audio(lesson_ids: set[str] | None) -> list[tuple[str, str, str]]:
    selected = []
    seen = set()
    for lesson in LESSONS.values():
        if lesson_ids is not None and lesson.id not in lesson_ids:
            continue
        if lesson_ids is None and lesson.unit_id != "unit-2":
            continue
        for card in lesson.cards:
            if card.stage != "Use":
                continue
            prompt = sanitize_course_audio_text(
                card.audio_text if card.audio_text is not None else card.prompt
            )
            prompt_variant = "question" if prompt.lower() == "what is it?" else "prompt"
            candidates = [(prompt, prompt_variant, f"{lesson.id} Use prompt")]
            if card.answer_audio_text:
                candidates.append(
                    (
                        sanitize_course_audio_text(card.answer_audio_text),
                        "answer",
                        f"{lesson.id} Use answer",
                    )
                )
            for text, variant, source in candidates:
                key = (text, variant)
                if text and key not in seen:
                    seen.add(key)
                    selected.append((text, variant, source))
    return selected


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Transcribe bundled Use-stage audio and reject clips that contain words "
            "outside the intended phrase. Defaults to all Unit 2 lessons."
        )
    )
    parser.add_argument("--lesson-id", action="append", dest="lesson_ids")
    parser.add_argument("--model", default="whisper-1")
    args = parser.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        print(json.dumps({"error": "OPENAI_API_KEY is required for transcript QA."}, indent=2))
        return 2

    requested_lessons = set(args.lesson_ids) if args.lesson_ids else None
    if requested_lessons:
        unknown = requested_lessons - LESSONS.keys()
        if unknown:
            print(json.dumps({"error": "Unknown lesson ids.", "lesson_ids": sorted(unknown)}, indent=2))
            return 2

    manifest_path = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    static_cache = ROOT / "frontend" / "public" / "audio-cache"
    items = selected_use_audio(requested_lessons)

    import httpx

    client = httpx.Client(
        timeout=120.0,
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
    )
    failures = []
    checked = []
    for text, variant, source in items:
        if "_" in text:
            failures.append({"source": source, "expected": text, "error": "literal placeholder"})
            continue
        manifest_key = "\n".join([text, "prompt", "en-US", variant])
        audio_name = manifest.get(manifest_key)
        audio_path = static_cache / audio_name if audio_name else None
        if not audio_path or not audio_path.is_file():
            failures.append({"source": source, "expected": text, "error": "missing static audio"})
            continue
        response = None
        request_error = None
        for attempt in range(1, 4):
            try:
                with audio_path.open("rb") as audio_file:
                    response = client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        data={"model": args.model, "language": "en", "temperature": "0"},
                        files={"file": (audio_path.name, audio_file, "audio/mpeg")},
                    )
                    response.raise_for_status()
                request_error = None
                break
            except (httpx.TimeoutException, httpx.NetworkError) as error:
                request_error = error
                if attempt < 3:
                    time.sleep(attempt)
        if request_error is not None or response is None:
            failures.append(
                {
                    "source": source,
                    "expected": text,
                    "audio": audio_name,
                    "error": "transcription service unavailable after 3 attempts",
                }
            )
            continue
        transcript = str(response.json().get("text", "")).strip()
        expected_words = normalized_words(text)
        transcript_words = normalized_words(transcript)
        record = {
            "source": source,
            "expected": text,
            "transcript": transcript,
            "audio": audio_name,
        }
        checked.append(record)
        if transcript_words != expected_words:
            record["error"] = (
                "unexpected trailing words"
                if transcript_words[: len(expected_words)] == expected_words
                else "transcript mismatch"
            )
            failures.append(record)

    print(
        json.dumps(
            {
                "scope": sorted(requested_lessons) if requested_lessons else "unit-2-use",
                "checked": len(checked),
                "failures": failures,
            },
            indent=2,
        )
    )
    client.close()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
