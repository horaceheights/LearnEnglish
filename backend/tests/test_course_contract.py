import json
import shutil
import tempfile
import unittest
from pathlib import Path

from backend.app.data import LESSONS_DIR, load_all_lessons
from scripts.course_contract import (
    expected_lesson_count,
    expected_lessons_by_unit,
    is_foundation,
    is_mission,
    is_review,
    release_catalog,
)

ROOT = Path(__file__).resolve().parents[2]


class CourseContractTests(unittest.TestCase):
    def test_counts_come_from_the_release_manifest(self):
        manifest = json.loads((ROOT / "mobile/release-integrity.json").read_text(encoding="utf-8"))["catalog"]
        self.assertEqual(release_catalog(), manifest)
        self.assertEqual(expected_lesson_count(), manifest["lessonCount"])
        self.assertEqual(sum(expected_lessons_by_unit().values()), manifest["lessonCount"])
        self.assertEqual(len(expected_lessons_by_unit()), manifest["unitCount"])

    def test_roles_come_from_lesson_data_not_position(self):
        mission = {"sub_lesson_id": "4.12", "experience_type": "mission", "vocabulary": []}
        review = {"sub_lesson_id": "4.11", "vocabulary": []}
        foundation = {"sub_lesson_id": "4.10", "vocabulary": ["Monday"]}
        self.assertEqual([is_mission(mission), is_review(mission), is_foundation(mission)], [True, False, False])
        self.assertEqual([is_mission(review), is_review(review), is_foundation(review)], [False, True, False])
        self.assertEqual([is_mission(foundation), is_review(foundation), is_foundation(foundation)],
                         [False, False, True])

    def test_another_course_folder_never_leaks_into_the_catalog(self):
        source = next(LESSONS_DIR.glob("unit_2/*.yaml"))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "unit_2").mkdir()
            shutil.copy(source, root / "unit_2" / source.name)
            other = root / "a1_plus" / "unit_2"
            other.mkdir(parents=True)
            data = json.loads(source.read_text(encoding="utf-8"))
            (other / source.name).write_text(json.dumps({**data, "id": "lesson-a1p-other"}), encoding="utf-8")
            loaded = load_all_lessons(root)
        self.assertEqual(list(loaded), [data["id"]])


if __name__ == "__main__":
    unittest.main()
