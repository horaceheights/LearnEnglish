const LESSON_ACTION_VIDEOS: Record<string, string> = {
  boy_is_drinking: 'boy-drinking-scene-v2.mp4',
  boy_is_eating: 'boy-eating-scene-v2.mp4',
  boy_is_reading: 'boy-reading-scene-v2.mp4',
  boy_is_running: 'boy-running-scene-v2.mp4',
  boy_is_sleeping: 'boy-sleeping-scene-v2.mp4',
  boy_is_swimming: 'boy-swimming-scene-v2.mp4',
  boy_is_walking: 'boy-walking-scene-v2.mp4',
  family_brother_studying: 'brother-studying-scene-v2.mp4',
  family_children_playing: 'children-playing-scene-v2.mp4',
  family_mother_cooking: 'mother-cooking-scene-v2.mp4',
  family_parents_talking: 'parents-talking-scene-v2.mp4',
  girl_is_drinking: 'girl-drinking-scene-v2.mp4',
  girl_is_sleeping: 'girl-sleeping-scene-v2.mp4',
  girl_is_walking: 'girl-walking-scene-v2.mp4',
  girl_is_writing: 'girl-writing-scene-v2.mp4',
  man_is_swimming: 'man-swimming-scene-v2.mp4',
  man_is_walking: 'man-walking-scene-v2.mp4',
};

export function lessonActionVideo(imageUrl?: string): string | null {
  const filename = imageUrl?.split('?')[0].split('/').pop()?.replace(/\.[^.]+$/, '');
  return filename ? LESSON_ACTION_VIDEOS[filename] || null : null;
}
