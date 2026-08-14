const LESSON_ACTION_VIDEOS: Record<string, string> = {
  boy_is_drinking: 'boy-drinking-scene-veo-v1.mp4',
  boy_is_eating: 'boy-eating-scene-veo-v1.mp4',
  boy_is_running: 'boy-running-scene-veo-v1.mp4',
  boy_is_sleeping: 'boy-sleeping-scene-veo-v1.mp4',
  boy_is_swimming: 'boy-swimming-scene-veo-v1.mp4',
  boy_is_walking: 'boy-walking-scene-veo-v1.mp4',
  family_children_playing: 'children-playing-scene-veo-v1.mp4',
  family_parents_talking: 'parents-talking-scene-veo-v1.mp4',
};

export function lessonActionVideo(imageUrl?: string): string | null {
  const filename = imageUrl?.split('?')[0].split('/').pop()?.replace(/\.[^.]+$/, '');
  return filename ? LESSON_ACTION_VIDEOS[filename] || null : null;
}
