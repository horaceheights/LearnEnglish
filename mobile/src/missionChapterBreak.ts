import { isMissionLesson } from './missionExperience';
import type { Lesson } from './types';

// The mission is authored as five acts, but finishing one has never looked like
// anything: the act pip ticks over in the header and the next clue starts. This
// derives the beat where an act closes so the surface can mark it. Missions stay
// out of the stage briefing on purpose, since that screen asks for a tap and the
// mission is meant to run continuously, so this moment plays and passes instead.

export type MissionChapterBreak = {
  actCount: number;
  actNumber: number;
  doneTitle: string;
  nextObjective: string;
  nextTitle: string;
};

export function missionChapterBreakForAdvance(
  lesson: Lesson | null | undefined,
  fromIndex: number,
  toIndex: number,
): MissionChapterBreak | null {
  if (!isMissionLesson(lesson)) return null;

  // Only a step onto the very next beat is an act ending. Resuming a saved run
  // or jumping through the section picker lands mid-mission without having just
  // finished anything, and replaying the moment there would be a lie.
  if (toIndex !== fromIndex + 1) return null;

  const doneCard = lesson.cards[fromIndex];
  const nextCard = lesson.cards[toIndex];
  if (!doneCard || !nextCard) return null;
  if (doneCard.mission_chapter_id === nextCard.mission_chapter_id) return null;

  const chapters = lesson.mission.chapters;
  const doneIndex = chapters.findIndex((chapter) => chapter.id === doneCard.mission_chapter_id);
  const nextIndex = chapters.findIndex((chapter) => chapter.id === nextCard.mission_chapter_id);
  if (doneIndex < 0 || nextIndex < 0) return null;
  // Going backwards is navigation, not progress.
  if (nextIndex <= doneIndex) return null;

  return {
    actCount: chapters.length,
    actNumber: doneIndex + 1,
    doneTitle: chapters[doneIndex].title,
    nextObjective: chapters[nextIndex].objective,
    nextTitle: chapters[nextIndex].title,
  };
}
