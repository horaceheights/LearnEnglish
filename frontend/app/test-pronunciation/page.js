import LessonPlayer from "../../components/LessonPlayer";
import { getLesson } from "../../lib/api";

const PRONUNCIATION_STAGE = "Pronunciation Practice";

export const metadata = {
  title: "Pronunciation Test | SpanGlish",
};

export const dynamic = "force-dynamic";

export default async function TestPronunciationPage() {
  const [peopleLesson, pronounLesson] = await Promise.all([
    getLesson("lesson-1-people-actions"),
    getLesson("lesson-2-pronouns"),
  ]);

  const cards = [
    ...peopleLesson.cards.filter((card) => card.stage === PRONUNCIATION_STAGE),
    ...pronounLesson.cards.filter((card) => card.stage === PRONUNCIATION_STAGE).slice(0, 2),
  ].slice(0, 10);

  const testLesson = {
    ...peopleLesson,
    id: "test-pronunciation",
    title: "Pronunciation Test",
    sub_lesson_id: "test",
    sub_lesson_title: "Pronunciation Test",
    goal: "Tune and verify pronunciation behavior without completing a full lesson.",
    cards,
  };

  return <LessonPlayer lesson={testLesson} lessons={[]} testMode />;
}
