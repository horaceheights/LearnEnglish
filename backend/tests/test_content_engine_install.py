import json
import tempfile
import unittest
from pathlib import Path

from scripts.content_engine.install import InstallRefused, install, lesson_text, source_record
from scripts.content_engine.plan import import_lesson

LESSON = {"id": "lesson-x", "sub_lesson_id": "9.1", "title": "Future lesson", "level": "A1+",
    "unit_id": "unit-9", "unit_title": "Future unit", "lesson_id": "lesson-9", "lesson_title": "New lesson",
    "sub_lesson_title": "Cats", "goal": "Name a cat", "vocabulary": ["cat"], "content_revision": 1, "cards": [
    {"slide_id": "L1", "interaction_type": "teach", "prompt": "A cat", "stage": "Learn",
     "correct_option_id": "cat", "options": [{"id": "cat", "image_url": "cat.webp", "label": "A cat"}],
     "audio_text": "A cat", "answer_audio_text": None, "prompt_image_url": "", "spanish_translation": "Un gato"},
]}


def passes(root):
    return []


class ContentEngineInstallTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.path = self.root / "backend/lessons/unit_9/lesson-9-1.yaml"
        self.path.parent.mkdir(parents=True)
        self.path.write_text(lesson_text(LESSON), encoding="utf-8", newline="\n")

    def plan(self, **changes):
        return {**import_lesson(LESSON), "source": source_record(self.root, self.path), **changes}

    def test_an_unchanged_plan_installs_the_same_bytes(self):
        before = self.path.read_bytes()
        self.assertEqual(install(self.root, [self.plan()], validate=passes),
                         ["backend/lessons/unit_9/lesson-9-1.yaml"])
        self.assertEqual(self.path.read_bytes(), before)

    def test_a_lesson_edited_after_the_plan_was_taken_is_refused(self):
        plan = self.plan()
        self.path.write_text(lesson_text({**LESSON, "title": "edited elsewhere"}), encoding="utf-8")
        with self.assertRaisesRegex(InstallRefused, "changed after this plan was taken"):
            install(self.root, [plan], validate=passes)
        self.assertIn("edited elsewhere", self.path.read_text(encoding="utf-8"))

    def test_draft_plans_are_never_installed(self):
        with self.assertRaisesRegex(InstallRefused, "draft"):
            install(self.root, [self.plan(draft=True)], validate=passes)

    def test_failed_validation_restores_every_file(self):
        before = self.path.read_bytes()
        plan = self.plan()
        plan["cards"][0]["spanish_translation"] = "Un perro"
        new_path = self.root / "backend/lessons/unit_9/lesson-9-2.yaml"
        added = {**import_lesson({**LESSON, "id": "lesson-y"}),
                 "source": {"path": new_path.relative_to(self.root).as_posix(), "sha256": None}}
        with self.assertRaisesRegex(InstallRefused, "restored"):
            install(self.root, [plan, added], validate=lambda root: ["broken"])
        self.assertEqual(self.path.read_bytes(), before)
        self.assertFalse(new_path.exists())

    def test_a_new_lesson_may_not_overwrite_an_unimported_file(self):
        plan = {**import_lesson(LESSON), "source": {"path": source_record(self.root, self.path)["path"], "sha256": None}}
        with self.assertRaisesRegex(InstallRefused, "already exists"):
            install(self.root, [plan], validate=passes)

    def test_install_writes_the_composed_lesson(self):
        plan = self.plan()
        plan["cards"][0]["spanish_translation"] = "Un gatito"
        install(self.root, [plan], validate=passes)
        written = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertEqual(written["cards"][0]["spanish_translation"], "Un gatito")

    def test_tutor_contract_blocks_unsupported_activity_before_writing(self):
        before = self.path.read_bytes()
        lesson = json.loads(json.dumps(LESSON))
        lesson['cards'][0].update(stage='New activity', interaction_type='unsupported')
        plan = {**import_lesson(lesson), 'source': source_record(self.root, self.path)}
        with self.assertRaisesRegex(InstallRefused, 'shared tutor context policy'):
            install(self.root, [plan], validate=passes)
        self.assertEqual(before, self.path.read_bytes())

    def test_installed_future_lesson_uses_runtime_tutor_without_registration(self):
        from backend.app.schemas import Lesson
        from backend.app.tutor_context import build_tutor_context
        install(self.root, [self.plan()], validate=passes)
        lesson = Lesson(**json.loads(self.path.read_text(encoding='utf-8')))
        context = build_tutor_context(lesson, lesson.cards[0])
        self.assertEqual('A1+', context['level'])
        self.assertEqual('A cat', context['visible_model'])
        self.assertEqual('before_answer', context['mode'])


if __name__ == "__main__":
    unittest.main()
