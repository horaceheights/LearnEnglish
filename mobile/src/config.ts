export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
// Identifies this app to the backend so a stranger's script can't call
// the API directly. It is not a per-user secret -- it ships inside the
// compiled app like any client-embedded key -- but it stops opportunistic
// abuse of the paid speech/audio endpoints and of learner data endpoints.
export const APP_API_KEY = 'Lka_Ecgoda6om-OagWcyG0AK-zrmiD1c';
export const VIDEO_BASE_URL = 'https://learn-english-orcin.vercel.app';
export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy`;
export const ACCOUNT_DELETION_URL = `${API_BASE_URL}/delete-account`;
export const FIRST_LESSON_ID = 'lesson-1-people-actions';
export type CourseAudioProvider = 'persistent-asset';
export type CourseAudioVoice = `asset:${string}`;

export function absoluteMediaUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

const LESSON_VIDEO_CACHE_VERSION = '20260903-full-bleed-v8';

export function lessonVideoUrl(name: string): string {
  return `${VIDEO_BASE_URL}/lesson-assets/${encodeURIComponent(name)}?v=${LESSON_VIDEO_CACHE_VERSION}`;
}

export function hasVisualAudioPlaceholder(text: string): boolean {
  return /_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i.test(String(text || ''));
}

export function courseAudioAssetUrl(assetId: string): string {
  const query = new URLSearchParams({ key: APP_API_KEY });
  return `${API_BASE_URL}/api/audio/assets-v2/${encodeURIComponent(assetId)}.mp3?${query.toString()}`;
}

export function courseAudioAssetVoice(assetId: string): CourseAudioVoice {
  const normalized = String(assetId || '').trim();
  if (!normalized) {
    throw new Error('Persistent course audio requires an immutable asset ID.');
  }
  return `asset:${normalized}`;
}

export function courseAudioAssetIdFromVoice(voice: CourseAudioVoice): string | null {
  return voice.startsWith('asset:') ? voice.slice('asset:'.length).trim() || null : null;
}
