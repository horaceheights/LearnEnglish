from pathlib import Path
from typing import Any
import yaml

from .schemas import ChoiceOption, Lesson, LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
LESSON_IMAGE_DIR = ROOT_DIR / "Lessons" / "Lesson1" / "images"
LESSONS_DIR = ROOT_DIR / "backend" / "lessons"


def image_url(name: str) -> str:
    if not name:
        return ""
    if name.startswith("/lesson-assets/"):
        return name
    image_name = Path(name).with_suffix('.webp').name
    if image_name.startswith("they_"):
        cache_version = "?v=20260802-plural-unified-scenes-v1"
    elif image_name in {
        "girl_is_running.webp",
    }:
        cache_version = "?v=20260802-running-girl-proportions-v2"
    elif image_name == "boy_is_reading.webp" or image_name.startswith("man"):
        cache_version = "?v=20260802-boy-man-age-distinction-v1"
    elif image_name == "place_park.webp":
        cache_version = "?v=20260802-kids-playground-park-v1"
    elif image_name.startswith("place_"):
        cache_version = "?v=20260802-uniform-place-frames-v1"
    elif image_name.startswith("object_"):
        cache_version = "?v=20260801-objects-places-v2"
    else:
        cache_version = ""
    return f"/lesson-assets/{image_name}{cache_version}"


def load_lesson_from_file(file_path: Path) -> Lesson:
    with open(file_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if "cards" in data and isinstance(data["cards"], list):
        for card_data in data["cards"]:
            if "prompt_image_url" in card_data and card_data["prompt_image_url"]:
                card_data["prompt_image_url"] = image_url(card_data["prompt_image_url"])
            if "options" in card_data and isinstance(card_data["options"], list):
                for option in card_data["options"]:
                    if "image_url" in option and option["image_url"]:
                        option["image_url"] = image_url(option["image_url"])
                    elif "image" in option and option["image"]:
                        option["image_url"] = image_url(option["image"])

    return Lesson(**data)


def load_all_lessons(lessons_dir: Path = LESSONS_DIR) -> dict[str, Lesson]:
    loaded_lessons: list[Lesson] = []
    if not lessons_dir.exists():
        return {}

    yaml_files = sorted(lessons_dir.rglob("*.yaml"))
    for file_path in yaml_files:
        lesson = load_lesson_from_file(file_path)
        loaded_lessons.append(lesson)

    def lesson_order(lesson: Lesson) -> tuple[int, ...]:
        try:
            return tuple(int(part) for part in lesson.sub_lesson_id.split("."))
        except (AttributeError, ValueError):
            return (999,)

    return {
        lesson.id: lesson
        for lesson in sorted(loaded_lessons, key=lesson_order)
    }


LESSONS = load_all_lessons()
