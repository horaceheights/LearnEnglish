import LessonPlayer from "../../components/LessonPlayer";

const TEST_PROMPTS = [
  ["boy-running", "The boy is running.", "boy_is_running.webp"],
  ["girl-walking", "The girl is walking.", "girl_is_walking.webp"],
  ["boy-reading", "The boy is reading.", "boy_is_reading.webp"],
  ["girl-writing", "The girl is writing.", "girl_is_writing.webp"],
  ["man-swimming", "The man is swimming.", "man_is_swimming.webp"],
  ["woman-standing", "The woman is standing.", "woman_is_standing.webp"],
  ["boy-girl-running", "The boy and the girl are running.", "they_boy_girl_are_running.webp"],
  ["man-woman-reading", "The man and the woman are reading.", "they_man_woman_are_reading.webp"],
  ["he-reading", "He is reading.", "boy_is_reading.webp"],
  ["she-writing", "She is writing.", "girl_is_writing.webp"],
];

const TEST_LESSON = {
  id: "test-pronunciation",
  title: "Pronunciation Test",
  level: "Beginner A1",
  unit_id: "test",
  unit_title: "Pronunciation Testing",
  lesson_id: "test-pronunciation",
  lesson_title: "Pronunciation Testing",
  sub_lesson_id: "test",
  sub_lesson_title: "Pronunciation Test",
  goal: "Tune and verify pronunciation behavior without completing a full lesson.",
  vocabulary: [],
  cards: TEST_PROMPTS.map(([id, prompt, image]) => ({
    prompt,
    stage: "Pronunciation Practice",
    correct_option_id: id,
    options: [
      {
        id,
        image_url: `/lesson-assets/${image}`,
        label: prompt,
      },
    ],
    audio_text: prompt,
    answer_audio_text: null,
    prompt_image_url: "",
  })),
};

export const metadata = {
  title: "Pronunciation Test | SpanGlish",
};

export default async function TestPronunciationPage() {
  return <LessonPlayer lesson={TEST_LESSON} lessons={[]} testMode />;
}
