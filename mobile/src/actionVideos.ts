export type LessonActionVideo = {
  name: string;
  posterSource?: number;
  source?: number;
};

const LOCAL_ACTION_VIDEOS: Record<string, number> = {
  family_brother_studying: require('../assets/lesson-videos/brother-studying-scene-v3.mp4'),
  family_children_playing: require('../assets/lesson-videos/children-playing-scene-v3.mp4'),
  family_father_working: require('../assets/lesson-videos/father-working-scene-v4.mp4'),
  family_mother_cooking: require('../assets/lesson-videos/mother-cooking-scene-v3.mp4'),
  family_parents_talking: require('../assets/lesson-videos/parents-talking-scene-v5.mp4'),
  girl_is_walking: require('../assets/lesson-videos/girl-walking-scene-v3.mp4'),
};

const LOCAL_TWO_CARD_ACTION_VIDEOS: Record<string, number> = {
  family_brother_studying: require('../assets/lesson-videos/brother-studying-two-card-v1.mp4'),
  family_children_playing: require('../assets/lesson-videos/children-playing-two-card-v1.mp4'),
  family_father_working: require('../assets/lesson-videos/father-working-two-card-v1.mp4'),
};

const TWO_CARD_ACTION_VIDEOS: Record<string, string> = {
  family_brother_studying: 'brother-studying-two-card-v1.mp4',
  family_children_playing: 'children-playing-two-card-v1.mp4',
  family_father_working: 'father-working-two-card-v1.mp4',
};

const TWO_CARD_ACTION_POSTERS: Record<string, number> = {
  boy_is_eating: require('../assets/lesson-assets/boy_is_eating-two-card-poster.webp'),
  boy_is_running: require('../assets/lesson-assets/boy_is_running-two-card-poster.webp'),
  boy_is_swimming: require('../assets/lesson-assets/boy_is_swimming-two-card-poster.webp'),
  family_brother_studying: require('../assets/lesson-assets/family_brother_studying-two-card-poster.webp'),
  family_children_playing: require('../assets/lesson-assets/family_children_playing-two-card-poster.webp'),
  family_children_studying: require('../assets/lesson-assets/family_children_studying-two-card-poster.webp'),
  family_father_working: require('../assets/lesson-assets/family_father_working-two-card-poster.webp'),
  family_mother_cooking: require('../assets/lesson-assets/family_mother_cooking-two-card-poster.webp'),
  family_parents_talking: require('../assets/lesson-assets/family_parents_talking-two-card-poster.webp'),
  girl_is_sleeping: require('../assets/lesson-assets/girl_is_sleeping-two-card-poster.webp'),
  girl_is_walking: require('../assets/lesson-assets/girl_is_walking-two-card-poster.webp'),
  girl_is_writing: require('../assets/lesson-assets/girl_is_writing-two-card-poster.webp'),
  they_boy_girl_are_running: require('../assets/lesson-assets/they_boy_girl_are_running-two-card-poster.webp'),
};

const LESSON_ACTION_VIDEOS: Record<string, string> = {
  boy_is_drinking: 'boy-drinking-scene-v2.mp4',
  boy_is_eating: 'boy-eating-scene-v2.mp4',
  boy_is_reading: 'boy-reading-scene-v2.mp4',
  boy_is_running: 'boy-running-scene-v2.mp4',
  boy_is_sleeping: 'boy-sleeping-scene-v2.mp4',
  boy_is_swimming: 'boy-swimming-scene-v2.mp4',
  boy_is_walking: 'boy-walking-scene-v2.mp4',
  family_brother_studying: 'brother-studying-scene-v3.mp4',
  family_baby_sleeping: 'baby-sleeping-scene-v2.mp4',
  family_adults_playing: 'adults-playing-scene-v2.mp4',
  family_children_playing: 'children-playing-scene-v3.mp4',
  family_children_studying: 'children-studying-scene-v2.mp4',
  family_father_working: 'father-working-scene-v4.mp4',
  family_mother_cooking: 'mother-cooking-scene-v3.mp4',
  family_parents_talking: 'parents-talking-scene-v5.mp4',
  girl_is_drinking: 'girl-drinking-scene-v2.mp4',
  girl_is_sleeping: 'girl-sleeping-scene-v2.mp4',
  girl_is_walking: 'girl-walking-scene-v3.mp4',
  girl_is_writing: 'girl-writing-scene-v2.mp4',
  man_is_swimming: 'man-swimming-scene-v2.mp4',
  man_is_walking: 'man-walking-scene-v2.mp4',
  they_boy_girl_are_running: 'boy-girl-running-scene-v2.mp4',
};

export function lessonActionVideo(imageUrl?: string, optionCount?: number): LessonActionVideo | null {
  const filename = imageUrl?.split('?')[0].split('/').pop()?.replace(/\.[^.]+$/, '');
  const useTwoCardVariant = optionCount === 2;
  const name = filename
    ? (useTwoCardVariant ? TWO_CARD_ACTION_VIDEOS[filename] : null) ?? LESSON_ACTION_VIDEOS[filename]
    : null;
  if (!filename || !name) return null;

  return {
    name,
    posterSource: useTwoCardVariant ? TWO_CARD_ACTION_POSTERS[filename] : undefined,
    source: useTwoCardVariant
      ? LOCAL_TWO_CARD_ACTION_VIDEOS[filename] ?? LOCAL_ACTION_VIDEOS[filename]
      : LOCAL_ACTION_VIDEOS[filename],
  };
}
