import { Directory, File, Paths } from 'expo-file-system';

import { courseAudioAssetUrl } from './config';
import type { CourseAudioAsset, Lesson, LessonCard } from './types';

const LESSON_AUDIO_CACHE_DIRECTORY = new Directory(Paths.cache, 'spanglish-course-audio-v2');
const audioDownloadInFlight = new Map<string, Promise<string | null>>();

function audioCacheFile(assetId: string) {
  return new File(LESSON_AUDIO_CACHE_DIRECTORY, `${encodeURIComponent(assetId)}.mp3`);
}

function partialAudioCacheFile(assetId: string) {
  return new File(LESSON_AUDIO_CACHE_DIRECTORY, `${encodeURIComponent(assetId)}.download`);
}

function existingAudioUri(assetId: string): string | null {
  try {
    const file = audioCacheFile(assetId);
    if (file.exists && file.size > 0) return file.uri;
    if (file.exists) file.delete();
  } catch {
    // A cache lookup must never interrupt a lesson.
  }
  return null;
}

export function cachedCourseAudioAssetSource(assetId: string): string | null {
  return existingAudioUri(assetId);
}

export function lessonAudioAssetSource(asset: CourseAudioAsset): string {
  return existingAudioUri(asset.id) ?? courseAudioAssetUrl(asset.id);
}

export function lessonAudioSourceById(assetId: string): string {
  return existingAudioUri(assetId) ?? courseAudioAssetUrl(assetId);
}

export function isLessonCardAudioCached(card: LessonCard): boolean {
  return card.audio_assets.length > 0
    && card.audio_assets.every((asset) => Boolean(existingAudioUri(asset.id)));
}

export async function cacheCourseAudioAsset(asset: CourseAudioAsset): Promise<string | null> {
  const cached = existingAudioUri(asset.id);
  if (cached) return cached;

  const existingDownload = audioDownloadInFlight.get(asset.id);
  if (existingDownload) return existingDownload;

  const download = (async () => {
    const destination = audioCacheFile(asset.id);
    const partialDestination = partialAudioCacheFile(asset.id);
    try {
      LESSON_AUDIO_CACHE_DIRECTORY.create({ idempotent: true, intermediates: true });
      const downloaded = await File.downloadFileAsync(
        courseAudioAssetUrl(asset.id),
        partialDestination,
        { idempotent: true },
      );
      if (!downloaded.exists || downloaded.size <= 0) {
        throw new Error(`Downloaded course audio is empty: ${asset.id}`);
      }
      await downloaded.move(destination, { overwrite: true });
      return destination.exists && destination.size > 0 ? destination.uri : null;
    } catch {
      try {
        if (partialDestination.exists) partialDestination.delete();
      } catch {
        // Android may already have removed the interrupted partial file.
      }
      return null;
    } finally {
      audioDownloadInFlight.delete(asset.id);
    }
  })();

  audioDownloadInFlight.set(asset.id, download);
  return download;
}

export async function cacheLessonAudio(
  lesson: Lesson,
  concurrency = 4,
): Promise<{ cached: number; failed: number; total: number }> {
  const assets = [
    ...new Map(
      lesson.cards.flatMap((card) => card.audio_assets).map((asset) => [asset.id, asset]),
    ).values(),
  ];
  let nextIndex = 0;
  let cached = 0;
  let failed = 0;

  const worker = async () => {
    while (nextIndex < assets.length) {
      const asset = assets[nextIndex];
      nextIndex += 1;
      if (await cacheCourseAudioAsset(asset)) cached += 1;
      else failed += 1;
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), assets.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return { cached, failed, total: assets.length };
}
