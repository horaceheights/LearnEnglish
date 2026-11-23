import unittest
from pydantic import ValidationError
from backend.app.data import LESSONS
from backend.app.schemas import LessonCard


class ReplyImageTimingTests(unittest.TestCase):
    def test_pre_choice_reply_images_require_a_complete_authored_exchange(self):
        card = next(c for c in LESSONS['lesson-5-4-likes-and-dislikes'].cards if c.slide_id == 'R4')
        self.assertEqual('after-prompt', card.reply_image_timing)
        for override in ({'stage':'Listen'}, {'audio_text':''}, {'prompt_image_url':''},
                         {'answer_audio_turns':[]}, {'reply_image_timing':'automatic'},
                         {'audio_turns':[card.answer_audio_turns[0].model_dump()]}):
            with self.subTest(override=override), self.assertRaises(ValidationError):
                LessonCard.model_validate({**card.model_dump(), **override})

    def test_unconfigured_cards_keep_their_existing_serialized_contract(self):
        card = LESSONS['lesson-5-4-likes-and-dislikes'].cards[0]
        self.assertNotIn('reply_image_timing', card.model_dump())

    def test_pre_choice_reply_cannot_reuse_the_statement_image(self):
        card = next(c for c in LESSONS['lesson-5-4-likes-and-dislikes'].cards if c.slide_id == 'R4')
        repeated_image_turn = {
            **card.answer_audio_turns[0].model_dump(),
            'image_url': card.prompt_image_url,
        }
        with self.assertRaisesRegex(ValidationError, 'distinct response image'):
            LessonCard.model_validate({
                **card.model_dump(),
                'answer_audio_turns': [repeated_image_turn],
            })
