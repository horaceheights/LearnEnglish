import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

from app.data import load_course_catalogs


class RegisteredCoursesTests(unittest.TestCase):
    def test_only_registered_courses_load_and_duplicate_or_misplaced_content_fails(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "backend/lessons/first").mkdir(parents=True)
            (root / "backend/lessons/second").mkdir()
            descriptor = {"id": "first", "level": "Beginner", "lessonRoot": "backend/lessons/first"}
            path = root / "backend/courses.json"
            path.write_text(json.dumps([descriptor]), encoding="utf-8")
            lesson = SimpleNamespace(id="lesson", unit_id="unit", level="Beginner")
            with patch("app.data.load_all_lessons", return_value={"lesson": lesson}) as load:
                descriptors, courses = load_course_catalogs(root)
                self.assertEqual(list(courses), ["first"])
                load.assert_called_once_with((root / descriptor["lessonRoot"]).resolve())
                for extra in ({**descriptor}, {**descriptor, "id": "second", "lessonRoot": "backend/lessons/second"}):
                    path.write_text(json.dumps([descriptor, extra]), encoding="utf-8")
                    with self.assertRaises(ValueError):
                        load_course_catalogs(root)
                path.write_text(json.dumps([{**descriptor, "lessonRoot": "../outside"}]), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "inside backend/lessons"):
                    load_course_catalogs(root)
                path.write_text(json.dumps([{**descriptor, "level": "Different"}]), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "mismatched course level"):
                    load_course_catalogs(root)
